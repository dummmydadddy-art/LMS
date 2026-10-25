// EduConnect LMS - Two-Tier Non-Blocking Gateway (EXP-0016 Hardened Candidate)
// Features: In-Memory Embedding Coordinator + Bounded Concurrency Limiter + Backpressure Queue
//           + 1MB Request Body Protection + Startup Cold-Start Warmup + Correlation Tracking

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { EmbeddingCoordinator } = require('./embedding_coordinator');

const GATEWAY_PORT = process.env.GATEWAY_PORT || 8000;
const FAST_PORTS = [8001, 8002, 8003, 8004, 8005, 8006];
const GEN_PORTS = [8007, 8008];
const ALL_PORTS = [...FAST_PORTS, ...GEN_PORTS];

// Embedding Coordinator
const embeddingCoordinator = new EmbeddingCoordinator({
  maxBatchSize: 8,
  batchWindowMs: 2,
  cacheSize: 5000,
  maxActiveBatches: 2
});

const PHP_DIR = path.resolve(__dirname);
const PHP_EXE = process.env.PHP_EXE || path.join(
  process.env.LOCALAPPDATA || 'C:\\Users\\Mukul\\AppData\\Local',
  'Microsoft\\WinGet\\Packages\\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\\php.exe'
);

const workers = {};
const workerLoad = {};

// Group G: Concurrency Control & Backpressure Envelope
const MAX_CONCURRENT_GEN = 64;
const MAX_GEN_QUEUE = 128;
const GEN_QUEUE_TIMEOUT_MS = 10000;
let activeGenRequests = 0;
const genQueue = [];

function isFlagEnabled(name, req) {
  const header = req?.headers?.['x-rag-flags'];
  if (header) {
    const parts = header.split(',');
    for (const p of parts) {
      const [k, v] = p.split('=');
      if (k.trim() === name) {
        return v !== undefined ? v.trim() === 'true' || v.trim() === '1' : true;
      }
    }
  }
  try {
    const flags = JSON.parse(fs.readFileSync(path.join(__dirname, 'rag_flags.json'), 'utf8'));
    return Boolean(flags[name]);
  } catch (e) {
    return false;
  }
}

function processNextQueuedRequest() {
  if (genQueue.length > 0 && activeGenRequests < MAX_CONCURRENT_GEN) {
    const nextReq = genQueue.shift();
    if (nextReq.timeoutHandle) clearTimeout(nextReq.timeoutHandle);
    nextReq.execute();
  }
}

function startWorkers() {
  console.log(`[Gateway] Starting ${ALL_PORTS.length} PHP worker processes (6 Fast, 2 Gen)...`);
  for (const port of ALL_PORTS) {
    workerLoad[port] = 0;
    const proc = spawn(PHP_EXE, ['-S', `127.0.0.1:${port}`, '-t', PHP_DIR, 'index.php'], {
      cwd: PHP_DIR,
      stdio: ['ignore', 'ignore', 'ignore']
    });

    proc.on('exit', (code) => {
      console.log(`[Worker ${port}] Exited with code ${code}. Restarting...`);
      setTimeout(() => startWorker(port), 1000);
    });

    workers[port] = proc;
    const role = FAST_PORTS.includes(port) ? 'FAST (Search/CRUD)' : 'GEN (LLM)';
    console.log(`[Gateway] Worker running on http://127.0.0.1:${port} [${role}]`);
  }
}

function startWorker(port) {
  workerLoad[port] = 0;
  const proc = spawn(PHP_EXE, ['-S', `127.0.0.1:${port}`, '-t', PHP_DIR, 'index.php'], {
    cwd: PHP_DIR,
    stdio: ['ignore', 'ignore', 'ignore']
  });
  workers[port] = proc;
}

function getWorkerForRequest(url) {
  const isGenRequest = url.includes('/api/rag/ask');
  const candidatePool = isGenRequest ? GEN_PORTS : FAST_PORTS;

  let bestPort = candidatePool[0];
  let minLoad = Infinity;
  for (const port of candidatePool) {
    const load = workerLoad[port] || 0;
    if (load < minLoad) {
      minLoad = load;
      bestPort = port;
    }
  }
  return bestPort;
}

// Group H: Cold-Start Warmup Probe
async function runWarmupProbe() {
  try {
    const startW = Date.now();
    console.log('[Gateway] Running cold-start warm-up probe...');
    await embeddingCoordinator.getEmbedding('EduConnect LMS Cold-Start Warmup Probe');
    console.log(`[Gateway] Warm-up probe completed in ${Date.now() - startW} ms. Inference ready.`);
  } catch (err) {
    console.warn('[Gateway] Warm-up probe warning:', err.message);
  }
}

const server = http.createServer((req, res) => {
  const reqStart = Date.now();
  const corrId = req.headers['x-correlation-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const isGenRequest = req.url.includes('/api/rag/ask') && req.method === 'POST';
  const rateLimitActive = isFlagEnabled('ENABLE_RATE_LIMIT', req);

  // Group G: Concurrency Control
  if (isGenRequest && rateLimitActive) {
    if (activeGenRequests >= MAX_CONCURRENT_GEN) {
      if (genQueue.length >= MAX_GEN_QUEUE) {
        res.writeHead(429, {
          'Content-Type': 'application/json',
          'Retry-After': '5',
          'X-Correlation-ID': corrId
        });
        res.end(JSON.stringify({
          success: false,
          error: 'Too Many Requests: Concurrency envelope saturated (64 active, 128 queued). Backpressure triggered.',
          active_requests: activeGenRequests,
          queue_depth: genQueue.length
        }));
        return;
      }

      // Enqueue
      let queuedItem = null;
      queuedItem = {
        execute: () => {
          activeGenRequests++;
          handleRequest(req, res, reqStart, corrId, true);
        },
        timeoutHandle: setTimeout(() => {
          const idx = genQueue.indexOf(queuedItem);
          if (idx !== -1) {
            genQueue.splice(idx, 1);
            if (!res.headersSent) {
              res.writeHead(504, { 'Content-Type': 'application/json', 'X-Correlation-ID': corrId });
              res.end(JSON.stringify({ success: false, error: 'Gateway Timeout: Queue wait exceeded 10s.' }));
            }
          }
        }, GEN_QUEUE_TIMEOUT_MS)
      };
      genQueue.push(queuedItem);
      return;
    }

    activeGenRequests++;
    handleRequest(req, res, reqStart, corrId, true);
  } else {
    handleRequest(req, res, reqStart, corrId, false);
  }
});

function handleRequest(req, res, reqStart, corrId, isTrackedGen) {
  const workerPort = getWorkerForRequest(req.url);
  workerLoad[workerPort] = (workerLoad[workerPort] || 0) + 1;

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const isStream = urlObj.searchParams.get('stream') === 'true' || req.headers['accept'] === 'text/event-stream';
  const isRagRequest = (req.url.includes('/api/rag/search') || req.url.includes('/api/rag/ask')) && req.method === 'POST';

  const MAX_BODY_SIZE = 1048576; // 1 MB limit
  let bodyBytes = 0;
  const bodyChunks = [];
  let isTooLarge = false;

  req.on('data', chunk => {
    bodyBytes += chunk.length;
    if (bodyBytes > MAX_BODY_SIZE) {
      if (!isTooLarge) {
        isTooLarge = true;
        res.writeHead(413, { 'Content-Type': 'application/json', 'X-Correlation-ID': corrId });
        res.end(JSON.stringify({ success: false, error: 'Payload Too Large: Maximum allowed request size is 1MB.' }));
        req.destroy();
      }
      return;
    }
    bodyChunks.push(chunk);
  });

  req.on('end', async () => {
    if (isTooLarge) {
      workerLoad[workerPort] = Math.max(0, (workerLoad[workerPort] || 1) - 1);
      if (isTrackedGen) {
        activeGenRequests = Math.max(0, activeGenRequests - 1);
        processNextQueuedRequest();
      }
      return;
    }

    let forwardBuffer = Buffer.concat(bodyChunks);
    let embMeta = null;

    if (isRagRequest && forwardBuffer.length > 0) {
      try {
        const parsed = JSON.parse(forwardBuffer.toString('utf8'));
        const queryText = parsed.query || parsed.question;
        if (queryText && typeof queryText === 'string' && /[a-zA-Z0-9]/.test(queryText)) {
          const coordRes = await embeddingCoordinator.getEmbedding(queryText);
          if (coordRes && coordRes.embedding) {
            parsed.precomputed_embedding = coordRes.embedding;
            embMeta = { source: coordRes.source, latencyMs: coordRes.latencyMs };
            forwardBuffer = Buffer.from(JSON.stringify(parsed));
          }
        }
      } catch (e) {
        // Transparent fallback
      }
    }

    const proxyHeaders = {
      ...req.headers,
      host: `127.0.0.1:${workerPort}`,
      'content-length': forwardBuffer.length,
      'x-correlation-id': corrId
    };

    const proxyOptions = {
      hostname: '127.0.0.1',
      port: workerPort,
      path: req.url,
      method: req.method,
      headers: proxyHeaders
    };

    const proxyReq = http.request(proxyOptions, (workerRes) => {
      let firstTokenTime = null;

      const resHeaders = {
        ...workerRes.headers,
        'X-Worker-Port': workerPort.toString(),
        'X-Gateway-Time-Ms': (Date.now() - reqStart).toString(),
        'X-Correlation-ID': corrId
      };
      if (embMeta) {
        resHeaders['X-Embedding-Source'] = embMeta.source;
        resHeaders['X-Embedding-Time-Ms'] = embMeta.latencyMs.toFixed(2);
      }

      if (isStream) {
        res.writeHead(workerRes.statusCode, {
          ...resHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        });
      } else {
        res.writeHead(workerRes.statusCode, resHeaders);
      }

      workerRes.on('data', (chunk) => {
        if (!firstTokenTime) {
          firstTokenTime = Date.now() - reqStart;
          if (isStream) {
            res.write(`event: ttft\ndata: ${JSON.stringify({ ttftMs: firstTokenTime })}\n\n`);
          }
        }
        res.write(chunk);
      });

      workerRes.on('end', () => {
        workerLoad[workerPort] = Math.max(0, (workerLoad[workerPort] || 1) - 1);
        if (isTrackedGen) {
          activeGenRequests = Math.max(0, activeGenRequests - 1);
          processNextQueuedRequest();
        }
        res.end();
      });
    });

    proxyReq.on('error', (err) => {
      workerLoad[workerPort] = Math.max(0, (workerLoad[workerPort] || 1) - 1);
      if (isTrackedGen) {
        activeGenRequests = Math.max(0, activeGenRequests - 1);
        processNextQueuedRequest();
      }
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json', 'X-Correlation-ID': corrId });
        res.end(JSON.stringify({ success: false, error: `Gateway worker error: ${err.message}` }));
      }
    });

    proxyReq.write(forwardBuffer);
    proxyReq.end();
  });
}

process.on('SIGINT', () => {
  console.log('\n[Gateway] Shutting down workers...');
  for (const port in workers) {
    try { process.kill(workers[port].pid); } catch (e) {}
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  for (const port in workers) {
    try { process.kill(workers[port].pid); } catch (e) {}
  }
  process.exit(0);
});

if (require.main === module) {
  startWorkers();
  setTimeout(async () => {
    server.listen(GATEWAY_PORT, '127.0.0.1', async () => {
      console.log(`[Gateway] Non-blocking two-tier gateway listening on http://127.0.0.1:${GATEWAY_PORT}`);
      try {
        const flags = JSON.parse(fs.readFileSync(path.join(__dirname, 'rag_flags.json'), 'utf8'));
        if (flags.ENABLE_WARMUP) {
          await runWarmupProbe();
        }
      } catch (e) {}
    });
  }, 1000);
}

module.exports = { server, startWorkers, FAST_PORTS, GEN_PORTS };
