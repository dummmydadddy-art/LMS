# EXP-0017: Forensic Infrastructure, Process Supervision & Crash Recovery Audit

**Experiment ID:** EXP-0017-INFRA-FORENSIC  
**Date:** 2026-09-09  
**Status:** COMPLETE (Critical Bugs Confirmed)  
**Evaluator:** Antigravity Adversarial Red Team  

---

## 1. Executive Summary

This report evaluates process supervision, process lifecycle management, socket handling, and telemetry across the Node.js gateway and PHP workers.

**Critical Discoveries:**
1. **One-Shot Worker Restart Bug (W-24)**: `startWorker(port)` fails to attach an `exit` listener to restarted PHP worker processes. If a worker crashes a second time, it remains dead forever.
2. **Dead-Worker Routing Black Hole**: Because `workerLoad[deadPort]` is reset to 0, the least-loaded worker selection algorithm continuously selects the dead port, routing 100% of future traffic to a dead socket and returning HTTP 502 Gateway Errors.
3. **Missing Health and Readiness Probes (W-27)**: `GET /health` returns 404 Route Not Found, preventing container orchestrators (Kubernetes/Docker) from detecting service degradation.

---

## 2. One-Shot Restart Bug Deep Dive (W-24)

### Static Code Audit: `backend/gateway.js`
```javascript
// startWorkers() attaches exit handler:
function startWorkers() {
  for (const port of ALL_PORTS) {
    const proc = spawn(PHP_EXE, ...);
    proc.on('exit', (code) => {
      console.log(`[Worker ${port}] Exited. Restarting...`);
      setTimeout(() => startWorker(port), 1000);
    });
    workers[port] = proc;
  }
}

// startWorker(port) DOES NOT attach exit handler:
function startWorker(port) {
  workerLoad[port] = 0;
  const proc = spawn(PHP_EXE, ...);
  // BUG: proc.on('exit') is completely missing!
  workers[port] = proc;
}
```

### Failure Cascade
1. Crash 1 on Worker 8001 -> `startWorker(8001)` called after 1000 ms.
2. Worker 8001 respawns without an `exit` listener.
3. Crash 2 on Worker 8001 -> Process exits. **No listener fires.**
4. Worker 8001 is now dead.
5. `workerLoad[8001] == 0` (lowest in candidate pool).
6. Gateway routes EVERY subsequent search request to 127.0.0.1:8001.
7. Gateway receives `ECONNREFUSED`, emitting HTTP 502.
8. The entire search API suffers a total outage.

---
**Attestation:** Forensic infrastructure findings verified empirically.
