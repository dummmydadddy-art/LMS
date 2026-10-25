#!/usr/bin/env python3
"""
Deep-dive semantic discrimination & logit margin analysis
Tests 8 curriculum domain queries against carefully calibrated subtle distractors.
"""

import sys
import os
import json
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')
RERANKER_URL = "http://127.0.0.1:8100/rerank"

def query_reranker(query, passages):
    payload = json.dumps({"query": query, "passages": passages}).encode("utf-8")
    req = urllib.request.Request(
        RERANKER_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=5.0) as resp:
        return json.loads(resp.read().decode("utf-8"))

cases = [
    {
        "id": "CSS_GRID_VS_FLEX",
        "query": "When should CSS Grid be used instead of Flexbox for two-dimensional layout?",
        "target": "target_css_grid",
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
        ]
    },
    {
        "id": "SQL_JOINS",
        "query": "What is the key difference between INNER JOIN and LEFT OUTER JOIN in PostgreSQL?",
        "target": "target_joins",
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
        ]
    },
    {
        "id": "JS_CLOSURE_STALE",
        "query": "How do JavaScript closures cause stale state in asynchronous event handlers?",
        "target": "target_stale_closure",
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
        ]
    },
    {
        "id": "GIT_FAST_FORWARD",
        "query": "What causes a Git merge to perform a fast-forward merge rather than creating a merge commit?",
        "target": "target_fast_forward",
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
        ]
    },
    {
        "id": "PYTHON_GENERATOR_VS_LIST",
        "query": "Why do Python generator expressions have lower memory overhead than list comprehensions?",
        "target": "target_generator_memory",
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
        ]
    }
]

print("=========================================================================")
print("Deep-Dive Semantic Discrimination: 5 Additional Technical Domains")
print("=========================================================================")

all_rank1 = True
for c in cases:
    res = query_reranker(c["query"], c["passages"])
    results = res["results"]
    top = results[0]
    rank2 = results[1]

    is_rank1 = (top["id"] == c["target"])
    if not is_rank1:
        all_rank1 = False

    status = "[PASS]" if is_rank1 else "[FAIL]"
    margin = top["score"] - rank2["score"]
    logit_diff = top.get("logit", 0) - rank2.get("logit", 0)

    print(f"\n{status} {c['id']}: '{c['query'][:60]}...'")
    print(f"       Top Rank: {top['id']} (score={top['score']:.4f}, logit={top.get('logit', 0):.2f})")
    print(f"       Rank 2  : {rank2['id']} (score={rank2['score']:.4f}, logit={rank2.get('logit', 0):.2f})")
    print(f"       Margin  : score_delta={margin:.4f}, logit_delta={logit_diff:.2f}")
    for r in results:
        print(f"         - #{r['rank']} {r['id']} => score={r['score']:.4f} (logit={r.get('logit', 0):.2f})")

print("\n=========================================================================")
print(f"Overall Target Ranking Accuracy: {'100% (5/5)' if all_rank1 else 'FAILED'}")
print("=========================================================================")
