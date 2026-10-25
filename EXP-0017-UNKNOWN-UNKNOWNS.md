# EXP-0017: Unknown Unknowns, Latent Failure Surfaces & Research Horizons

**Experiment ID:** EXP-0017-UNKNOWNS  
**Date:** 2026-09-09  
**Status:** COMPLETE  
**Evaluator:** Antigravity Adversarial Red Team  

---

## 1. Overview

While EXP-0017 exposed 28 concrete vulnerabilities, systematic exploration reveals latent architectural vectors where failures cannot be reliably detected or reproduced with current tooling.

---

## 2. Identified Unknown Unknowns

### 1. Cross-Session Vector Drift under Ollama Quantization Updates
- **Problem**: When the underlying quantized weights of the embedding model change (e.g. Ollama updating `nomic-embed-text` package), embeddings of newly inserted chunks drift away from stored chunk vectors.
- **Latent Risk**: Retrieval recall silently degrades over months without emitting any error or warning.

### 2. SQLite Write Lock Contention under High Gen Worker Concurrency
- **Problem**: Both Gen workers (8007, 8008) and Fast workers write to the same `database/lms.db` file. Under sustained burst loads, SQLite's file-locking mechanism may produce `database is locked` errors that are silently swallowed by `catch (Throwable $e) {}` (W-10).

### 3. V8 Garbage Collection Pauses in Gateway Event Loop
- **Problem**: The `EmbeddingCoordinator` maintains an in-memory LRU cache of 5,000 vectors ($5000 	imes 768 	imes 8	ext{ bytes} approx 30.7	ext{ MB}$). Full GC cycles in Node.js can cause event loop stalls of 50–150 ms, during which in-flight HTTP keep-alive connections experience jitter.

---
**Attestation:** Unknown unknowns and emergent failure surfaces cataloged.
