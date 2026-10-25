# EXP-0017: Deep Forensic Corpus Lifecycle & Data Consistency Audit

**Experiment ID:** EXP-0017-CORPUS-FORENSIC  
**Date:** 2026-09-09  
**Status:** COMPLETE (Desynchronization Confirmed)  
**Evaluator:** Antigravity Adversarial Red Team  

---

## 1. Executive Summary

This report investigates corpus ingestion, updates, deletions, and multi-process state synchronization across the 8-worker cluster.

**Critical Finding:**
- **Multi-Worker Prewarmed Cache Desynchronization (W-17)**: Each PHP worker maintains its own static copy of `self::$prewarmedCorpus` in process RAM. When a chunk is created, updated, or deleted via the REST API, the mutation is only routed to 1 worker (e.g. 8001). That worker invalidates its local RAM cache, but **the remaining 7 workers retain the stale chunk in memory indefinitely**, causing stochastic search results where deleted chunks reappear at random.
- **Silent CRUD Error Suppression (W-10)**: In `rag_service.php`, database operations wrap calls in `catch (Throwable $e) {}`, masking network partitions and constraint violations.

---

## 2. In-Memory Corpus Desynchronization Mechanism (W-17)

```php
class RagService {
    private static ?array $prewarmedCorpus = null;

    public function deleteChunk($id) {
        // Deletes from SQLite
        $this->db->execute("DELETE FROM rag_knowledge_chunks WHERE id = ?", [$id]);
        // Invalidates RAM in THIS WORKER ONLY:
        self::$prewarmedCorpus = null;
    }
}
```
1. Client sends `DELETE /api/rag/chunks/42` -> Routed to Worker 8001.
2. Worker 8001 clears `self::$prewarmedCorpus = null`.
3. Workers 8002, 8003, 8004, 8005, 8006, 8007, 8008 still retain Chunk 42 in RAM.
4. Next search query arrives: if routed to Worker 8002, **Chunk 42 is returned as an active search result**!

---
**Attestation:** Forensic corpus lifecycle findings verified.
