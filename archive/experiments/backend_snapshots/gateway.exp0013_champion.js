// EduConnect LMS - Two-Tier Non-Blocking Gateway (EXP-0013)
// Tier 1 (Fast Workers: 8001-8006): Dedicated to /api/rag/search, stats, CRUD. Zero queue wait.
// Tier 2 (Gen Workers: 8007-8008): Dedicated to /api/rag/ask & streaming generation.
// Features: In-Memory Embedding Coordinator (LRU Cache + In-Flight Coalescing + Micro-Batching),
// Dynamic least-load routing, SSE streaming, TTFT tracking, graceful error recovery.

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const { EmbeddingCoordinator } = require('./embedding_coordinator');

const GATEWAY_PORT = process.env.GATEWAY_PORT || 8000;
// EXP-0012: Scaled worker pool (6 Fast Workers + 2 Gen Workers)
const FAST_PORTS = [8001, 8002, 8003, 8004, 8005, 8006];
const GEN_PORTS = [8007, 8008];
const ALL_PORTS = [...FAST_PORTS, ...GEN_PORTS];

// EXP-0013: Centralized In-Memory Embedding Coordinator
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

// Start worker processes
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

// Select best worker based on request category
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

const server = http.createServer((req, res) => {
  const reqStart = Date.now();
  const workerPort = getWorkerForRequest(req.url);
  workerLoad[workerPort] = (workerLoad[workerPort] || 0) + 1;

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const isStream = urlObj.searchParams.get('stream') === 'true' || req.headers['accept'] === 'text/event-stream';
  const isRagRequest = (req.url.includes('/api/rag/search') || req.url.includes('/api/rag/ask')) && req.method === 'POST';

  const bodyChunks = [];
  req.on('data', chunk => bodyChunks.push(chunk));

  req.on('end', async () => {
    let forwardBuffer = Buffer.concat(bodyChunks);
    let embMeta = null;

    if (isRagRequest && forwardBuffer.length > 0) {
      try {
        const parsed = JSON.parse(forwardBuffer.toString('utf8'));
        const queryText = parsed.query || parsed.question;
        if (queryText && typeof queryText === 'string') {
          const coordRes = await embeddingCoordinator.getEmbedding(queryText);
          if (coordRes && coordRes.embedding) {
            parsed.precomputed_embedding = coordRes.embedding;
            embMeta = { source: coordRes.source, latencyMs: coordRes.latencyMs };
            forwardBuffer = Buffer.from(JSON.stringify(parsed));
          }
        }
      } catch (e) {
        // Transparent fallback: proceed with original body
      }
    }

    const proxyHeaders = {
      ...req.headers,
      host: `127.0.0.1:${workerPort}`,
      'content-length': forwardBuffer.length
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
        'X-Gateway-Time-Ms': (Date.now() - reqStart).toString()
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
        res.end();
      });
    });

    proxyReq.on('error', (err) => {
      workerLoad[workerPort] = Math.max(0, (workerLoad[workerPort] || 1) - 1);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: `Gateway worker error: ${err.message}` }));
      }
    });

    proxyReq.write(forwardBuffer);
    proxyReq.end();
  });
});

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
  setTimeout(() => {
    server.listen(GATEWAY_PORT, '127.0.0.1', () => {
      console.log(`[Gateway] Non-blocking two-tier gateway listening on http://127.0.0.1:${GATEWAY_PORT}`);
    });
  }, 1000);
}

module.exports = { server, startWorkers, FAST_PORTS, GEN_PORTS };
