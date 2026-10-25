// EduConnect LMS - Two-Tier Non-Blocking Gateway (EXP-0006)
// Tier 1 (Fast Workers: 8001, 8002): Dedicated to /api/rag/search, stats, CRUD. Zero queue wait.
// Tier 2 (Gen Workers: 8003, 8004): Dedicated to /api/rag/ask & streaming generation.
// Features: Dynamic least-load routing, SSE streaming, TTFT tracking, graceful error recovery.

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const GATEWAY_PORT = process.env.GATEWAY_PORT || 8000;
const FAST_PORTS = [8001, 8002];
const GEN_PORTS = [8003, 8004];
const ALL_PORTS = [...FAST_PORTS, ...GEN_PORTS];

const PHP_DIR = path.resolve(__dirname);
const PHP_EXE = process.env.PHP_EXE || path.join(
  process.env.LOCALAPPDATA || 'C:\\Users\\Mukul\\AppData\\Local',
  'Microsoft\\WinGet\\Packages\\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\\php.exe'
);

const workers = {};
const workerLoad = {};

// Start worker processes
function startWorkers() {
  console.log(`[Gateway] Starting ${ALL_PORTS.length} PHP worker processes (2 Fast, 2 Gen)...`);
  for (const port of ALL_PORTS) {
    workerLoad[port] = 0;
    const proc = spawn(PHP_EXE, ['-S', `127.0.0.1:${port}`, '-t', PHP_DIR], {
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
  const proc = spawn(PHP_EXE, ['-S', `127.0.0.1:${port}`, '-t', PHP_DIR], {
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

const server = http.createServer(async (req, res) => {
  const reqStart = Date.now();
  const workerPort = getWorkerForRequest(req.url);
  workerLoad[workerPort] = (workerLoad[workerPort] || 0) + 1;

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const isStream = urlObj.searchParams.get('stream') === 'true' || req.headers['accept'] === 'text/event-stream';

  const proxyOptions = {
    hostname: '127.0.0.1',
    port: workerPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${workerPort}` }
  };

  const proxyReq = http.request(proxyOptions, (workerRes) => {
    let firstTokenTime = null;

    if (isStream) {
      res.writeHead(workerRes.statusCode, {
        ...workerRes.headers,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
    } else {
      res.writeHead(workerRes.statusCode, workerRes.headers);
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

  req.pipe(proxyReq);
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
