// EduConnect LMS - In-Memory Embedding Coordinator (EXP-0013)
// Features:
// 1. LRU Deterministic Query Cache (up to 5,000 queries, ~15 MB RAM)
// 2. In-Flight Request Coalescing (zero redundant requests for simultaneous queries)
// 3. Dynamic Micro-Batching (batches 2-8 queries into native Ollama array payload)
// 4. Model Residency Pinning (keep_alive: "24h" in VRAM)

const http = require('http');

class LRUCache {
  constructor(maxSize = 5000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  set(key, val) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, val);
  }

  size() {
    return this.cache.size;
  }
}

class EmbeddingCoordinator {
  constructor(options = {}) {
    this.maxBatchSize = options.maxBatchSize || 8;
    this.batchWindowMs = options.batchWindowMs || 2;
    this.cache = new LRUCache(options.cacheSize || 5000);
    this.inFlight = new Map();
    this.queue = [];
    this.batchTimer = null;
    this.activeBatches = 0;
    this.maxActiveBatches = options.maxActiveBatches || 2;

    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      coalescedHits: 0,
      batchesDispatched: 0,
      totalBatchedQueries: 0,
      totalOllamaTimeMs: 0
    };
  }

  normalize(query) {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  async getEmbedding(query, enableCache = true, enableCoalescing = true, enableBatching = true) {
    this.stats.totalRequests++;
    const key = this.normalize(query);
    if (!key) return null;

    // 1. Check LRU Cache
    if (enableCache) {
      const cached = this.cache.get(key);
      if (cached) {
        this.stats.cacheHits++;
        return { embedding: cached, source: 'CACHE', latencyMs: 0.01 };
      }
    }

    // 2. Check In-Flight Coalescing
    if (enableCoalescing && this.inFlight.has(key)) {
      this.stats.coalescedHits++;
      const emb = await this.inFlight.get(key);
      return { embedding: emb, source: 'COALESCED', latencyMs: 0.1 };
    }

    // 3. Fallback to immediate single request if batching disabled
    if (!enableBatching) {
      const promise = this._fetchSingle(key);
      if (enableCoalescing) this.inFlight.set(key, promise);
      try {
        const emb = await promise;
        if (enableCache) this.cache.set(key, emb);
        return { embedding: emb, source: 'OLLAMA_SINGLE', latencyMs: 0 };
      } finally {
        if (enableCoalescing) this.inFlight.delete(key);
      }
    }

    // 4. Micro-Batch Queue
    const enqueueTime = Date.now();
    const promise = new Promise((resolve, reject) => {
      this.queue.push({ query, key, resolve, reject, enqueueTime });
      this._scheduleBatch();
    });

    if (enableCoalescing) {
      this.inFlight.set(key, promise);
    }

    try {
      const emb = await promise;
      if (enableCache) this.cache.set(key, emb);
      return { embedding: emb, source: 'OLLAMA_BATCH', latencyMs: Date.now() - enqueueTime };
    } finally {
      if (enableCoalescing) {
        this.inFlight.delete(key);
      }
    }
  }

  _scheduleBatch() {
    if (this.queue.length >= this.maxBatchSize && this.activeBatches < this.maxActiveBatches) {
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
      this._dispatchBatch();
      return;
    }

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.batchTimer = null;
        this._dispatchBatch();
      }, this.batchWindowMs);
    }
  }

  async _dispatchBatch() {
    if (this.queue.length === 0) return;
    if (this.activeBatches >= this.maxActiveBatches && this.queue.length < this.maxBatchSize * 2) {
      return;
    }

    const batch = this.queue.splice(0, this.maxBatchSize);
    if (batch.length === 0) return;

    this.activeBatches++;
    this.stats.batchesDispatched++;
    this.stats.totalBatchedQueries += batch.length;

    const inputs = batch.map(b => b.key);
    const t0 = Date.now();

    try {
      const embeddings = await this._callOllamaEmbed(inputs);
      const elapsed = Date.now() - t0;
      this.stats.totalOllamaTimeMs += elapsed;

      for (let i = 0; i < batch.length; i++) {
        const emb = embeddings[i] || null;
        batch[i].resolve(emb);
      }
    } catch (err) {
      for (const item of batch) {
        item.reject(err);
      }
    } finally {
      this.activeBatches--;
      if (this.queue.length > 0) {
        this._scheduleBatch();
      }
    }
  }

  _fetchSingle(key) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        model: 'nomic-embed-text',
        input: key,
        keep_alive: '24h'
      });

      const req = http.request({
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/embed',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve(data.embeddings[0]);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  _callOllamaEmbed(inputs) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        model: 'nomic-embed-text',
        input: inputs.length === 1 ? inputs[0] : inputs,
        keep_alive: '24h'
      });

      const req = http.request({
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/embed',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (data.embeddings && data.embeddings.length > 0) {
              resolve(data.embeddings);
            } else {
              reject(new Error('No embeddings returned from Ollama'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }
}

module.exports = { LRUCache, EmbeddingCoordinator };
