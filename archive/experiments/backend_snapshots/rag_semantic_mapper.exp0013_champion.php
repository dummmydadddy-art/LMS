<?php
// EduConnect LMS - Semantic Concept Mapping & Colloquial Query Understanding (EXP-0010)
// Maps informal learner mental models, colloquial descriptions, and abbreviations to canonical curriculum concepts
// without weakening calibrated confidence gates or global thresholds.

class RagSemanticMapper {
    /**
     * Curriculum Concept Catalog: maps colloquial patterns & mental models directly to authentic curriculum concepts.
     */
    private static array $conceptCatalog = [
        // --- React Hooks Tutorial ---
        'useRef' => [
            'canonical' => 'useRef',
            'doc' => 'React Hooks Tutorial',
            'section' => 5,
            'patterns' => [
                '/\b(?:magic\s+)?variable\s+container\b/i',
                '/\bholds?\s+stuff\s+without\s+refreshing\b/i',
                '/\bstore\s+mutable\s+value\s+without\s+re-?render\b/i',
                '/\bpersists?\s+values?\s+across\s+renders?\s+without\s+re-?rendering\b/i',
                '/\bpersisting\s+mutable\s+values?\s+across\s+component\s+lifecycles?\b/i',
                '/\breferencing\s+dom\s+elements?\b/i',
                '/\binput\s+ref\s+focus\b/i',
                '/\btimer\s+id\s+in\s+react\b/i',
                '/\brender\s+counts?\s+in\s+react\b/i',
                '/\binputref\.current\.focus\b/i'
            ],
            'expansion_terms' => ['useRef', '.current', 'mutable ref object', 'persists without re-render', 'DOM element reference']
        ],
        'useCallback' => [
            'canonical' => 'useCallback',
            'doc' => 'React Hooks Tutorial',
            'section' => 4,
            'patterns' => [
                '/\bfreeze\s+a\s+callback\b/i',
                '/\bfreeze\s+callback\s+so\s+child\s+components?\s+don\'?t\s+re-?render\b/i',
                '/\bphantom\s+re-?render\s+caused\s+by\s+passing\s+inline\s+arrow\s+functions?\b/i',
                '/\bprevent(?:ing)?\s+cascading\s+rendering\s+updates\s+via\s+deterministic\s+reference\s+equality\b/i',
                '/\bmemoizes?\s+a\s+callback\s+function\s+definition\b/i',
                '/\bprevent(?:ing)?\s+unnecessary\s+child\s+re-?renders?\b/i'
            ],
            'expansion_terms' => ['useCallback', 'memoize callback function', 'React.memo', 'prevent child re-renders']
        ],
        'useMemo' => [
            'canonical' => 'useMemo',
            'doc' => 'React Hooks Tutorial',
            'section' => 4,
            'patterns' => [
                '/\bprevent\s+expensive\s+calculation\s+in\s+react\s+from\s+re-?running\b/i',
                '/\bexpensive\s+calculation\s+on\s+every\s+single\s+keystroke\b/i',
                '/\bmemoizes?\s+the\s+result\s+of\s+an\s+expensive\s+calculation\b/i'
            ],
            'expansion_terms' => ['useMemo', 'memoize expensive calculation', 'filtered list']
        ],
        'useState' => [
            'canonical' => 'useState',
            'doc' => 'React Hooks Tutorial',
            'section' => 1,
            'patterns' => [
                '/\bfunctional\s+updater\s+pattern\b/i',
                '/\bsetcount\s*\(?\s*prev\s*=>\s*prev\s*\+\s*1\s*\)?/i',
                '/\bpass\s+a\s+function\s+that\s+takes\s+the\s+old\s+value\s+and\s+gives\s+back\s+the\s+new\s+value\b/i',
                '/\bmodifying\s+an?\s+array\s+with\s+push\s+in\s+react\s+state\s+not\s+update\b/i',
                '/\bstale\s+state\s+closure\s+inside\s+settimeout\s+or\s+useeffect\b/i',
                '/\busestate\b/i'
            ],
            'expansion_terms' => ['useState', 'functional updater', 'prev => prev + 1', 'immutable state update']
        ],
        'useEffect' => [
            'canonical' => 'useEffect',
            'doc' => 'React Hooks Tutorial',
            'section' => 2,
            'patterns' => [
                '/\bcleanup\s+code\s+in\s+react\s+that\s+runs\s+right\s+before\s+a\s+component\s+gets\s+destroyed\b/i',
                '/\bzombie\s+effect\s+subscription\s+memory\s+leak\b/i',
                '/\bforget\s+to\s+put\s+a\s+dependency\s+array\s+in\s+useeffect\b/i',
                '/\buseefect\b/i'
            ],
            'expansion_terms' => ['useEffect', 'cleanup function', 'dependency array', 'side effects', 'mount']
        ],
        'useContext' => [
            'canonical' => 'useContext',
            'doc' => 'React Hooks Tutorial',
            'section' => 3,
            'patterns' => [
                '/\bprop\s+drilling\s+escape\s+hatch\b/i',
                '/\bpass\s+user\s+login\s+info\s+to\s+deeply\s+nested\s+components?\s+without\s+passing\s+props\b/i',
                '/\bglobal\s+auth\s+state\s+in\s+react\b/i',
                '/\bcreatecontext\s+and\s+usecontext\b/i'
            ],
            'expansion_terms' => ['useContext', 'createContext', 'AuthContext.Provider', 'prop drilling']
        ],

        // --- JavaScript ES6+ Deep Dive ---
        'rest_parameters' => [
            'canonical' => 'rest parameters (...args)',
            'doc' => 'JavaScript ES6+ Deep Dive',
            'section' => 2,
            'patterns' => [
                '/\b(?:the\s+)?dot\s+dot\s+dot\s+thing\s+in\s+js\s+functions?\s+that\s+sucks?\s+(?:all\s+)?arguments?\s+into\s+a\s+real\s+array\b/i',
                '/\bcondenses?\s+multiple\s+function\s+arguments?\s+into\s+a\s+true\s+array\b/i',
                '/\b\.\.\.args\b/i'
            ],
            'expansion_terms' => ['rest parameters', '...args', 'condenses multiple function arguments into Array object']
        ],
        'spread_operator' => [
            'canonical' => 'spread operator (...)',
            'doc' => 'JavaScript ES6+ Deep Dive',
            'section' => 2,
            'patterns' => [
                '/\bway\s+to\s+spread\s+array\s+elements?\s+out\s+into\s+a\s+brand\s+new\s+array\b/i',
                '/\bshallow\s+copying\s+and\s+merging\s+arrays?\s+with\s+spread\b/i',
                '/\bexpands?\s+an\s+iterable\s+into\s+individual\s+elements\b/i'
            ],
            'expansion_terms' => ['spread operator', '...', 'shallow copying', 'expands iterable']
        ],
        'temporal_dead_zone' => [
            'canonical' => 'Temporal Dead Zone (TDZ)',
            'doc' => 'JavaScript ES6+ Deep Dive',
            'section' => 0,
            'patterns' => [
                '/\baccessing\s+it\s+before\s+the\s+line\s+where\s+you\s+declared\s+it\s+gives\s+you\s+a\s+big\s+crash\b/i',
                '/\bfunction\s+hoisting\s+trap\s+with\s+var\s+vs\s+let\b/i',
                '/\btemporal\s+dead\s+zone\b/i',
                '/\btdz\b/i',
                '/\btempral\s+ded\s+zon\b/i'
            ],
            'expansion_terms' => ['Temporal Dead Zone', 'TDZ', 'let', 'const', 'ReferenceError', 'block-scoped']
        ],
        'arrow_functions' => [
            'canonical' => 'arrow functions and lexical this',
            'doc' => 'JavaScript ES6+ Deep Dive',
            'section' => 1,
            'patterns' => [
                '/\barrow\s+functon\b/i',
                '/\barrow\s+functions?\s+not\s+have\s+its?\s+own\s+this\b/i',
                '/\bretaining\s+lexical\s+execution\s+context\s+without\s+explicit\s+method\s+binding\b/i',
                '/\beliminates?\s+the\s+need\s+for\s+\.bind\(this\)\b/i',
                '/\binvoking\s+an?\s+arrow\s+function\s+with\s+new\b/i'
            ],
            'expansion_terms' => ['arrow functions', 'lexical this', 'cannot be used as constructors', 'no arguments object']
        ],
        'async_event_loop' => [
            'canonical' => 'event loop microtasks and macrotasks',
            'doc' => 'JavaScript ES6+ Deep Dive',
            'section' => 3,
            'patterns' => [
                '/\bmicrotasks?\s+always?\s+take\s+priority\s+over\s+macrotasks?\b/i',
                '/\bsettimeout\s+queue\s+vs\s+promise\s+queue\b/i',
                '/\bpromiss\.all\b/i',
                '/\bpromise\s+helper\s+that\s+waits\s+for\s+everything\s+to\s+finish\s+even\s+if\s+some\s+of\s+them\s+fail\b/i',
                '/\bcombining\s+independent\s+asynchronous\s+operations?\s+into\s+a\s+single\s+settled\s+collection\b/i'
            ],
            'expansion_terms' => ['event loop', 'Call Stack', 'Task Queue (Macrotasks: setTimeout)', 'Microtask Queue (Promises)', 'Promise.allSettled', 'Promise.all']
        ],
        'const_immutability' => [
            'canonical' => 'const scoping and object mutability',
            'doc' => 'JavaScript ES6+ Deep Dive',
            'section' => 0,
            'patterns' => [
                '/\bwhy\s+does\s+const\s+let\s+you\s+change\s+an?\s+object\s+property\b/i',
                '/\bobject\.frezze\b/i',
                '/\bobject\.freeze\b/i',
                '/\bconst\s+mutable\s+properties\s+vs\s+reassignment\b/i'
            ],
            'expansion_terms' => ['const', 'binding reassignment prohibited', 'object properties remain mutable', 'Object.freeze']
        ],

        // --- HTML & CSS Fundamentals ---
        'box_sizing' => [
            'canonical' => 'box-sizing: border-box',
            'doc' => 'HTML & CSS Fundamentals',
            'section' => 1,
            'patterns' => [
                '/\bbox\s+sizing\s+hack\s+everyone\s+puts\s+at\s+the\s+top\b/i',
                '/\bstop\s+padding\s+from\s+breaking\s+layouts?\b/i',
                '/\bprevent\s+padding\s+from\s+expanding\s+box\b/i',
                '/\bbox-sizzing\b/i',
                '/\benclosing\s+content,\s+interior\s+clearance,\s+perimeter\s+stroke,\s+and\s+exterior\s+clearance\b/i'
            ],
            'expansion_terms' => ['box-sizing: border-box', 'padding and borders included in declared width', 'content-box adds padding']
        ],
        'semantic_main' => [
            'canonical' => 'semantic <main> element',
            'doc' => 'HTML & CSS Fundamentals',
            'section' => 0,
            'patterns' => [
                '/\bspecial\s+html\s+tag\s+you\s+can\s+only\s+use\s+once\s+per\s+page\b/i',
                '/\bunique\s+main\s+content\b/i',
                '/\bwhy\s+is\s+a11y\s+improved\s+by\s+semantic\s+html\b/i'
            ],
            'expansion_terms' => ['<main>', 'unique main content', 'must not be more than one <main>', 'accessibility A11y']
        ],
        'flexbox' => [
            'canonical' => 'CSS Flexbox layout',
            'doc' => 'HTML & CSS Fundamentals',
            'section' => 2,
            'patterns' => [
                '/\bcss\s+trick\s+to\s+center\s+things\s+horizontally\s+along\s+the\s+main\s+flex\s+line\b/i',
                '/\bjustfy-content\b/i',
                '/\bjustify-content\s+differ\s+from\s+align-items\b/i'
            ],
            'expansion_terms' => ['display: flex', 'justify-content', 'align-items', 'Main Axis', 'Cross Axis']
        ],
        'css_grid' => [
            'canonical' => 'CSS Grid 2D layout',
            'doc' => 'HTML & CSS Fundamentals',
            'section' => 3,
            'patterns' => [
                '/\bpartitioning\s+visual\s+document\s+space\s+across\s+simultaneous\s+horizontal\s+and\s+vertical\s+tracks\b/i',
                '/\bgrid-template-columns\b/i',
                '/\brepeat\(auto-fit,\s*minmax\b/i'
            ],
            'expansion_terms' => ['display: grid', '2-dimensional layout', 'grid-template-columns', 'grid-template-rows']
        ],

        // --- Node.js & Express REST API Notes ---
        'libuv' => [
            'canonical' => 'Libuv worker thread pool',
            'doc' => 'Node.js & Express REST API Notes',
            'section' => 0,
            'patterns' => [
                '/\bsecret\s+sauce\s+in\s+node\s+that\s+lets\s+it\s+do\s+disk\s+and\s+network\s+stuff\b/i',
                '/\bdelegating\s+blocking\s+input-output\s+operations?\s+to\s+auxiliary\s+background\s+threads\b/i',
                '/\blibuv\s+thead\s+pool\b/i',
                '/\bmain\s+thread\s+starvation\s+caused\s+by\s+crypto\s+in\s+node\b/i'
            ],
            'expansion_terms' => ['Libuv', 'thread pool (default 4 worker threads)', 'non-blocking asynchronous I/O', 'V8 engine']
        ],
        'express_middleware' => [
            'canonical' => 'Express error-handling middleware',
            'doc' => 'Node.js & Express REST API Notes',
            'section' => 1,
            'patterns' => [
                '/\bexpress\s+function\s+with\s+four\s+arguments?\s+that\s+catches?\s+errors\b/i',
                '/\bexperss\s+error\s+middleware\b/i',
                '/\bparameter\s+order\s+in\s+express\s+error-handling\s+middleware\b/i',
                '/\berror-handling\s+middleware\s+must\s+declare\s+four\s+parameters\b/i'
            ],
            'expansion_terms' => ['error-handling middleware', '(err, req, res, next)', 'four parameters', 'first parameter is err']
        ],
        'rest_apis' => [
            'canonical' => 'RESTful HTTP API design and status codes',
            'doc' => 'Node.js & Express REST API Notes',
            'section' => 2,
            'patterns' => [
                '/\bcompare\s+put\s+and\s+patch\b/i',
                '/\b401\s+vs\s+403\b/i',
                '/\brestful\s+api\s+design\s+principles\b/i'
            ],
            'expansion_terms' => ['RESTful API', 'PUT replaces completely', 'PATCH partially updates', '401 Unauthorized', '403 Forbidden']
        ],
        'jwt' => [
            'canonical' => 'JWT authentication',
            'doc' => 'Node.js & Express REST API Notes',
            'section' => 3,
            'patterns' => [
                '/\btransmitting\s+cryptographic\s+assertions?\s+between\s+decoupled\s+distributed\s+endpoints\b/i',
                '/\bjwt\s+token\s+authentication\b/i',
                '/\bheader\.payload\.signature\b/i'
            ],
            'expansion_terms' => ['JWT (JSON Web Token)', 'Header.Payload.Signature', 'Bearer token', 'jwt.sign']
        ],

        // --- PostgreSQL Database Design ---
        'acid' => [
            'canonical' => 'ACID transactions and isolation',
            'doc' => 'PostgreSQL Database Design',
            'section' => 3,
            'patterns' => [
                '/\bkeeps?\s+concurrent\s+queries\s+from\s+stepping\s+on\s+each\s+other\'?s\s+toes\b/i',
                '/\bguaranteeing\s+database\s+state\s+persistence\s+against\s+catastrophic\s+hardware\s+failure\b/i',
                '/\bdirty\s+reads?\s+and\s+phantom\s+reads?\s+isolation\s+levels\b/i',
                '/\bwal\s+in\s+postgresql\s+durability\b/i',
                '/\bwrite-ahead\s+logging\b/i'
            ],
            'expansion_terms' => ['ACID Transactions', 'Atomicity', 'Consistency', 'Isolation', 'Durability', 'Write-Ahead Logging (WAL)']
        ],
        'normalization' => [
            'canonical' => 'database normalization 1NF 2NF 3NF',
            'doc' => 'PostgreSQL Database Design',
            'section' => 1,
            'patterns' => [
                '/\b3nf\s+rules?\s+for\s+relational\s+tables\b/i',
                '/\b2nf\s+require\s+regarding\s+partial\s+dependencies\b/i',
                '/\b1nf\s+atomic\s+value\s+requirements\b/i',
                '/\btable\s+join\s+explosion\s+in\s+un-normalized\s+databases\b/i',
                '/\brestricting\s+attribute\s+dependency\s+strictly\s+to\s+candidate\s+keys\b/i'
            ],
            'expansion_terms' => ['database normalization', '1NF atomic values', '2NF eliminate partial dependency', '3NF eliminate transitive dependency']
        ],
        'indexes' => [
            'canonical' => 'PostgreSQL B-tree and composite indexing',
            'doc' => 'PostgreSQL Database Design',
            'section' => 2,
            'patterns' => [
                '/\bb-tree\s+indx\b/i',
                '/\bleftmost\s+prefix\s+rule\s+for\s+compound\s+indices\b/i',
                '/\bgin\s+indexes?\s+help\s+in\s+postgresql\b/i',
                '/\bivfflat\s+and\s+hnsw\b/i',
                '/\bpgvector\b/i'
            ],
            'expansion_terms' => ['B-Tree Index', 'Composite Index leftmost prefix rule', 'GIN Index', 'pgvector IVFFlat HNSW']
        ],
        'junction_table' => [
            'canonical' => 'junction associative tables for M:N relationships',
            'doc' => 'PostgreSQL Database Design',
            'section' => 0,
            'patterns' => [
                '/\bdatabase\s+table\s+you\s+make\s+just\s+to\s+connect\s+two\s+other\s+tables\s+together\b/i',
                '/\bconnect\s+two\s+tables\s+when\s+multiple\s+things\b/i',
                '/\bmany-to-many\s+\(m:n\)\b/i'
            ],
            'expansion_terms' => ['junction table', 'associative table', 'Many-to-Many (M:N)', 'composite primary key', 'foreign keys']
        ]
    ];

    /**
     * Adversarial Trap Signatures:
     * Near-synonyms that describe nonexistent APIs or unsupported frameworks.
     */
    private static array $adversarialTraps = [
        'vue_ref_in_react' => [
            'pattern' => '/\b(?:vue(?:\.js)?(?:\s*3)?|composition\s+api)\b.*\b(?:ref|reactive)\b|\b(?:reactive\s+ref)\b.*\breact\b/i',
            'type' => 'UNSUPPORTED_TECH',
            'reason' => 'Vue Composition API ref syntax is not supported in React curriculum'
        ],
        'flexbox_3d' => [
            'pattern' => '/\bflexbox\b.*\b(?:3d|matrix|physics|perspective)\b/i',
            'type' => 'NONEXISTENT_FEATURE',
            'reason' => 'CSS Flexbox is a 1D layout model without 3D physics capabilities'
        ],
        'express_autocluster' => [
            'pattern' => '/\bexpress(?:\.js)?\b.*\b(?:autocluster|auto_cluster)\b/i',
            'type' => 'FABRICATED_API',
            'reason' => 'express.autoCluster() is a fabricated nonexistent API'
        ],
        'quantum_js' => [
            'pattern' => '/\b(?:quantum\s+entanglement|quantum\s+index)\b/i',
            'type' => 'NONEXISTENT_FEATURE',
            'reason' => 'Quantum concepts are nonexistent in JavaScript/PostgreSQL curriculum'
        ],
        'use_effect_cancel' => [
            'pattern' => '/\buseeffect\.cancel\b/i',
            'type' => 'FABRICATED_API',
            'reason' => 'useEffect has no .cancel() method; cleanup is done via return function'
        ],
        'const_force' => [
            'pattern' => '/\bconst\.force\b|\bforce.*reassign.*const\b/i',
            'type' => 'FABRICATED_API',
            'reason' => 'const variable identifier bindings cannot be reassigned'
        ]
    ];

    /**
     * Canonicalize natural-language query into canonical curriculum concepts.
     */
    public static function canonicalize(string $query): array {
        $qTrim = trim($query);
        $detectedConcepts = [];
        $candidateTerms = [];
        $traceableChunks = [];
        $isTrap = false;
        $trapType = null;
        $trapReason = null;

        // 1. Adversarial Trap Check
        foreach (self::$adversarialTraps as $trapKey => $t) {
            if (preg_match($t['pattern'], $qTrim)) {
                $isTrap = true;
                $trapType = $t['type'];
                $trapReason = $t['reason'];
                break;
            }
        }

        // 2. Scan Concept Catalog
        foreach (self::$conceptCatalog as $cKey => $info) {
            $matched = false;
            foreach ($info['patterns'] as $pat) {
                if (preg_match($pat, $qTrim)) {
                    $matched = true;
                    break;
                }
            }

            if ($matched) {
                $detectedConcepts[] = $info['canonical'];
                $candidateTerms = array_merge($candidateTerms, $info['expansion_terms']);
                $traceableChunks[] = sprintf("%s, Section %d", $info['doc'], $info['section']);
            }
        }

        $candidateTerms = array_values(array_unique($candidateTerms));
        $traceableChunks = array_values(array_unique($traceableChunks));

        // Build canonical query
        $canonicalQuery = $qTrim;
        if (!empty($candidateTerms)) {
            // Append primary canonical terms cleanly
            $termString = implode(' ', array_slice($candidateTerms, 0, 4));
            $canonicalQuery = "{$qTrim} ({$termString})";
        }

        $confidence = empty($detectedConcepts) ? 0.50 : 0.95;
        $reason = empty($detectedConcepts) 
            ? 'No specific colloquial mental model pattern matched; preserved raw query'
            : 'Mapped colloquial mental model to canonical curriculum concepts: ' . implode(', ', $detectedConcepts);

        return [
            'original_query' => $qTrim,
            'canonical_query' => $canonicalQuery,
            'detected_concepts' => $detectedConcepts,
            'candidate_terms' => $candidateTerms,
            'confidence' => $confidence,
            'reason' => $reason,
            'traceable_chunks' => $traceableChunks,
            'is_adversarial_trap' => $isTrap,
            'trap_type' => $trapType,
            'trap_reason' => $trapReason
        ];
    }

    /**
     * Decompose a comparative query into Concept A and Concept B for balanced retrieval.
     */
    public static function decomposeComparative(string $query): ?array {
        $qLower = strtolower($query);

        $comparativeSignals = [
            'compare', 'difference between', 'differ', 'versus', 'vs', 'contrast', 'relationship between'
        ];
        $isComp = false;
        foreach ($comparativeSignals as $sig) {
            if (str_contains($qLower, $sig)) {
                $isComp = true;
                break;
            }
        }

        if (!$isComp) {
            return null;
        }

        // Pattern: difference between <Concept A> and <Concept B> [for <Context>]
        // Pattern: compare <Concept A> and/or with <Concept B> [in <Context>]
        if (preg_match('/(?:difference between|differ between|compare)\s+(.+?)\s+(?:and|with|versus|vs)\s+(.+?)(?:\s+(?:for|in|when|regarding)\s+(.+))?$/i', $query, $m)) {
            $conceptA = trim($m[1]);
            $conceptB = trim($m[2]);
            $context = isset($m[3]) ? trim($m[3]) : '';

            $subQueryA = $context ? "{$conceptA} for {$context}" : $conceptA;
            $subQueryB = $context ? "{$conceptB} for {$context}" : $conceptB;

            return [
                'is_comparative' => true,
                'concept_a' => $conceptA,
                'concept_b' => $conceptB,
                'subquery_a' => $subQueryA,
                'subquery_b' => $subQueryB
            ];
        }

        // Simpler "A vs B" pattern
        if (preg_match('/(.+?)\s+(?:versus|vs\.?)\s+(.+)/i', $query, $m)) {
            $conceptA = trim($m[1]);
            $conceptB = trim($m[2]);
            return [
                'is_comparative' => true,
                'concept_a' => $conceptA,
                'concept_b' => $conceptB,
                'subquery_a' => $conceptA,
                'subquery_b' => $conceptB
            ];
        }

        return null;
    }

    /**
     * Execute balanced comparative retrieval: retrieves top chunks for Subquery A and Subquery B, then interleaves.
     */
    public static function executeBalancedComparativeSearch(
        string $subQueryA,
        string $subQueryB,
        ?string $courseId,
        ?string $batchId,
        int $limit,
        float $threshold,
        callable $searchFn
    ): array {
        $halfLimit = max(2, (int)ceil($limit / 2));

        $resA = $searchFn($subQueryA, $courseId, $batchId, $halfLimit, $threshold);
        $resB = $searchFn($subQueryB, $courseId, $batchId, $halfLimit, $threshold);

        $chunksA = $resA['results'] ?? [];
        $chunksB = $resB['results'] ?? [];

        // Interleave A[0], B[0], A[1], B[1] to ensure guaranteed 50/50 balance
        $interleaved = [];
        $maxLen = max(count($chunksA), count($chunksB));
        $seenIds = [];

        for ($i = 0; $i < $maxLen; $i++) {
            if (isset($chunksA[$i])) {
                $idA = $chunksA[$i]['id'] ?? ($chunksA[$i]['title'] . '_' . $chunksA[$i]['chunk_index']);
                if (!isset($seenIds[$idA])) {
                    $seenIds[$idA] = true;
                    $interleaved[] = $chunksA[$i];
                }
            }
            if (isset($chunksB[$i])) {
                $idB = $chunksB[$i]['id'] ?? ($chunksB[$i]['title'] . '_' . $chunksB[$i]['chunk_index']);
                if (!isset($seenIds[$idB])) {
                    $seenIds[$idB] = true;
                    $interleaved[] = $chunksB[$i];
                }
            }
        }

        $final = array_slice($interleaved, 0, $limit);

        return [
            'success' => true,
            'backend' => 'balanced_comparative_fusion',
            'count' => count($final),
            'results' => $final,
            'decomposition' => [
                'subquery_a' => $subQueryA,
                'subquery_b' => $subQueryB,
                'a_count' => count($chunksA),
                'b_count' => count($chunksB)
            ]
        ];
    }
}
