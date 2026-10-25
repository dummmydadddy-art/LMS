// EXP-0015 Audit Harness Common Utilities
const http = require('http');

const API_BASE = process.env.RAG_API_BASE || 'http://127.0.0.1:8000';
const SERVICE_KEY = process.env.SERVICE_KEY || process.env.LMS_SERVICE_API_KEY || '';

function wilsonScoreInterval(successes, total, confidence = 0.95) {
  if (total === 0) return { p: 0, lower: 0, upper: 0 };
  const p = successes / total;
  const z = 1.95996; // 95% CI
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denom;
  return {
    p: Number(p.toFixed(4)),
    lower: Number(Math.max(0, center - margin).toFixed(4)),
    upper: Number(Math.min(1, center + margin).toFixed(4))
  };
}

function computeStats(arr) {
  if (!arr || arr.length === 0) return { mean: 0, median: 0, p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, stddev: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sorted.length;
  const stddev = Math.sqrt(variance);

  const percentile = (p) => {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
  };

  return {
    mean: Number(mean.toFixed(2)),
    median: percentile(50),
    p50: percentile(50),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stddev: Number(stddev.toFixed(2))
  };
}

async function searchGateway(query, options = {}) {
  const start = Date.now();
  const payload = JSON.stringify({
    query,
    limit: options.limit || 5,
    threshold: options.threshold !== undefined ? options.threshold : 0.20,
    course_id: options.course_id || null
  });

  return new Promise((resolve) => {
    const req = http.request(`${API_BASE}/api/rag/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': SERVICE_KEY,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: options.timeout || 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - start;
        try {
          const parsed = JSON.parse(data);
          resolve({
            success: res.statusCode === 200 && parsed.success !== false,
            statusCode: res.statusCode,
            latency,
            results: parsed.results || [],
            confidence: parsed.confidence || 0,
            abstain: parsed.abstain || false,
            error: parsed.error || null,
            headers: res.headers
          });
        } catch (e) {
          resolve({ success: false, statusCode: res.statusCode, latency, error: `Invalid JSON: ${data.substring(0, 100)}` });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, statusCode: 408, latency: Date.now() - start, error: 'Request Timeout' });
    });

    req.on('error', (err) => {
      resolve({ success: false, statusCode: 500, latency: Date.now() - start, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

async function askGateway(question, options = {}) {
  const start = Date.now();
  const payload = JSON.stringify({
    question,
    session_id: options.session_id || 'audit_sess_' + Math.random().toString(36).substring(2, 7),
    course_id: options.course_id || null,
    history: options.history || []
  });

  return new Promise((resolve) => {
    const req = http.request(`${API_BASE}/api/rag/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': SERVICE_KEY,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: options.timeout || 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - start;
        try {
          const parsed = JSON.parse(data);
          resolve({
            success: res.statusCode === 200 && parsed.success !== false,
            statusCode: res.statusCode,
            latency,
            answer: parsed.answer || '',
            sources: parsed.sources || [],
            abstain: parsed.abstain || false,
            confidence: parsed.confidence || 0,
            refuted: parsed.refuted || false,
            error: parsed.error || null
          });
        } catch (e) {
          resolve({ success: false, statusCode: res.statusCode, latency, error: `Invalid JSON: ${data.substring(0, 100)}` });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, statusCode: 408, latency: Date.now() - start, error: 'Request Timeout' });
    });

    req.on('error', (err) => {
      resolve({ success: false, statusCode: 500, latency: Date.now() - start, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

async function rawRequest(path, method = 'GET', body = null, headers = {}) {
  const start = Date.now();
  const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
  const mergedHeaders = {
    'X-Service-Key': SERVICE_KEY,
    ...headers
  };
  if (payload) {
    mergedHeaders['Content-Length'] = Buffer.byteLength(payload);
    if (!mergedHeaders['Content-Type']) mergedHeaders['Content-Type'] = 'application/json';
  }

  return new Promise((resolve) => {
    const req = http.request(`${API_BASE}${path}`, {
      method,
      headers: mergedHeaders,
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          latency: Date.now() - start
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: 408, latency: Date.now() - start, error: 'Timeout' });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 500, latency: Date.now() - start, error: err.message });
    });

    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = {
  searchGateway,
  askGateway,
  rawRequest,
  wilsonScoreInterval,
  computeStats,
  API_BASE,
  SERVICE_KEY
};
