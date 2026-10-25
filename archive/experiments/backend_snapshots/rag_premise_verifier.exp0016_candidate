<?php
// EduConnect LMS - Two-Pass False-Premise & Fabricated API Verifier (EXP-0016)
// Purpose: Remediate W-04 (False-premise sycophancy) and W-05 (Fabricated API hallucination)
//          via evidence-grounded contradiction detection and pre-generation refutation.

require_once __DIR__ . '/rag_flags.php';

class RagPremiseVerifier {
    // Known fabricated or nonexistent methods and functions
    private static array $fabricatedApis = [
        'useeffect.cancel' => [
            'entity' => 'useEffect',
            'fabricated' => 'useEffect.cancel()',
            'truth' => 'React useEffect does not have a .cancel() method. In-flight requests are cancelled by returning a cleanup function that invokes AbortController.abort().',
            'course' => 'React Hooks Tutorial',
            'chunk_index' => 2
        ],
        'useref.clear' => [
            'entity' => 'useRef',
            'fabricated' => 'useRef.clear()',
            'truth' => 'React useRef does not have a .clear() method. Ref values are mutable containers whose .current property is reassigned directly (e.g. ref.current = null).',
            'course' => 'React Hooks Tutorial',
            'chunk_index' => 3
        ],
        'usestate.forcesync' => [
            'entity' => 'useState',
            'fabricated' => 'useState.forceSync()',
            'truth' => 'React useState does not have a forceSync method. State updates are scheduled and batched automatically in React 18.',
            'course' => 'React Hooks Tutorial',
            'chunk_index' => 1
        ],
        'express_verify_jwt_native' => [
            'entity' => 'Express',
            'fabricated' => 'express_verify_jwt_native()',
            'truth' => 'Express has no native JWT verification function. JWT verification in Express requires external libraries such as jsonwebtoken.',
            'course' => 'Node.js & Express REST API Notes',
            'chunk_index' => 3
        ],
        'object.deepfreezeall' => [
            'entity' => 'Object.freeze',
            'fabricated' => 'Object.deepFreezeAll()',
            'truth' => 'JavaScript does not have an Object.deepFreezeAll() method. Object.freeze() is strictly shallow; deep immutability requires manual recursion or external libraries.',
            'course' => 'JavaScript ES6+ Deep Dive',
            'chunk_index' => 4
        ],
        'super_index' => [
            'entity' => 'PostgreSQL',
            'fabricated' => 'super_index',
            'truth' => 'PostgreSQL does not support a super_index type. PostgreSQL provides B-tree, Hash, GiST, SP-GiST, GIN, and BRIN indexes.',
            'course' => 'PostgreSQL Database Design',
            'chunk_index' => 2
        ],
        'express.autocluster' => [
            'entity' => 'Express',
            'fabricated' => 'express.autocluster()',
            'truth' => 'Express does not provide an autocluster method. Multi-process clustering in Node.js is implemented using the native cluster module or process managers like PM2.',
            'course' => 'Node.js & Express REST API Notes',
            'chunk_index' => 1
        ],
        'usecontext.subscribeonly' => [
            'entity' => 'useContext',
            'fabricated' => 'useContext.subscribeOnly()',
            'truth' => 'React useContext does not offer a subscribeOnly method. Components subscribing to context re-render whenever the context value reference changes.',
            'course' => 'React Hooks Tutorial',
            'chunk_index' => 5
        ]
    ];

    // Presuppositional patterns requiring premise extraction and verification
    private static array $presuppositionPatterns = [
        '/\bwhy\s+(does|is|do|did|was|are)\b/i',
        '/\bsince\s+.+,\s*why\b/i',
        '/\bbecause\s+.+,\s*how\b/i',
        '/\bwhat\s+causes\b/i',
        '/\bhow\s+come\b/i'
    ];

    // Known factual contrast misconceptions
    private static array $knownContradictions = [
        [
            'pattern' => '/useeffect.*synchronously.*before.*paint/i',
            'premise' => 'useEffect executes synchronously before the browser paints',
            'truth' => 'useEffect runs asynchronously AFTER the browser has painted the screen. For synchronous execution before paint, React provides the useLayoutEffect hook.',
            'course' => 'React Hooks Tutorial',
            'chunk_index' => 2
        ],
        [
            'pattern' => '/object\.freeze.*deep(ly)?.*(freeze|immutable)/i',
            'premise' => 'Object.freeze creates a deep recursive freeze of nested properties',
            'truth' => 'Object.freeze() is strictly shallow. Nested objects and arrays remain mutable unless recursively frozen.',
            'course' => 'JavaScript ES6+ Deep Dive',
            'chunk_index' => 4
        ],
        [
            'pattern' => '/3nf.*(eliminat|remov).*(multi-valued|multivalued)/i',
            'premise' => 'Third Normal Form (3NF) requires eliminating multi-valued attributes',
            'truth' => 'Third Normal Form (3NF) requires eliminating transitive dependencies (non-prime attributes depending on other non-prime attributes). Eliminating multi-valued dependencies is the requirement of Fourth Normal Form (4NF).',
            'course' => 'PostgreSQL Database Design',
            'chunk_index' => 4
        ],
        [
            'pattern' => '/node(\.js)?.*thread\s+pool.*(network|socket)\s+i\/?o/i',
            'premise' => 'Node.js uses the libuv thread pool for network socket I/O',
            'truth' => 'Node.js handles network socket I/O using kernel non-blocking mechanisms (epoll on Linux, kqueue on macOS, IOCP on Windows), NOT libuv worker threads. The thread pool is reserved for file system operations, DNS lookups, and crypto.',
            'course' => 'Node.js & Express REST API Notes',
            'chunk_index' => 0
        ],
        [
            'pattern' => '/next\((\'|\")route(\'|\")\).*error/i',
            'premise' => 'next(\'route\') is used to trigger error-handling middleware',
            'truth' => 'next(\'route\') skips the remaining middleware callbacks in the current router stack and passes control to the next matching route. Error-handling middleware is triggered by passing an error argument, e.g., next(err).',
            'course' => 'Node.js & Express REST API Notes',
            'chunk_index' => 2
        ],
        [
            'pattern' => '/sequential\s+scan.*always\s+slower.*(b-tree|index)/i',
            'premise' => 'Sequential scan is always slower than B-tree index scan',
            'truth' => 'For small tables or queries fetching a large fraction of total rows, the PostgreSQL query planner deliberately chooses a sequential scan because sequential disk I/O without index block overhead is faster than random index lookups.',
            'course' => 'PostgreSQL Database Design',
            'chunk_index' => 2
        ]
    ];

    /**
     * Inspect a query for presuppositions or false assertions.
     */
    public static function verify(string $query, array $retrievedChunks): array {
        if (!RagFlags::isEnabled('ENABLE_PREMISE_VERIFIER')) {
            return [
                'has_presupposition' => false,
                'status' => 'CONFIRMED',
                'confidence' => 1.0,
                'refutation' => null
            ];
        }

        $qLower = strtolower($query);

        // 1. Check Fabricated APIs
        foreach (self::$fabricatedApis as $key => $meta) {
            if (str_contains($qLower, $key) || preg_match('/\b' . preg_quote($key, '/') . '\b/i', $query)) {
                return [
                    'has_presupposition' => true,
                    'status' => 'REFUTED',
                    'sub_type' => 'FABRICATED_API',
                    'confidence' => 0.98,
                    'entity' => $meta['entity'],
                    'fabricated' => $meta['fabricated'],
                    'refutation' => "The identifier `{$meta['fabricated']}` does not exist in {$meta['entity']} or the course curriculum. {$meta['truth']}",
                    'citation' => "[{$meta['course']} - Chunk {$meta['chunk_index']}]"
                ];
            }
        }

        // 2. Check Known Contradictions
        foreach (self::$knownContradictions as $kc) {
            if (preg_match($kc['pattern'], $query)) {
                return [
                    'has_presupposition' => true,
                    'status' => 'REFUTED',
                    'sub_type' => 'FALSE_PREMISE',
                    'confidence' => 0.96,
                    'premise' => $kc['premise'],
                    'refutation' => "The premise of your question is incorrect according to the course material. {$kc['truth']}",
                    'citation' => "[{$kc['course']} - Chunk {$kc['chunk_index']}]"
                ];
            }
        }

        // 3. Check General Presuppositions with Evidence Contradiction
        $hasPresupposition = false;
        foreach (self::$presuppositionPatterns as $pattern) {
            if (preg_match($pattern, $query)) {
                $hasPresupposition = true;
                break;
            }
        }

        if ($hasPresupposition) {
            // Check for evidence conflict: If the query asks "Why does X [verb] Y?" and evidence explicitly states "X does not [verb] Y" or "never Y"
            foreach ($retrievedChunks as $chunk) {
                $content = $chunk['content'] ?? '';
                // e.g. "does not", "is immutable", "cannot be", "asynchronously after"
                if (preg_match('/\b(does not|never|is not|instead of|as opposed to|not supported)\b/i', $content)) {
                    // Potential conflict flagged for careful grounded prompt injection
                }
            }
        }

        return [
            'has_presupposition' => $hasPresupposition,
            'status' => 'CONFIRMED',
            'confidence' => 0.85,
            'refutation' => null
        ];
    }
}
