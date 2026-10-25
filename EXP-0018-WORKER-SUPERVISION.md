# EXP-0018: AUTHORITATIVE WORKER SUPERVISION & LIFECYCLE REPORT

**Experiment ID:** EXP-0018  
**Subject:** EduConnect LMS Gateway Supervisor (`EXP-0018 Hardened Candidate`)  
**Date:** September 9, 2026  
**Weaknesses Addressed:** W-24 (Dead-Worker Black Hole), W-25 (Counter Leak), W-26 (Worker Starvation), W-27 (Health Telemetry)  
**Status:** VERIFIED RESILIENT  

---

## 1. Problem Definition (W-24)
In EXP-0016, `gateway.js` defined `startWorkers()` with process `exit` listeners for initial worker startup. However, when an individual worker was restarted via `startWorker(port)`, the `proc.on('exit')` listener was **omitted**. If a restarted worker crashed a second time, it was permanently terminated. Because its active load remained 0, the gateway continued routing requests to the dead port, causing a total service black hole with 100% HTTP 502 errors.

## 2. Authoritative Supervisor Design
`backend/gateway.js` was refactored with a single, authoritative `spawnWorker(port)` function:
- **Persistent Listeners**: Attached `proc.on('exit')` and `proc.on('error')` on every spawn and respawn.
- **Consecutive Crash Tracking & Backoff**: Consecutive crashes within 5 seconds increment `consecutiveCrashes`. If crashes exceed 5, exponential backoff is applied up to 5,000ms.
- **Safe Grace Period**: Successful operation for 10 seconds resets `consecutiveCrashes` to 0.
- **Fail-Safe Peer Routing**: `pickWorker(type)` filters exclusively on `w.state === 'HEALTHY'`. Crashed or respawning workers are never assigned traffic.

## 3. Concurrency Counter Cleanup (W-25)
- Idempotent `finalizeRequest(reqCtx)` tracks request resolution state (`finalized: false`).
- Hooked to `res.on('finish')`, `res.on('close')`, `req.on('close')`, and socket errors.
- 20 consecutive oversized (1.2MB) requests tested; active generation counter cleanly returned to 0 with zero slot drift.

## 4. Empirical Multi-Crash Resilience Verification
- **Test Command**: Process kill (`taskkill`) executed on Worker 8001 three consecutive times.
- **Observation**:
  - Crash 1: Worker 8001 exited with code 1. Supervisor auto-respawned worker on port 8001. State returned to `HEALTHY`.
  - Crash 2: Worker 8001 exited with code 1. Supervisor auto-respawned worker on port 8001. State returned to `HEALTHY`.
  - Crash 3: Worker 8001 exited with code 1. Supervisor auto-respawned worker on port 8001. State returned to `HEALTHY` (restarts: 3).
- **Traffic Continuity**: In-flight requests during the crashes were routed to peer workers (8002-8006). Total HTTP 502 errors observed: **0**.
