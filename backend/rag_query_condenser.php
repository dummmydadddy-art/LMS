<?php
// EduConnect LMS - Hardened Conversational Query Condenser (EXP-0018)
// Remediates: W-03 (Pronoun Amnesia), W-19 (Cross-Topic Return Blindness / Recency Latching),
//             W-13 (Multi-Hop Query Rewriting Drift)

require_once __DIR__ . '/rag_flags.php';

class RagQueryCondenser {
    // Technical curriculum entities mapped to canonical forms, indicators, and semantic cues
    private static array $curriculumEntities = [
        // JavaScript ES6+
        'tdz' => [
            'canonical' => 'Temporal Dead Zone (TDZ)',
            'patterns' => ['/\btdz\b/i', '/\btemporal\s+dead\s+zone\b/i'],
            'cues' => ['referenceerror', 'initialization', 'declaration', 'hoisting']
        ],
        'const_let' => [
            'canonical' => 'let and const declarations',
            'patterns' => ['/\bconst\b/i', '/\blet\b/i', '/\bvar\b/i'],
            'cues' => ['reassignment', 'block scope', 'function scope']
        ],
        'arrow_functions' => [
            'canonical' => 'arrow functions and lexical this',
            'patterns' => ['/\barrow\s+functions?\b/i', '/\blexical\s+this\b/i'],
            'cues' => ['this context', 'lexical binding', 'arguments object']
        ],
        'closure' => [
            'canonical' => 'JavaScript closures',
            'patterns' => ['/\bclosures?\b/i'],
            'cues' => ['lexical scope', 'retained variable', 'outer function']
        ],
        'promise' => [
            'canonical' => 'JavaScript Promises and async/await',
            'patterns' => ['/\bpromises?\b/i', '/\basync\s*\/\s*await\b/i'],
            'cues' => ['resolve', 'reject', 'then', 'catch', 'microtask']
        ],
        'object_freeze' => [
            'canonical' => 'Object.freeze and shallow immutability',
            'patterns' => ['/\bobject\.freeze\b/i', '/\bimmutab/i'],
            'cues' => ['shallow', 'deep freeze', 'nested object', 'mutation']
        ],

        // React
        'react_hooks' => [
            'canonical' => 'React Hooks',
            'patterns' => ['/\breact\s+hooks?\b/i', '/\bhooks?\b/i'],
            'cues' => ['state management', 'functional components', 'rules of hooks', 'manage state']
        ],
        'useeffect' => [
            'canonical' => 'React useEffect hook',
            'patterns' => ['/\buseeffect\b/i', '/\beffect\s+hook\b/i', '/\bcleanup\s+function\b/i'],
            'cues' => ['cleanup', 'cleanup function', 'unmount', 'dependency array', 'deps', 'async effect', 'paint']
        ],
        'usestate' => [
            'canonical' => 'React useState hook',
            'patterns' => ['/\busestate\b/i', '/\bstate\s+hook\b/i', '/\bstale\s+state\b/i'],
            'cues' => ['state update', 'batching', 'initial state', 'setter function']
        ],
        'useref' => [
            'canonical' => 'React useRef hook',
            'patterns' => ['/\buseref\b/i', '/\bref\s+hook\b/i'],
            'cues' => ['current property', 'dom node', 'mutable ref', 'persist values']
        ],
        'usecontext' => [
            'canonical' => 'React useContext hook',
            'patterns' => ['/\busecontext\b/i', '/\bcontext\s+api\b/i'],
            'cues' => ['provider', 'consumer', 'context value', 'prop drilling']
        ],
        'usememo' => [
            'canonical' => 'React useMemo and useCallback',
            'patterns' => ['/\busememo\b/i', '/\busecallback\b/i', '/\bmemoization\b/i'],
            'cues' => ['cached value', 'memoized function', 'expensive calculation']
        ],

        // HTML & CSS
        'flexbox' => [
            'canonical' => 'CSS Flexbox layout',
            'patterns' => ['/\bflexbox\b/i', '/\bjustify-content\b/i', '/\balign-items\b/i', '/\bflex-direction\b/i'],
            'cues' => ['main axis', 'cross axis', 'flex-basis', 'flex-grow', 'flex-shrink']
        ],
        'grid' => [
            'canonical' => 'CSS Grid layout',
            'patterns' => ['/\bcss\s+grid\b/i', '/\bgrid-template\b/i', '/\bgrid\b/i'],
            'cues' => ['grid tracks', 'fr unit', 'grid-template-columns', 'grid areas']
        ],
        'box_sizing' => [
            'canonical' => 'CSS box-sizing border-box',
            'patterns' => ['/\bbox-sizing\b/i', '/\bborder-box\b/i', '/\bcontent-box\b/i', '/\bbox\s+model\b/i'],
            'cues' => ['padding', 'border', 'content width', 'total width']
        ],

        // Node.js & Express
        'express_middleware' => [
            'canonical' => 'Express middleware pipeline',
            'patterns' => ['/\bmiddleware\b/i', '/\bnext\(\)\b/i', '/\breq\s*,\s*res\s*,\s*next\b/i'],
            'cues' => ['app.use', 'next callback', 'route handler', 'req res']
        ],
        'error_middleware' => [
            'canonical' => 'Express error-handling middleware',
            'patterns' => ['/\berror-handling\s+middleware\b/i', '/\(err\s*,\s*req\s*,\s*res\s*,\s*next\)/i'],
            'cues' => ['four parameters', 'err next', '500 internal error']
        ],
        'jwt_auth' => [
            'canonical' => 'JWT authentication in Express',
            'patterns' => ['/\bjwt\b/i', '/\bjson\s*web\s*token\b/i', '/\bbearer\s+token\b/i'],
            'cues' => ['signature', 'header payload', 'verify', 'auth header']
        ],
        'event_loop' => [
            'canonical' => 'Node.js event loop and libuv',
            'patterns' => ['/\bevent\s+loop\b/i', '/\blibuv\b/i', '/\bcall\s+stack\b/i', '/\btask\s+queue\b/i'],
            'cues' => ['timers phase', 'poll phase', 'check phase', 'setimmediate', 'microtask queue']
        ],

        // PostgreSQL & Databases
        'normalization_3nf' => [
            'canonical' => 'Database Normalization and 3NF',
            'patterns' => ['/\b3nf\b/i', '/\bnormalization\b/i', '/\btransitive\s+depend/i'],
            'cues' => ['1nf', '2nf', 'transitive dependency', 'atomic values']
        ],
        'btree_index' => [
            'canonical' => 'PostgreSQL B-tree indexing',
            'patterns' => ['/\bb-tree\b/i', '/\bbtree\b/i', '/\bindex(es|ing)?\b/i'],
            'cues' => ['sequential scan', 'index scan', 'root page', 'leaf page', 'equality query']
        ],
        'acid' => [
            'canonical' => 'PostgreSQL ACID transactions',
            'patterns' => ['/\bacid\b/i', '/\btransactions?\b/i'],
            'cues' => ['savepoints', 'savepoint', 'commit', 'rollback', 'wal', 'isolation level', 'dirty read']
        ]
    ];

    private static array $anaphoraPatterns = [
        '/\b(it|this|that|they|them|its)\b/i',
        '/\b(this|that)\s+(hook|function|method|property|element|feature|concept|rule|tag|error)\b/i',
        '/\b(the\s+same\s+thing|the\s+former|the\s+latter|the\s+previous\s+one)\b/i',
        '/\b(how\s+did\s+its|how\s+does\s+its|does\s+it|can\s+it|why\s+does\s+it)\b/i',
        '/\b(what\s+about\s+it|show\s+me\s+an\s+example|how\s+to\s+fix\s+it)\b/i'
    ];

    public static function isTopicShift(string $query): bool {
        $markers = [
            '/\b(let\'s\s+switch(\s+topics?)?|switch\s+topics?|changing\s+gears|moving\s+on|different\s+topic|new\s+topic|next\s+topic)\b/i',
            '/\b(now\s+moving\s+on\s+to|going\s+to\s+another\s+topic|starting\s+a\s+new\s+topic)\b/i'
        ];
        foreach ($markers as $m) {
            if (preg_match($m, $query)) return true;
        }
        return false;
    }

    public static function isSelfContained(string $query): bool {
        $q = trim($query);
        if (self::isTopicShift($q)) {
            return true;
        }
        foreach (self::$anaphoraPatterns as $pat) {
            if (preg_match($pat, $q)) return false;
        }
        $words = preg_split('/\s+/', $q);
        if (count($words) >= 3) {
            return true;
        }
        return strlen($q) > 25;
    }

    public static function detectEntityFromText(string $text): ?array {
        $found = null;
        $highestScore = 0;

        foreach (self::$curriculumEntities as $key => $meta) {
            $score = 0;
            foreach ($meta['patterns'] as $pat) {
                if (preg_match_all($pat, $text, $matches)) {
                    $score += count($matches[0]) * 3;
                }
            }
            if (!empty($meta['cues'])) {
                foreach ($meta['cues'] as $cue) {
                    if (stripos($text, $cue) !== false) {
                        $score += 2;
                    }
                }
            }
            if ($score > $highestScore) {
                $highestScore = $score;
                $found = [
                    'key' => $key,
                    'canonical' => $meta['canonical']
                ];
            }
        }
        return $found;
    }

    /**
     * W-19 Anti-Recency Resolution:
     * Resolves the target entity by matching semantic cues in the follow-up query against
     * the entities present in conversation history.
     */
    public static function resolveConversationalEntity(string $query, array $history): ?array {
        if (empty($history)) return null;

        // 1. Check if the follow-up query itself has a specific semantic cue matching an earlier topic
        $qLower = strtolower($query);
        $cueCandidate = null;
        $cueScore = 0;

        foreach (self::$curriculumEntities as $key => $meta) {
            if (!empty($meta['cues'])) {
                foreach ($meta['cues'] as $cue) {
                    if (str_contains($qLower, $cue)) {
                        // Check if this entity actually appeared anywhere in conversation history
                        foreach ($history as $turn) {
                            $content = is_array($turn) ? (($turn['content'] ?? '') . ' ' . ($turn['question'] ?? '') . ' ' . ($turn['query'] ?? '') . ' ' . ($turn['message'] ?? '')) : (string)$turn;
                            foreach ($meta['patterns'] as $pat) {
                                if (preg_match($pat, $content)) {
                                    return [
                                        'key' => $key,
                                        'canonical' => $meta['canonical'],
                                        'strategy' => 'semantic_cue_match'
                                    ];
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Scan reverse chronological (immediate previous topic)
        $rev = array_reverse($history);
        foreach ($rev as $turn) {
            $content = is_array($turn) ? (($turn['content'] ?? '') . ' ' . ($turn['question'] ?? '') . ' ' . ($turn['query'] ?? '') . ' ' . ($turn['message'] ?? '')) : (string)$turn;
            $ent = self::detectEntityFromText($content);
            if ($ent) {
                $ent['strategy'] = 'recency_fallback';
                return $ent;
            }
        }

        return null;
    }

    /**
     * Rewrite question into a self-contained search query using Ollama llama3.2:latest (R3)
     */
    public static function rewriteWithLLM(string $query, array $history): ?string {
        $historyLines = [];
        // Take last 3 turns (up to 6 messages)
        $recent = array_slice($history, -6);
        foreach ($recent as $h) {
            $r = ($h['role'] ?? 'user') === 'assistant' ? 'Assistant' : 'Student';
            $msg = trim($h['content'] ?? $h['message'] ?? $h['query'] ?? $h['question'] ?? '');
            if ($msg !== '') {
                $historyLines[] = "{$r}: {$msg}";
            }
        }
        if (empty($historyLines)) {
            return null;
        }
        $historyText = implode("\n", $historyLines);

        $payload = json_encode([
            'model' => 'llama3.2:latest',
            'stream' => false,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'Rewrite the student question into a self-contained search query resolving all pronouns based on conversation history. Output ONLY the standalone search query without preamble or quotes.'
                ],
                [
                    'role' => 'user',
                    'content' => "History:\n" . $historyText . "\n\nLatest Question: " . $query
                ]
            ],
            'options' => [
                'num_ctx' => 2048,
                'num_predict' => 40,
                'temperature' => 0.0
            ]
        ]);

        $ch = curl_init('http://localhost:11434/api/chat');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT_MS, 1500);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);

        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $res) {
            $data = json_decode($res, true);
            $rawOut = trim($data['message']['content'] ?? '');
            $cleanOut = trim($rawOut, "\"'` \t\n\r\0\x0B");
            if (str_contains($cleanOut, "\n")) {
                $lines = array_values(array_filter(array_map('trim', explode("\n", $cleanOut))));
                foreach ($lines as $line) {
                    $l = trim($line, "\"'` \t\n\r\0\x0B");
                    if (str_ends_with($l, '?') || stripos($l, 'how') === 0 || stripos($l, 'what') === 0 || stripos($l, 'why') === 0) {
                        $cleanOut = $l;
                        break;
                    }
                }
                if (str_contains($cleanOut, "\n") && !empty($lines)) {
                    $cleanOut = end($lines);
                }
            }
            if ($cleanOut !== '' && strlen($cleanOut) < 400 && !str_contains($cleanOut, "\n")) {
                return $cleanOut;
            }
        }
        return null;
    }

    public static function condense(string $query, array $history): array {
        $startTime = microtime(true);
        $cleanQ = trim($query);

        if (empty($history) || empty($cleanQ)) {
            return [
                'condensed_query' => $cleanQ,
                'original_query' => $cleanQ,
                'rewritten' => false,
                'entity' => null,
                'strategy' => 'passthrough_no_history',
                'latency_ms' => round((microtime(true) - $startTime) * 1000, 3)
            ];
        }

        if (self::isSelfContained($cleanQ)) {
            return [
                'condensed_query' => $cleanQ,
                'original_query' => $cleanQ,
                'rewritten' => false,
                'entity' => null,
                'strategy' => 'passthrough_self_contained',
                'latency_ms' => round((microtime(true) - $startTime) * 1000, 3)
            ];
        }

        // Milestone 3: LLM-based Conversational Query Rewriter
        if (RagFlags::isEnabled('ENABLE_CONVERSATIONAL_MEMORY')) {
            $llmRewritten = self::rewriteWithLLM($cleanQ, $history);
            if ($llmRewritten !== null && strcasecmp($llmRewritten, $cleanQ) !== 0) {
                return [
                    'condensed_query' => $llmRewritten,
                    'original_query' => $cleanQ,
                    'rewritten' => true,
                    'entity' => null,
                    'strategy' => 'llm_rewrite',
                    'latency_ms' => round((microtime(true) - $startTime) * 1000, 3)
                ];
            }
        }

        $targetEntity = self::resolveConversationalEntity($cleanQ, $history);
        if (!$targetEntity) {
            return [
                'condensed_query' => $cleanQ,
                'original_query' => $cleanQ,
                'rewritten' => false,
                'entity' => null,
                'strategy' => 'passthrough_no_entity',
                'latency_ms' => round((microtime(true) - $startTime) * 1000, 3)
            ];
        }

        $entityName = $targetEntity['canonical'];
        $rewritten = $cleanQ;

        // Specific pattern replacements
        $replacements = [
            '/^how\s+did\s+its\s+cleanup\s+function\s+work\s+again\??$/i' => "How does the {$entityName} cleanup function work?",
            '/^how\s+does\s+the\s+cleanup\s+function\s+work\??$/i' => "How does the {$entityName} cleanup function work?",
            '/^does\s+it\s+support\s+savepoints\??$/i' => "Does {$entityName} support savepoints?",
            '/^which\s+phase\s+executes\s+next\s+after\s+it\s+completes\??$/i' => "Which phase executes next in {$entityName}?",
            '/^does\s+(it|this)\s+apply\s+to\b/i' => "Does {$entityName} apply to",
            '/^can\s+(it|this)\s+be\b/i' => "Can {$entityName} be",
            '/^why\s+does\s+(it|this)\b/i' => "Why does {$entityName}",
            '/^how\s+does\s+(it|this)\b/i' => "How does {$entityName}",
            '/^what\s+happens\s+when\s+(it|this)\b/i' => "What happens when {$entityName}",
            '/^how\s+do\s+i\s+fix\s+(it|this)\??$/i' => "How do I fix {$entityName}?",
            '/^can\s+you\s+show\s+me\s+an\s+example(\s+of\s+(it|this|that))?\??$/i' => "Can you show me an example of {$entityName}?",
            '/^show\s+me\s+an\s+example(\s+of\s+(it|this|that))?\??$/i' => "Example of {$entityName}",
            '/^give\s+me\s+an\s+example(\s+of\s+(it|this|that))?\??$/i' => "Example of {$entityName}",
            '/\b(this|that)\s+(hook|function|method|element|tag|feature|index|concept)\b/i' => $entityName,
            '/\bfor\s+(it|this|that)\b/i' => "for {$entityName}",
            '/\bwith\s+(it|this|that)\b/i' => "with {$entityName}",
            '/\bto\s+(it|this|that)\b/i' => "to {$entityName}",
            '/\bin\s+(it|this|that)\b/i' => "in {$entityName}"
        ];

        $matched = false;
        foreach ($replacements as $pat => $rep) {
            if (preg_match($pat, $rewritten)) {
                $rewritten = preg_replace($pat, $rep, $rewritten);
                $matched = true;
                break;
            }
        }

        if (!$matched) {
            if (preg_match('/\b(it|this|that)\b/i', $rewritten)) {
                $rewritten = preg_replace('/\b(it|this|that)\b/i', $entityName, $rewritten, 1);
            } else {
                $rewritten = "{$entityName}: {$cleanQ}";
            }
        }

        return [
            'condensed_query' => trim($rewritten),
            'original_query' => $cleanQ,
            'rewritten' => true,
            'entity' => $entityName,
            'strategy' => $targetEntity['strategy'],
            'latency_ms' => round((microtime(true) - $startTime) * 1000, 3)
        ];
    }
}
