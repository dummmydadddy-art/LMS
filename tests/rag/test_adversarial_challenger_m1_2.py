#!/usr/bin/env python3
"""
EduConnect-LMS-Experimental - Adversarial Verification Suite
Challenger M1-2: Semantic Ranking Discrimination, Distractor Rejection, Concurrency & Burst Stress

Empirical verification of:
1. Neural Cross-Encoder microservice at http://127.0.0.1:8100/rerank
2. Hardware constraints (0 MB VRAM, CPU-only execution)
3. Concurrency and burst throughput (sequential & parallel requests)
4. Edge cases & boundary safety (50+ passages, long truncation, malformed schemas)
5. Live PHP RAG pipeline integration (/api/rag/ask)
"""

import sys
import os
import json
import time
import math
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

RERANKER_URL = "http://127.0.0.1:8100/rerank"
HEALTH_URL = "http://127.0.0.1:8100/health"
LMS_ASK_URL = "http://127.0.0.1:8000/api/rag/ask"
SERVICE_KEY = "lms-n8n-service-key-2026"

def http_post_json(url, payload, headers=None, timeout=10.0):
    data = json.dumps(payload).encode("utf-8")
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=data, headers=req_headers, method="POST")
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            body = resp.read().decode("utf-8")
            return {
                "status": resp.status,
                "data": json.loads(body) if body else {},
                "elapsed_ms": elapsed_ms,
                "error": None
            }
    except urllib.error.HTTPError as e:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        err_body = e.read().decode("utf-8") if e.fp else ""
        return {
            "status": e.code,
            "data": None,
            "elapsed_ms": elapsed_ms,
            "error": f"HTTPError {e.code}: {err_body}"
        }
    except Exception as e:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return {
            "status": 0,
            "data": None,
            "elapsed_ms": elapsed_ms,
            "error": str(e)
        }

def http_get_json(url, timeout=5.0):
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            body = resp.read().decode("utf-8")
            return {
                "status": resp.status,
                "data": json.loads(body) if body else {},
                "elapsed_ms": elapsed_ms,
                "error": None
            }
    except Exception as e:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return {"status": 0, "data": None, "elapsed_ms": elapsed_ms, "error": str(e)}

# =========================================================================
# SUITE 1: SEMANTIC RANKING DISCRIMINATION (10 TEST CASES)
# =========================================================================

def run_semantic_discrimination_tests():
    print("\n=======================================================")
    print("SUITE 1: Semantic Ranking Discrimination & Distractors (10 Cases)")
    print("=======================================================")

    test_cases = [
        {
            "name": "Case 1: React useEffect Pitfalls (Dispatch Requirement)",
            "query": "Explain React useEffect dependency array pitfalls",
            "passages": [
                {
                    "id": "target_useeffect",
                    "text": "React useEffect dependency array pitfalls: omitting dependencies causes stale closures, while passing new object or function references every render triggers infinite loops. The cleanup function returned from useEffect runs before the component unmounts and before the next effect execution to prevent memory leaks."
                },
                {
                    "id": "distractor_usestate",
                    "text": "React useState hook manages local component state. Calling the state updater function queues a re-render. Passing a callback to setState ensures you receive the previous state value and prevents stale state issues in asynchronous closures."
                },
                {
                    "id": "distractor_express_middleware",
                    "text": "Express router middleware functions execute in sequential order using next(). Errors are forwarded to errorHandler middleware by calling next(err). Route parameters can be captured using req.params."
                },
                {
                    "id": "distractor_postgres_btree",
                    "text": "PostgreSQL B-Tree indexes provide logarithmic search for equality and range queries on column attributes. The root page directs traversal down to leaf pages containing heap tuple pointers."
                },
                {
                    "id": "distractor_css_flexbox",
                    "text": "CSS flexbox gap property defines gutters between flex items along both the main and cross axes without requiring margin hacks. Flex-direction controls the main axis orientation."
                }
            ],
            "expected_top_id": "target_useeffect",
            "min_score_margin": 0.40  # Must have substantial margin for dispatch case
        },
        {
            "name": "Case 2: Python GIL vs Multiprocessing vs Node.js Event Loop",
            "query": "How does Python GIL affect multi-threading and CPU-bound tasks?",
            "passages": [
                {
                    "id": "target_python_gil",
                    "text": "The Python Global Interpreter Lock (GIL) is a mutex mechanism in CPython that prevents multiple native OS threads from executing Python bytecodes simultaneously. For CPU-bound tasks, multi-threading in CPython results in heavy thread contention and slower execution rather than true parallel execution across multiple CPU cores."
                },
                {
                    "id": "distractor_python_multiprocessing",
                    "text": "The Python multiprocessing module circumvents GIL limitations by spawning separate worker processes, each with its own independent Python interpreter and private memory space. Communication occurs via IPC queues or pipes."
                },
                {
                    "id": "distractor_nodejs_event_loop",
                    "text": "Node.js utilizes a single-threaded event loop driven by libuv for asynchronous non-blocking I/O operations. For heavy CPU-bound computations, worker_threads can be used to run JavaScript in separate threads."
                },
                {
                    "id": "distractor_os_threads",
                    "text": "Operating system thread schedulers allocate CPU time slices to kernel threads using preemptive scheduling algorithms and context switching between thread registers and stack pointers."
                },
                {
                    "id": "distractor_git_branches",
                    "text": "Git branches are lightweight movable pointers to individual commits. Creating a new branch with git branch creates a pointer without changing the working tree until git switch is invoked."
                }
            ],
            "expected_top_id": "target_python_gil",
            "min_score_margin": 0.01
        },
        {
            "name": "Case 3: PostgreSQL B-Tree vs Hash vs GIN for Range Queries",
            "query": "Which PostgreSQL index type supports range queries with inequality operators?",
            "passages": [
                {
                    "id": "target_postgres_btree",
                    "text": "PostgreSQL B-tree indexes natively support comparison operators for range queries (<, <=, =, >=, >) and pattern matching. Hash indexes only support simple equality (=) comparisons and cannot accelerate range scans or ordering."
                },
                {
                    "id": "distractor_postgres_hash",
                    "text": "PostgreSQL hash indexes store 32-bit hash codes and only handle simple equality comparisons using the = operator. They do not support range scans, sorting, or multi-column indexing."
                },
                {
                    "id": "distractor_postgres_gin",
                    "text": "Generalized Inverted Indexes (GIN) in PostgreSQL are designed for composite values where elements need to be searched, such as jsonb structures, full-text search tsvector documents, and array elements."
                },
                {
                    "id": "distractor_js_array_filter",
                    "text": "JavaScript Array.prototype.filter() creates a shallow copy of a portion of an array containing only elements that pass the test implemented by the provided callback predicate function."
                }
            ],
            "expected_top_id": "target_postgres_btree",
            "min_score_margin": 0.001
        },
        {
            "name": "Case 4: Git Rebase vs Merge History Rewriting",
            "query": "What happens to commit history when using git rebase instead of git merge?",
            "passages": [
                {
                    "id": "target_git_rebase",
                    "text": "Git rebase reapplies commits on top of another base tip, rewriting commit SHA-1 hashes to create a clean, linear project history without merge commits. In contrast, git merge preserves the exact chronological history and adds a merge commit with multiple parents."
                },
                {
                    "id": "distractor_git_reset",
                    "text": "Git reset alters the current HEAD and branch pointer. Flags include --soft to preserve staged index, --mixed to reset index but preserve working tree, and --hard to discard all tracked changes."
                },
                {
                    "id": "distractor_git_cherrypick",
                    "text": "Git cherry-pick applies the changes introduced by some existing commits onto the current branch, creating new commits with new commit hashes while leaving original branches unmodified."
                },
                {
                    "id": "distractor_docker_layers",
                    "text": "Docker image layers are read-only filesystem layers stacked on top of each other using an overlayfs storage driver. Each instruction in a Dockerfile generates an immutable layer."
                }
            ],
            "expected_top_id": "target_git_rebase",
            "min_score_margin": 0.35
        },
        {
            "name": "Case 5: Adversarial Rule of Hooks Trap (Top-Level Invariant)",
            "query": "Can you call React Hooks conditionally inside an if statement?",
            "passages": [
                {
                    "id": "target_rules_of_hooks",
                    "text": "React Rules of Hooks strictly mandate: only call Hooks at the top level. Do NOT call Hooks inside loops, conditions, or nested functions. Conditionally calling hooks violates the invariant that React relies on hook call order across renders to preserve state."
                },
                {
                    "id": "adversarial_trap_distractor",
                    "text": "If statement conditions can be placed anywhere in your JavaScript code to conditionally execute expressions, and calling hooks when a condition is met allows dynamic component logic depending on user state."
                },
                {
                    "id": "distractor_css_media_queries",
                    "text": "CSS media queries apply style blocks conditionally depending on viewport width, screen resolution, or device orientation using @media rules."
                }
            ],
            "expected_top_id": "target_rules_of_hooks",
            "min_score_margin": 0.0001
        },
        {
            "name": "Case 6: CSS Grid 2D vs Flexbox 1D Layout",
            "query": "When should CSS Grid be used instead of Flexbox for two-dimensional layout?",
            "passages": [
                {
                    "id": "target_css_grid",
                    "text": "CSS Grid is inherently two-dimensional, designed to manage both rows and columns simultaneously in a structured grid template layout. Flexbox is one-dimensional, designed to distribute space along either a row or a column at a time."
                },
                {
                    "id": "distractor_flexbox",
                    "text": "CSS Flexbox manages layout along a single axis (either row or column) using flex-direction and justify-content. While flex items can wrap, each flex line calculates sizing independently without cross-row alignment."
                },
                {
                    "id": "distractor_css_float",
                    "text": "CSS floats were traditionally used for text wrapping around images. Clearing floats requires clear: both or clearfix utility classes."
                },
                {
                    "id": "distractor_sql_groupby",
                    "text": "SQL GROUP BY clause divides rows returned by a SELECT statement into groups where aggregate functions (COUNT, SUM, AVG) are applied."
                }
            ],
            "expected_top_id": "target_css_grid",
            "min_score_margin": 0.05
        },
        {
            "name": "Case 7: SQL INNER vs LEFT OUTER JOIN",
            "query": "What is the key difference between INNER JOIN and LEFT OUTER JOIN in PostgreSQL?",
            "passages": [
                {
                    "id": "target_joins",
                    "text": "An INNER JOIN returns only rows where the join condition evaluates to true in both tables. A LEFT OUTER JOIN returns all rows from the left table regardless of matching, filling non-matching right table columns with NULL values."
                },
                {
                    "id": "distractor_full_join",
                    "text": "A FULL OUTER JOIN combines the results of both left and right outer joins, returning all rows from both tables and substituting NULLs wherever no match exists."
                },
                {
                    "id": "distractor_cross_join",
                    "text": "A CROSS JOIN produces the Cartesian product of two tables, matching every row of table A with every row of table B without any join condition."
                },
                {
                    "id": "distractor_react_props",
                    "text": "React props are read-only inputs passed from parent components to child components to configure component behavior and rendering."
                }
            ],
            "expected_top_id": "target_joins",
            "min_score_margin": 0.02
        },
        {
            "name": "Case 8: JavaScript Asynchronous Stale Closures",
            "query": "How do JavaScript closures cause stale state in asynchronous event handlers?",
            "passages": [
                {
                    "id": "target_stale_closure",
                    "text": "In JavaScript, a closure captures variables from its lexical environment by reference at definition time. When an asynchronous callback (such as setTimeout or an event listener) executes later, it reads the captured variable value from when the closure was created, leading to stale state if the outer variable has since changed."
                },
                {
                    "id": "distractor_prototypal_inheritance",
                    "text": "JavaScript prototypal inheritance allows objects to inherit properties and methods directly from other objects via the prototype chain using Object.create() or class syntax."
                },
                {
                    "id": "distractor_event_bubbling",
                    "text": "DOM event bubbling causes an event triggered on a child element to propagate upward through its parent ancestors in the DOM tree unless event.stopPropagation() is called."
                },
                {
                    "id": "distractor_git_head",
                    "text": "Git HEAD is a reference pointing to the currently checked-out commit or branch tip in the working repository."
                }
            ],
            "expected_top_id": "target_stale_closure",
            "min_score_margin": 0.50
        },
        {
            "name": "Case 9: Git Fast-Forward vs Three-Way Merge",
            "query": "What causes a Git merge to perform a fast-forward merge rather than creating a merge commit?",
            "passages": [
                {
                    "id": "target_fast_forward",
                    "text": "A fast-forward merge occurs in Git when the target branch tip has not diverged from the source branch tip; every commit on the target branch is a direct linear ancestor. In this case, Git simply moves the branch pointer forward to point to the incoming commit without creating an extra merge commit."
                },
                {
                    "id": "distractor_three_way_merge",
                    "text": "A three-way merge occurs when branches have diverged. Git uses the two branch tips and their common ancestor commit (merge base) to create a new merge commit containing two parent references."
                },
                {
                    "id": "distractor_git_stash",
                    "text": "Git stash temporarily shelves uncommitted changes in the working directory and index, allowing a developer to switch branches cleanly without committing work-in-progress."
                },
                {
                    "id": "distractor_python_decorator",
                    "text": "Python decorators are callable objects that take a function as an argument and return a modified or wrapped function, implementing the decorator pattern with @ syntax."
                }
            ],
            "expected_top_id": "target_fast_forward",
            "min_score_margin": 0.001
        },
        {
            "name": "Case 10: Python Generators vs List Comprehensions Memory",
            "query": "Why do Python generator expressions have lower memory overhead than list comprehensions?",
            "passages": [
                {
                    "id": "target_generator_memory",
                    "text": "Python generator expressions evaluate lazily, yielding values one at a time on demand via the iterator protocol without allocating the entire collection in RAM. In contrast, list comprehensions eagerly construct and store all elements in memory simultaneously."
                },
                {
                    "id": "distractor_python_list_methods",
                    "text": "Python lists are dynamic arrays supporting operations like append(), extend(), and pop(). Appending has amortized O(1) time complexity due to over-allocation of internal buffer capacity."
                },
                {
                    "id": "distractor_python_dict_keys",
                    "text": "Python dictionary keys must be hashable objects implementing __hash__() and __eq__(). Starting in Python 3.7, dictionaries maintain insertion order."
                },
                {
                    "id": "distractor_css_z_index",
                    "text": "CSS z-index controls the vertical stacking order of positioned elements that overlap along the z-axis within a stacking context."
                }
            ],
            "expected_top_id": "target_generator_memory",
            "min_score_margin": 0.50
        }
    ]

    results = []
    all_passed = True

    for case in test_cases:
        res = http_post_json(RERANKER_URL, {
            "query": case["query"],
            "passages": case["passages"]
        })
        if res["status"] != 200:
            print(f"[FAIL] {case['name']}: HTTP status {res['status']} error: {res['error']}")
            all_passed = False
            results.append({"name": case["name"], "passed": False, "error": res["error"]})
            continue

        scored_results = res["data"]["results"]
        top_item = scored_results[0]
        rank2_item = scored_results[1] if len(scored_results) > 1 else None

        top_id = top_item["id"]
        top_score = top_item["score"]
        top_logit = top_item.get("logit", 0.0)
        rank2_score = rank2_item["score"] if rank2_item else 0.0
        rank2_logit = rank2_item.get("logit", 0.0) if rank2_item else 0.0
        margin = top_score - rank2_score
        logit_margin = top_logit - rank2_logit

        top_correct = (top_id == case["expected_top_id"])
        margin_ok = (margin >= case["min_score_margin"]) and (logit_margin > 0.0)
        passed = top_correct and margin_ok

        if not passed:
            all_passed = False

        status_str = "[PASS]" if passed else "[FAIL]"
        print(f"{status_str} {case['name']}")
        print(f"       Top Rank 1: {top_id} (score={top_score:.4f}, logit={top_logit:.2f})")
        if rank2_item:
            print(f"       Rank 2    : {rank2_item['id']} (score={rank2_score:.4f}, logit={rank2_logit:.2f})")
        print(f"       Delta: score_delta={margin:.4f} (min: {case['min_score_margin']}), logit_delta={logit_margin:.2f} | Latency: {res['elapsed_ms']:.1f}ms")

        results.append({
            "name": case["name"],
            "passed": passed,
            "top_id": top_id,
            "top_score": top_score,
            "top_logit": top_logit,
            "rank2_id": rank2_item["id"] if rank2_item else None,
            "rank2_score": rank2_score,
            "rank2_logit": rank2_logit,
            "score_margin": margin,
            "logit_margin": logit_margin,
            "latency_ms": res["elapsed_ms"]
        })

    return {"suite": "Semantic Discrimination", "all_passed": all_passed, "cases": results}

# =========================================================================
# SUITE 2: RAPID SEQUENTIAL BURST STRESS TEST
# =========================================================================

def run_sequential_burst_test(count=20):
    print("\n=======================================================")
    print(f"SUITE 2: Rapid Sequential Burst Stress Test ({count} Requests)")
    print("=======================================================")

    sample_passages = [
        {"id": f"p_{i}", "text": f"This is sample technical passage {i} covering database indexes, SQL transactions, ACID guarantees, WAL logs, and MVCC in PostgreSQL."}
        for i in range(15)
    ]
    query = "Explain PostgreSQL ACID transaction guarantees and WAL durability"

    latencies = []
    server_took_ms = []
    failures = 0

    t_start_burst = time.perf_counter()
    for i in range(count):
        res = http_post_json(RERANKER_URL, {
            "query": query,
            "passages": sample_passages
        }, timeout=5.0)

        if res["status"] == 200 and len(res["data"].get("results", [])) == 15:
            latencies.append(res["elapsed_ms"])
            took = res["data"].get("took_ms", 0.0)
            server_took_ms.append(took)
        else:
            failures += 1
            print(f"[FAIL] Request {i+1} failed: status={res['status']} err={res['error']}")

    total_burst_ms = (time.perf_counter() - t_start_burst) * 1000

    if not latencies:
        print("[FAIL] All sequential requests failed!")
        return {"suite": "Sequential Burst", "all_passed": False}

    latencies.sort()
    server_took_ms.sort()

    def percentile(lst, p):
        k = (len(lst) - 1) * p
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return lst[int(k)]
        d0 = lst[int(f)] * (c - k)
        d1 = lst[int(c)] * (k - f)
        return d0 + d1

    p50 = percentile(latencies, 0.50)
    p90 = percentile(latencies, 0.90)
    p95 = percentile(latencies, 0.95)
    p99 = percentile(latencies, 0.99)
    min_lat = latencies[0]
    max_lat = latencies[-1]
    avg_lat = sum(latencies) / len(latencies)

    srv_p50 = percentile(server_took_ms, 0.50)
    srv_p95 = percentile(server_took_ms, 0.95)

    passed = (failures == 0) and (p50 <= 200.0) and (p95 <= 350.0)
    status_str = "[PASS]" if passed else "[FAIL]"

    print(f"{status_str} Sequential Burst: {count - failures}/{count} succeeded in {total_burst_ms:.1f}ms total")
    print(f"       Round-trip Latency: Min={min_lat:.1f}ms, Avg={avg_lat:.1f}ms, Max={max_lat:.1f}ms")
    print(f"       Percentiles: P50={p50:.1f}ms, P90={p90:.1f}ms, P95={p95:.1f}ms, P99={p99:.1f}ms")
    print(f"       Server Took: P50={srv_p50:.1f}ms, P95={srv_p95:.1f}ms")
    print(f"       Criteria check: Failures==0 ({failures == 0}), P50 <= 200ms ({p50 <= 200.0})")

    return {
        "suite": "Sequential Burst",
        "all_passed": passed,
        "count": count,
        "failures": failures,
        "total_ms": total_burst_ms,
        "p50_ms": p50,
        "p90_ms": p90,
        "p95_ms": p95,
        "p99_ms": p99,
        "min_ms": min_lat,
        "max_ms": max_lat,
        "avg_ms": avg_lat,
        "srv_p50_ms": srv_p50,
        "srv_p95_ms": srv_p95
    }

# =========================================================================
# SUITE 3: CONCURRENT REQUESTS STRESS TEST
# =========================================================================

def run_concurrency_stress_test(concurrency_levels=[5, 10]):
    print("\n=======================================================")
    print("SUITE 3: High-Concurrency Stress Test")
    print("=======================================================")

    overall_passed = True
    level_results = []

    for workers in concurrency_levels:
        print(f"\n--- Testing Concurrency Level: {workers} Parallel Requests ---")

        requests_payload = []
        for w in range(workers):
            query = f"Unique query topic {w}: how does distributed consensus work in cluster node {w}?"
            passages = [
                {"id": f"worker_{w}_doc_{p}", "text": f"Document content for worker {w} item {p}: Paxos, Raft, vector clocks, and consensus protocols in distributed systems."}
                for p in range(10)
            ]
            requests_payload.append({"worker_id": w, "query": query, "passages": passages})

        def worker_fn(item):
            res = http_post_json(RERANKER_URL, {
                "query": item["query"],
                "passages": item["passages"]
            }, timeout=8.0)
            return item["worker_id"], res

        t0_conc = time.perf_counter()
        results = []
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [executor.submit(worker_fn, req) for req in requests_payload]
            for fut in as_completed(futures):
                results.append(fut.result())
        total_conc_ms = (time.perf_counter() - t0_conc) * 1000

        failures = 0
        contamination_errors = 0
        latencies = []

        for wid, res in results:
            if res["status"] != 200:
                failures += 1
                print(f"[FAIL] Worker {wid} failed: status={res['status']} err={res['error']}")
                continue
            latencies.append(res["elapsed_ms"])
            items = res["data"].get("results", [])
            for item in items:
                expected_prefix = f"worker_{wid}_doc_"
                if not str(item["id"]).startswith(expected_prefix):
                    contamination_errors += 1
                    print(f"[FAIL] Contamination detected in worker {wid}: got id {item['id']}")

        latencies.sort()
        avg_lat = sum(latencies) / len(latencies) if latencies else 0
        p50 = latencies[len(latencies)//2] if latencies else 0
        max_lat = max(latencies) if latencies else 0

        passed = (failures == 0) and (contamination_errors == 0) and (max_lat <= 2000.0)
        if not passed:
            overall_passed = False

        status_str = "[PASS]" if passed else "[FAIL]"
        print(f"{status_str} Concurrency {workers}: {workers - failures}/{workers} succeeded in {total_conc_ms:.1f}ms")
        print(f"       Latencies: P50={p50:.1f}ms, Avg={avg_lat:.1f}ms, Max={max_lat:.1f}ms")
        print(f"       Data Contamination: {contamination_errors} errors")

        level_results.append({
            "workers": workers,
            "passed": passed,
            "failures": failures,
            "contamination_errors": contamination_errors,
            "p50_ms": p50,
            "max_ms": max_lat,
            "total_ms": total_conc_ms
        })

    return {"suite": "Concurrency Stress", "all_passed": overall_passed, "levels": level_results}

# =========================================================================
# SUITE 4: EDGE CASES & INPUT BOUNDARY FUZZING
# =========================================================================

def run_edge_cases_and_fuzzing():
    print("\n=======================================================")
    print("SUITE 4: Edge Cases & Input Boundary Fuzzing (11 Cases)")
    print("=======================================================")

    cases = [
        {
            "name": "Empty Passages List",
            "payload": {"query": "test query", "passages": []},
            "expect_status": 200,
            "validate": lambda d: len(d.get("results", [])) == 0
        },
        {
            "name": "Single Passage Scoring",
            "payload": {"query": "what is rust?", "passages": [{"id": 42, "text": "Rust is a systems programming language with memory safety without garbage collection."}]},
            "expect_status": 200,
            "validate": lambda d: len(d.get("results", [])) == 1 and d["results"][0]["id"] == 42 and d["results"][0]["rank"] == 1
        },
        {
            "name": "Alternative Key 'documents' with 'content'",
            "payload": {"query": "test query", "documents": [{"id": "doc1", "content": "Some document text"}]},
            "expect_status": 200,
            "validate": lambda d: len(d.get("results", [])) == 1 and d["results"][0]["id"] == "doc1"
        },
        {
            "name": "Large Batch (50 Passages)",
            "payload": {
                "query": "PostgreSQL indexing and query optimization",
                "passages": [{"id": f"p_{i}", "text": f"Index optimization advice part {i}: B-tree vs hash vs GiST."} for i in range(50)]
            },
            "expect_status": 200,
            "validate": lambda d: len(d.get("results", [])) == 50
        },
        {
            "name": "Long Passage Exceeding 512 Tokens (Truncation Safety)",
            "payload": {
                "query": "React state management",
                "passages": [
                    {
                        "id": "long_text",
                        "text": ("React component rendering lifecycle and hooks state architecture. " * 150)
                    },
                    {
                        "id": "normal_text",
                        "text": "Short React state snippet using useState."
                    }
                ]
            },
            "expect_status": 200,
            "validate": lambda d: len(d.get("results", [])) == 2
        },
        {
            "name": "Empty and Whitespace-only Passage Texts",
            "payload": {
                "query": "Search query",
                "passages": [
                    {"id": "empty_str", "text": ""},
                    {"id": "spaces_only", "text": "    \t\n   "},
                    {"id": "valid_doc", "text": "Valid non-empty document content."}
                ]
            },
            "expect_status": 200,
            "validate": lambda d: len(d.get("results", [])) == 3
        },
        {
            "name": "Empty Query String",
            "payload": {
                "query": "   ",
                "passages": [
                    {"id": "doc1", "text": "Sample text."}
                ]
            },
            "expect_status": 200,
            "validate": lambda d: len(d.get("results", [])) == 1
        },
        {
            "name": "Unicode, Emojis, and Foreign Characters",
            "payload": {
                "query": "日本語のテスト and German Übergrößenträger and emoji 🚀🔥💻",
                "passages": [
                    {"id": "unicode_doc", "text": "機械学習モデルのリランキングテスト。Größenordnung 100% 🎯."},
                    {"id": "ascii_doc", "text": "Regular ASCII text."}
                ]
            },
            "expect_status": 200,
            "validate": lambda d: len(d.get("results", [])) == 2
        },
        {
            "name": "SQL Injection and XSS Payloads",
            "payload": {
                "query": "'; DROP TABLE material_chunks; <script>alert('xss')</script> --",
                "passages": [
                    {"id": "sql_inj", "text": "UNION SELECT username, password FROM users WHERE '1'='1'; <img src=x onerror=alert(1)>"},
                    {"id": "normal", "text": "Normal database textbook section on relational schema design."}
                ]
            },
            "expect_status": 200,
            "validate": lambda d: len(d.get("results", [])) == 2
        },
        {
            "name": "top_n Parameter Truncation",
            "payload": {
                "query": "Database queries",
                "passages": [{"id": f"p_{i}", "text": f"Passage {i}"} for i in range(10)],
                "top_n": 3
            },
            "expect_status": 200,
            "validate": lambda d: len(d.get("results", [])) == 3 and d["results"][0]["rank"] == 1 and d["results"][2]["rank"] == 3
        },
        {
            "name": "Malformed Schema (Missing query field)",
            "payload": {
                "passages": [{"id": 1, "text": "No query provided"}]
            },
            "expect_status": 422,
            "validate": lambda d: True
        }
    ]

    all_passed = True
    results = []

    for c in cases:
        res = http_post_json(RERANKER_URL, c["payload"])
        status_ok = (res["status"] == c["expect_status"])
        data_ok = c["validate"](res["data"]) if status_ok and res["data"] is not None else (status_ok and c["expect_status"] != 200)

        passed = status_ok and data_ok
        if not passed:
            all_passed = False

        status_str = "[PASS]" if passed else "[FAIL]"
        print(f"{status_str} {c['name']}: status={res['status']} (expected {c['expect_status']}) | {res['elapsed_ms']:.1f}ms")

        results.append({
            "name": c["name"],
            "passed": passed,
            "status": res["status"],
            "expected_status": c["expect_status"],
            "elapsed_ms": res["elapsed_ms"]
        })

    return {"suite": "Edge Cases", "all_passed": all_passed, "cases": results}

# =========================================================================
# SUITE 5: PHP RAG PIPELINE & END-TO-END VERIFICATION
# =========================================================================

def run_php_e2e_verification():
    print("\n=======================================================")
    print("SUITE 5: PHP End-to-End Pipeline Verification")
    print("=======================================================")

    test_queries = [
        "Explain the four layers of the CSS Box Model from inside out.",
        "What is the time complexity of searching in a balanced B-tree index in PostgreSQL?",
        "How does Git store commit objects and tree objects internally?"
    ]

    all_passed = True
    results = []

    for q in test_queries:
        res = http_post_json(LMS_ASK_URL, {
            "question": q,
            "student_id": "challenger_m1_2_bot"
        }, headers={"X-Service-Key": SERVICE_KEY}, timeout=30.0)

        if res["status"] != 200:
            print(f"[FAIL] Query '{q[:40]}...': HTTP {res['status']}, err={res['error']}")
            all_passed = False
            results.append({"query": q, "passed": False, "status": res["status"], "error": res["error"]})
            continue

        data = res["data"]
        answer = data.get("answer", "")
        success = data.get("success", False)
        sources = data.get("sources", [])

        has_answer = len(answer) > 50
        passed = success and has_answer
        if not passed:
            all_passed = False

        status_str = "[PASS]" if passed else "[FAIL]"
        print(f"{status_str} '{q[:45]}...'")
        print(f"       Status: 200 | Latency: {res['elapsed_ms']:.1f}ms | Answer Length: {len(answer)} chars | Sources: {len(sources)}")

        results.append({
            "query": q,
            "passed": passed,
            "status": res["status"],
            "latency_ms": res["elapsed_ms"],
            "answer_len": len(answer),
            "sources_count": len(sources)
        })

    return {"suite": "PHP End-to-End", "all_passed": all_passed, "cases": results}

# =========================================================================
# SUITE 6: VRAM & RESOURCE USAGE AUDIT
# =========================================================================

def run_resource_audit():
    print("\n=======================================================")
    print("SUITE 6: Hardware & Resource Verification (VRAM Constraint)")
    print("=======================================================")

    res = http_get_json(HEALTH_URL)
    if res["status"] != 200:
        print(f"[FAIL] Health check failed: {res['error']}")
        return {"suite": "Resource Audit", "all_passed": False, "error": res["error"]}

    data = res["data"]
    device = data.get("device", "")
    vram_mb = data.get("vram_mb", -1)
    loaded = data.get("loaded", False)

    is_cpu = (device.lower() == "cpu")
    is_zero_vram = (vram_mb == 0.0)
    passed = is_cpu and is_zero_vram and loaded

    status_str = "[PASS]" if passed else "[FAIL]"
    print(f"{status_str} Reranker Device: {device} (expected: cpu)")
    print(f"       VRAM allocated: {vram_mb} MB (expected: 0.0 MB)")
    print(f"       Model loaded: {loaded}")

    return {
        "suite": "Resource Audit",
        "all_passed": passed,
        "device": device,
        "vram_mb": vram_mb,
        "loaded": loaded
    }

# =========================================================================
# MAIN ORCHESTRATION
# =========================================================================

def main():
    print("=========================================================================")
    print("  Challenger M1-2: Comprehensive Adversarial Stress Test Suite")
    print(f"  Target: {RERANKER_URL}")
    print(f"  Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=========================================================================")

    # 1. Resource Audit
    r_audit = run_resource_audit()

    # 2. Semantic Ranking Discrimination
    r_semantic = run_semantic_discrimination_tests()

    # 3. Rapid Sequential Burst Stress Test (20 requests)
    r_burst = run_sequential_burst_test(count=20)

    # 4. Concurrency Stress Test (5 & 10 parallel requests)
    r_concurrency = run_concurrency_stress_test(concurrency_levels=[5, 10])

    # 5. Edge Cases & Fuzzing
    r_edge = run_edge_cases_and_fuzzing()

    # 6. PHP RAG End-to-End
    r_e2e = run_php_e2e_verification()

    print("\n=========================================================================")
    print("                      CHALLENGE SUITE SUMMARY")
    print("=========================================================================")
    suites = [r_audit, r_semantic, r_burst, r_concurrency, r_edge, r_e2e]
    all_ok = True
    for s in suites:
        status_str = "[PASS]" if s.get("all_passed") else "[FAIL]"
        if not s.get("all_passed"):
            all_ok = False
        print(f"  {status_str}  {s.get('suite')}")

    print("=========================================================================")
    verdict = "APPROVE" if all_ok else "REQUEST_CHANGES"
    print(f"  EMPIRICAL CHALLENGER VERDICT: {verdict}")
    print("=========================================================================\n")

    summary_output = {
        "verdict": verdict,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "all_ok": all_ok,
        "suites": suites
    }

    output_path = os.path.join(os.path.dirname(__file__), "adversarial_m1_2_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(summary_output, f, indent=2)
    print(f"Detailed results saved to: {output_path}")

    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
