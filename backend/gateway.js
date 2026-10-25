// EduConnect LMS - Hardened High-Reliability Two-Tier Gateway (EXP-0018)
// Remediates: W-24 (Authoritative Supervisor & Crash Recovery)
//             W-25 (Idempotent Request Finalization & Counter Leak Defense)
//             W-26 (Healthy-Aware Least-Loaded + Fair Tie-Breaking Load Balancer)
//             W-18 (Graceful Socket Drain on 1MB Payload Cutoff)
//             W-27 (Health & Readiness Telemetry Probes)
//             W-01 (Cold-Start Startup Warmup & Readiness Verification)

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { EmbeddingCoordinator } = require('./embedding_coordinator');

// P0-4: Ensure authoritative gateway trust token exists for worker verification
if (!process.env.LMS_GATEWAY_TRUST_TOKEN) {
  process.env.LMS_GATEWAY_TRUST_TOKEN = crypto.randomBytes(32).toString('hex');
}

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

// Worker Registry & Lifecycle States: 'STARTING' | 'HEALTHY' | 'UNHEALTHY' | 'CRASHED' | 'RESTARTING' | 'DISABLED'
const workerRegistry = {};
for (const port of ALL_PORTS) {
  workerRegistry[port] = {
    port,
    role: FAST_PORTS.includes(port) ? 'FAST' : 'GEN',
    process: null,
    state: 'DISABLED',
    load: 0,
    restartCount: 0,
    consecutiveCrashes: 0,
    lastCrashTime: 0,
    lastStartTime: 0,
    recoveryTimer: null,
    stabilizeTimer: null
  };
}

const lastTieBreakIndex = { fast: 0, gen: 0 };

// Group G: Concurrency Control & Backpressure Envelope
const MAX_CONCURRENT_GEN = 64;
const MAX_GEN_QUEUE = 128;
const GEN_QUEUE_TIMEOUT_MS = 10000;
let activeGenRequests = 0;
const genQueue = [];

function isFlagEnabled(name, req) {
  // P0 Security Lockdown (EXP-0024):
  // External clients cannot override flags via x-rag-flags without authoritative service key.
  const configuredServiceKey = process.env.LMS_SERVICE_API_KEY || '';
  const serviceKey = req?.headers?.['x-service-key'];
  const isAuthorized = (configuredServiceKey && serviceKey === configuredServiceKey);

  if (isAuthorized) {
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
  }

  // Authoritative server-side configuration
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

// -----------------------------------------------------------------------------
// W-24: Authoritative Worker Supervisor (Single Lifecycle Path)
// -----------------------------------------------------------------------------
function spawnWorker(port) {
  const worker = workerRegistry[port];
  if (!worker) return;

  if (worker.recoveryTimer) {
    clearTimeout(worker.recoveryTimer);
    worker.recoveryTimer = null;
  }
  if (worker.stabilizeTimer) {
    clearTimeout(worker.stabilizeTimer);
    worker.stabilizeTimer = null;
  }

  worker.state = 'STARTING';
  worker.load = 0;
  worker.lastStartTime = Date.now();

  try {
    const proc = spawn(PHP_EXE, ['-S', `127.0.0.1:${port}`, '-t', PHP_DIR, 'index.php'], {
      cwd: PHP_DIR,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    worker.process = proc;

    // P1-12: Bounded stderr capture for crash diagnostics (last 20 lines)
    const stderrRing = [];
    const STDERR_MAX_LINES = 20;
    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        stderrRing.push(line);
        if (stderrRing.length > STDERR_MAX_LINES) stderrRing.shift();
      }
    });
    proc.stdout.on('data', () => {}); // drain stdout to prevent buffer fill
    worker.stderrRing = stderrRing;

    // Single authoritative exit handler attached to EVERY spawned process
    proc.on('exit', (code, signal) => {
      handleWorkerExit(port, code, signal);
    });

    proc.on('error', (err) => {
      console.error(`[Worker ${port}] Process spawn error:`, err.message);
      handleWorkerExit(port, -1, 'SPAWN_ERROR');
    });

    // Mark healthy after initial socket bind delay
    setTimeout(() => {
      if (worker.process === proc && worker.state === 'STARTING') {
        worker.state = 'HEALTHY';
      }
    }, 250);

    // Reset crash counters if worker survives stably for 30 seconds
    worker.stabilizeTimer = setTimeout(() => {
      if (worker.process === proc && worker.state === 'HEALTHY') {
        worker.consecutiveCrashes = 0;
      }
    }, 30000);

  } catch (err) {
    console.error(`[Worker ${port}] Fatal spawn exception:`, err.message);
    worker.state = 'UNHEALTHY';
  }
}

function handleWorkerExit(port, code, signal) {
  const worker = workerRegistry[port];
  if (!worker) return;

  worker.process = null;
  worker.load = 0;
  worker.lastCrashTime = Date.now();
  worker.restartCount++;
  worker.consecutiveCrashes++;

  // Circuit breaker: prevent restart storms if crashing continuously (> 10 times in quick succession)
  if (worker.consecutiveCrashes > 10) {
    worker.state = 'DISABLED';
    console.error(`[Worker ${port}] EXCEEDED MAX CONSECUTIVE CRASHES (10). Process marked DISABLED.`);
    return;
  }

  worker.state = 'RESTARTING';
  // Exponential backoff: 250ms, 500ms, 1000ms, up to 8000ms
  const backoffMs = Math.min(8000, 250 * Math.pow(2, Math.max(0, worker.consecutiveCrashes - 1)));
  console.log(`[Worker ${port}] Exited (code=${code}, signal=${signal}). Restarting in ${backoffMs}ms (attempt ${worker.restartCount})...`);
  // P1-12: Log last stderr lines for crash diagnosis
  if (worker.stderrRing && worker.stderrRing.length > 0) {
    console.error(`[Worker ${port}] Last stderr:\n  ${worker.stderrRing.join('\n  ')}`);
  }

  worker.recoveryTimer = setTimeout(() => {
    spawnWorker(port);
  }, backoffMs);
}

function startWorkers() {
  console.log(`[Gateway] Starting ${ALL_PORTS.length} PHP worker processes via authoritative supervisor...`);
  for (const port of ALL_PORTS) {
    spawnWorker(port);
    const role = FAST_PORTS.includes(port) ? 'FAST (Search/CRUD)' : 'GEN (LLM)';
    console.log(`[Gateway] Supervisor initialized worker on http://127.0.0.1:${port} [${role}]`);
  }
}

// -----------------------------------------------------------------------------
// W-26: Healthy-Aware Least-Loaded + Fair Tie-Breaking Load Balancer
// -----------------------------------------------------------------------------
function getWorkerForRequest(url) {
  const isGenRequest = url.includes('/api/rag/ask');
  const candidatePorts = isGenRequest ? GEN_PORTS : FAST_PORTS;
  const poolKey = isGenRequest ? 'gen' : 'fast';

  // Strictly filter to HEALTHY workers with active, unkilled processes
  const eligible = candidatePorts
    .map(p => workerRegistry[p])
    .filter(w => w && w.state === 'HEALTHY' && w.process && !w.process.killed);

  if (eligible.length === 0) {
    // Fallback: any STARTING worker if cluster is warming up
    const starting = candidatePorts
      .map(p => workerRegistry[p])
      .filter(w => w && (w.state === 'STARTING' || w.state === 'HEALTHY') && w.process && !w.process.killed);
    if (starting.length > 0) return starting[0].port;
    return null; // All workers dead/disabled
  }

  // Find lowest active load among eligible workers
  let minLoad = Infinity;
  for (const w of eligible) {
    if (w.load < minLoad) {
      minLoad = w.load;
    }
  }

  // Find all workers tied for minimum load
  const tiedWorkers = eligible.filter(w => w.load === minLoad);

  // Fair tie-breaking rotation to prevent Port 8001 starvation under sequential requests
  const nextIdx = (lastTieBreakIndex[poolKey] + 1) % tiedWorkers.length;
  lastTieBreakIndex[poolKey] = nextIdx;
  return tiedWorkers[nextIdx].port;
}

// -----------------------------------------------------------------------------
// W-25: Idempotent Request Finalization Lifecycle
// -----------------------------------------------------------------------------
function finalizeRequest(reqCtx) {
  if (!reqCtx || reqCtx.finalized) return;
  reqCtx.finalized = true;

  if (reqCtx.workerPort && workerRegistry[reqCtx.workerPort]) {
    workerRegistry[reqCtx.workerPort].load = Math.max(0, (workerRegistry[reqCtx.workerPort].load || 1) - 1);
  }

  if (reqCtx.isTrackedGen) {
    activeGenRequests = Math.max(0, activeGenRequests - 1);
    processNextQueuedRequest();
  }
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

// -----------------------------------------------------------------------------
// HTTP Gateway Server & Router
// -----------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const reqStart = Date.now();
  const corrId = req.headers['x-correlation-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // W-27: Health & Readiness Endpoints
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/ready')) {
    const isReady = req.url === '/ready';
    const healthyWorkers = ALL_PORTS.filter(p => workerRegistry[p]?.state === 'HEALTHY');
    const allHealthy = healthyWorkers.length === ALL_PORTS.length;
    const ok = isReady ? allHealthy : (healthyWorkers.length > 0);

    res.writeHead(ok ? 200 : 503, {
      'Content-Type': 'application/json',
      'X-Correlation-ID': corrId
    });
    res.end(JSON.stringify({
      success: ok,
      status: allHealthy ? 'HEALTHY' : (healthyWorkers.length > 0 ? 'DEGRADED' : 'DOWN'),
      gateway: 'online',
      active_gen_requests: activeGenRequests,
      queue_depth: genQueue.length,
      workers: ALL_PORTS.map(p => ({
        port: p,
        role: workerRegistry[p]?.role,
        state: workerRegistry[p]?.state,
        load: workerRegistry[p]?.load,
        restarts: workerRegistry[p]?.restartCount
      }))
    }));
    return;
  }

  const isGenRequest = req.url.includes('/api/rag/ask') && req.method === 'POST';
  const rateLimitActive = isFlagEnabled('ENABLE_RATE_LIMIT', req);

  // Group G: Concurrency Control Envelope
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
  const reqCtx = {
    id: corrId,
    workerPort: null,
    isTrackedGen,
    finalized: false,
    startTime: reqStart
  };

  // Safe termination listeners on client connection
  res.on('finish', () => finalizeRequest(reqCtx));
  res.on('close', () => finalizeRequest(reqCtx));
  req.on('close', () => finalizeRequest(reqCtx));
  req.on('error', () => finalizeRequest(reqCtx));

  const targetPort = getWorkerForRequest(req.url);
  if (!targetPort) {
    finalizeRequest(reqCtx);
    res.writeHead(503, { 'Content-Type': 'application/json', 'X-Correlation-ID': corrId });
    res.end(JSON.stringify({ success: false, error: 'Service Unavailable: No healthy backend worker processes available.' }));
    return;
  }

  reqCtx.workerPort = targetPort;
  workerRegistry[targetPort].load = (workerRegistry[targetPort].load || 0) + 1;

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const isStream = urlObj.searchParams.get('stream') === 'true' || req.headers['accept'] === 'text/event-stream';
  const isRagRequest = (req.url.includes('/api/rag/search') || req.url.includes('/api/rag/ask')) && req.method === 'POST';

  // W-02 & W-18: Request Body Protection & Graceful Drain
  const MAX_BODY_SIZE = 1048576; // 1 MB limit
  let bodyBytes = 0;
  const bodyChunks = [];
  let isTooLarge = false;

  req.on('data', chunk => {
    bodyBytes += chunk.length;
    if (bodyBytes > MAX_BODY_SIZE) {
      if (!isTooLarge) {
        isTooLarge = true;
        res.writeHead(413, { 'Content-Type': 'application/json', 'X-Correlation-ID': corrId, 'Connection': 'close' });
        res.end(JSON.stringify({ success: false, error: 'Payload Too Large: Maximum allowed request size is 1MB.' }));
        finalizeRequest(reqCtx);
        // W-18: Graceful socket drain to prevent TCP RST / ECONNRESET on client
        req.on('data', () => {});
        req.resume();
      }
      return;
    }
    bodyChunks.push(chunk);
  });

  req.on('end', async () => {
    if (isTooLarge) {
      return;
    }

    let forwardBuffer = Buffer.concat(bodyChunks);
    let embMeta = null;

    // W-16: Unified Pre-Embedding Optimization
    if (isRagRequest && forwardBuffer.length > 0) {
      try {
        const parsed = JSON.parse(forwardBuffer.toString('utf8'));
        const queryText = parsed.query || parsed.question;
        // Only pre-compute embedding if the query is non-conversational (or history is empty)
        // This ensures the coordinator does not waste inference on raw pronouns that PHP will condense
        const hasHistory = Array.isArray(parsed.conversation_history) && parsed.conversation_history.length > 0;
        if (queryText && typeof queryText === 'string' && /[a-zA-Z0-9]/.test(queryText) && !hasHistory) {
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
      host: `127.0.0.1:${targetPort}`,
      'content-length': forwardBuffer.length,
      'x-correlation-id': corrId
    };

    // P0 Security Lockdown (EXP-0024): Strip unauthenticated X-RAG-FLAGS from proxied request
    const configuredKey = process.env.LMS_SERVICE_API_KEY || '';
    if (proxyHeaders['x-rag-flags'] && (!configuredKey || proxyHeaders['x-service-key'] !== configuredKey)) {
      const strippedHeader = proxyHeaders['x-rag-flags'];
      delete proxyHeaders['x-rag-flags'];
      const secEvent = {
        timestamp: new Date().toISOString(),
        type: 'GATEWAY_UNAUTHORIZED_FLAG_STRIPPED',
        details: {
          stripped_header: strippedHeader,
          reason: 'Untrusted client attempted to supply X-RAG-FLAGS without authoritative X-Service-Key'
        },
        client_ip: req.socket?.remoteAddress || '127.0.0.1'
      };
      try {
        fs.appendFileSync(path.join(PHP_DIR, 'security_events.log'), JSON.stringify(secEvent) + '\n');
      } catch (e) {}
    }

    // P0-4: Strip client-supplied x-gateway-trust so external callers cannot forge gateway trust
    delete proxyHeaders['x-gateway-trust'];
    const gatewayTrustToken = process.env.LMS_GATEWAY_TRUST_TOKEN || '';
    if (gatewayTrustToken) {
      proxyHeaders['x-gateway-trust'] = gatewayTrustToken;
    }

    const proxyOptions = {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: proxyHeaders
    };

    const proxyReq = http.request(proxyOptions, (workerRes) => {
      let firstTokenTime = null;

      const resHeaders = {
        ...workerRes.headers,
        'X-Worker-Port': targetPort.toString(),
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
        finalizeRequest(reqCtx);
        res.end();
      });

      workerRes.on('error', (err) => {
        finalizeRequest(reqCtx);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json', 'X-Correlation-ID': corrId });
          res.end(JSON.stringify({ success: false, error: `Worker stream error: ${err.message}` }));
        }
      });
    });

    proxyReq.on('error', (err) => {
      finalizeRequest(reqCtx);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json', 'X-Correlation-ID': corrId });
        res.end(JSON.stringify({ success: false, error: `Gateway worker proxy error: ${err.message}` }));
      }
    });

    proxyReq.write(forwardBuffer);
    proxyReq.end();
  });
}

// Clean termination handlers
process.on('SIGINT', () => {
  console.log('\n[Gateway] Shutting down worker supervisor cluster...');
  for (const port in workerRegistry) {
    const w = workerRegistry[port];
    if (w.recoveryTimer) clearTimeout(w.recoveryTimer);
    if (w.stabilizeTimer) clearTimeout(w.stabilizeTimer);
    if (w.process) {
      try { process.kill(w.process.pid); } catch (e) {}
    }
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  for (const port in workerRegistry) {
    const w = workerRegistry[port];
    if (w.recoveryTimer) clearTimeout(w.recoveryTimer);
    if (w.stabilizeTimer) clearTimeout(w.stabilizeTimer);
    if (w.process) {
      try { process.kill(w.process.pid); } catch (e) {}
    }
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

module.exports = { server, startWorkers, FAST_PORTS, GEN_PORTS, workerRegistry, getWorkerForRequest, finalizeRequest };
