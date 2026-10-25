<?php
// EduConnect LMS - Deterministic Conversational Query Condenser (EXP-0009)
// Purpose: Resolves anaphora, pronouns, and omitted subjects across conversation history
// Latency budget: < 5 ms deterministic execution (no secondary LLM calls required)

class RagQueryCondenser {
    // Technical curriculum entities mapped to canonical forms and match patterns
    private static array $curriculumEntities = [
        // JavaScript ES6+
        'tdz' => ['canonical' => 'Temporal Dead Zone (TDZ)', 'patterns' => ['/\btdz\b/i', '/\btemporal\s+dead\s+zone\b/i']],
        'const' => ['canonical' => 'const declaration', 'patterns' => ['/\bconst\b/i']],
        'let' => ['canonical' => 'let declaration', 'patterns' => ['/\blet\b/i']],
        'var' => ['canonical' => 'var declaration', 'patterns' => ['/\bvar\b/i']],
        'arrow_functions' => ['canonical' => 'arrow functions and lexical this', 'patterns' => ['/\barrow\s+functions?\b/i', '/\blexical\s+this\b/i']],
        'closure' => ['canonical' => 'JavaScript closures', 'patterns' => ['/\bclosures?\b/i']],
        'promise' => ['canonical' => 'JavaScript Promises and async/await', 'patterns' => ['/\bpromises?\b/i', '/\basync\s*\/\s*await\b/i']],
        'object_freeze' => ['canonical' => 'Object.freeze and shallow immutability', 'patterns' => ['/\bobject\.freeze\b/i', '/\bimmutab/i']],

        // React
        'useeffect' => ['canonical' => 'React useEffect hook', 'patterns' => ['/\buseeffect\b/i', '/\beffect\s+hook\b/i', '/\bcleanup\s+function\b/i']],
        'usestate' => ['canonical' => 'React useState hook', 'patterns' => ['/\busestate\b/i', '/\bstate\s+hook\b/i', '/\bstale\s+state\b/i']],
        'useref' => ['canonical' => 'React useRef hook', 'patterns' => ['/\buseref\b/i', '/\bref\s+hook\b/i']],
        'usecontext' => ['canonical' => 'React useContext hook', 'patterns' => ['/\busecontext\b/i', '/\bcontext\s+api\b/i']],
        'usememo' => ['canonical' => 'React useMemo and useCallback', 'patterns' => ['/\busememo\b/i', '/\busecallback\b/i', '/\bmemoization\b/i']],
        'custom_hooks' => ['canonical' => 'React custom hooks', 'patterns' => ['/\bcustom\s+hooks?\b/i']],

        // HTML & CSS
        'flexbox' => ['canonical' => 'CSS Flexbox layout', 'patterns' => ['/\bflexbox\b/i', '/\bjustify-content\b/i', '/\balign-items\b/i', '/\bflex-direction\b/i']],
        'grid' => ['canonical' => 'CSS Grid layout', 'patterns' => ['/\bcss\s+grid\b/i', '/\bgrid-template\b/i', '/\bgrid\b/i']],
        'box_sizing' => ['canonical' => 'CSS box-sizing border-box', 'patterns' => ['/\bbox-sizing\b/i', '/\bborder-box\b/i', '/\bcontent-box\b/i', '/\bbox\s+model\b/i']],
        'semantic_html' => ['canonical' => 'Semantic HTML tags', 'patterns' => ['/\bsemantic\s+html\b/i', '/<main>/i', '/<header>/i', '/<footer>/i', '/<nav>/i', '/<article>/i']],

        // Node.js & Express
        'express_middleware' => ['canonical' => 'Express middleware pipeline', 'patterns' => ['/\bmiddleware\b/i', '/\bnext\(\)\b/i', '/\breq\s*,\s*res\s*,\s*next\b/i']],
        'error_middleware' => ['canonical' => 'Express error-handling middleware', 'patterns' => ['/\berror-handling\s+middleware\b/i', '/\(err\s*,\s*req\s*,\s*res\s*,\s*next\)/i']],
        'jwt_auth' => ['canonical' => 'JWT authentication in Express', 'patterns' => ['/\bjwt\b/i', '/\bjson\s*web\s*token\b/i', '/\bbearer\s+token\b/i', '/\b401\s+unauthorized\b/i']],
        'event_loop' => ['canonical' => 'Node.js event loop and libuv', 'patterns' => ['/\bevent\s+loop\b/i', '/\blibuv\b/i', '/\bcall\s+stack\b/i', '/\btask\s+queue\b/i']],

        // PostgreSQL & Databases
        'normalization_3nf' => ['canonical' => 'Database Normalization and 3NF', 'patterns' => ['/\b3nf\b/i', '/\bnormalization\b/i', '/\btransitive\s+depend/i', '/\b2nf\b/i', '/\b1nf\b/i']],
        'btree_index' => ['canonical' => 'PostgreSQL B-tree indexing', 'patterns' => ['/\bb-tree\b/i', '/\bbtree\b/i', '/\bindex(es|ing)?\b/i', '/\bsequential\s+scan\b/i']],
        'acid' => ['canonical' => 'PostgreSQL ACID transactions', 'patterns' => ['/\bacid\b/i', '/\btransactions?\b/i', '/\batomicity\b/i', '/\bisolation\b/i', '/\bdurability\b/i']],
        'keys_and_relations' => ['canonical' => 'Primary keys and junction tables', 'patterns' => ['/\bcomposite\s+primary\s+key\b/i', '/\bjunction\s+table\b/i', '/\bforeign\s+key\b/i']]
    ];

    // Anaphoric pronoun indicators that show reliance on previous context
    private static array $anaphoraPatterns = [
        '/\b(it|this|that|they|them|its)\b/i',
        '/\b(this|that)\s+(hook|function|method|property|element|feature|concept|rule|tag|error)\b/i',
        '/\b(the\s+same\s+thing|the\s+former|the\s+latter|the\s+previous\s+one)\b/i',
        '/\b(apply\s+to|what\s+about|how\s+about|why\s+does\s+it|can\s+it|does\s+it)\b/i',
        '/\b(show\s+me\s+an\s+example(\s+of\s+(it|this|that))?)\b/i',
        '/\b(how\s+do\s+i\s+fix\s+it)\b/i',
        '/\b(what\s+happens\s+if\s+i\s+pass\s+.*to\s+it)\b/i',
        '/\b(how\s+does\s+the\s+cleanup\s+work)\b/i',
        '/\b(why\s+is\s+it\s+useful)\b/i'
    ];

    // Explicit signals of topic change
    private static array $topicSwitchSignals = [
        '/\b(moving\s+on\s+to|now\s+tell\s+me\s+about|switching\s+to|on\s+another\s+note|different\s+topic|unrelated\s+question)\b/i',
        '/\b(let\'s\s+talk\s+about|what\s+about\s+[a-z0-9_<>]+)\b/i'
    ];

    /**
     * Determine if a query is self-contained without needing prior conversational context.
     */
    public static function isSelfContained(string $query): bool {
        $q = trim($query);
        $hasAnaphora = false;
        foreach (self::$anaphoraPatterns as $pattern) {
            if (preg_match($pattern, $q)) {
                $hasAnaphora = true;
                break;
            }
        }

        // Check if query contains strong explicit curriculum keywords
        $explicitKeywords = [
            'useeffect', 'usestate', 'useref', 'usecontext', 'usememo', 'usecallback',
            'temporal dead zone', 'tdz', 'flexbox', 'grid', 'box-sizing', 'border-box',
            '3nf', 'normalization', 'b-tree', 'acid', 'express', 'middleware', 'jwt',
            'arrow function', 'closures', '<main>', 'object.freeze'
        ];

        $hasExplicit = false;
        $qLower = strtolower($q);
        foreach ($explicitKeywords as $kw) {
            if (str_contains($qLower, $kw)) {
                $hasExplicit = true;
                break;
            }
        }

        // If it explicitly mentions the main subject AND has no vague trailing pronouns
        if ($hasExplicit && !$hasAnaphora) {
            return true;
        }

        // Short queries with pronouns are definitely not self-contained
        if ($hasAnaphora) {
            return false;
        }

        // Long queries without pronouns with substantive content (> 60 chars)
        if (strlen($q) > 65 && !$hasAnaphora) {
            return true;
        }

        return false;
    }

    /**
     * Detect if user explicitly switched topics in the current query.
     */
    public static function isTopicSwitch(string $query, ?string $currentEntity): bool {
        $q = trim($query);
        foreach (self::$topicSwitchSignals as $pattern) {
            if (preg_match($pattern, $q)) {
                return true;
            }
        }

        // If query has pronouns referring to prior subject, it cannot be an abrupt topic switch
        if (preg_match('/\b(it|this|that|they|them|its)\b/i', $q)) {
            return false;
        }

        // If the query explicitly mentions a completely different curriculum entity without pronouns
        $newEntity = self::detectEntityFromText($query);
        if ($newEntity && $currentEntity && $newEntity['canonical'] !== $currentEntity) {
            return true;
        }

        return false;
    }

    /**
     * Extract the dominant technical entity from a text snippet.
     */
    public static function detectEntityFromText(string $text): ?array {
        $found = null;
        $highestScore = 0;

        foreach (self::$curriculumEntities as $key => $meta) {
            $score = 0;
            foreach ($meta['patterns'] as $pat) {
                if (preg_match_all($pat, $text, $matches)) {
                    $score += count($matches[0]);
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
     * Extract active conversational entity from history (scanning reverse chronological).
     */
    public static function extractActiveEntity(array $history): ?array {
        if (empty($history)) {
            return null;
        }

        // Scan from most recent to oldest turn (up to 4 turns back)
        $turns = array_slice(array_reverse($history), 0, 4);

        foreach ($turns as $turn) {
            $content = '';
            if (is_array($turn)) {
                $content = ($turn['content'] ?? '') . ' ' . ($turn['query'] ?? '') . ' ' . ($turn['question'] ?? '');
            } elseif (is_string($turn)) {
                $content = $turn;
            }

            $entity = self::detectEntityFromText($content);
            if ($entity) {
                return $entity;
            }
        }

        return null;
    }

    /**
     * Condense a conversational query into a standalone search query.
     * Guaranteed deterministic latency (< 1 ms).
     */
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

        $activeEntity = self::extractActiveEntity($history);

        // If no prior entity could be established, cannot safely rewrite
        if (!$activeEntity) {
            return [
                'condensed_query' => $cleanQ,
                'original_query' => $cleanQ,
                'rewritten' => false,
                'entity' => null,
                'strategy' => 'passthrough_no_entity',
                'latency_ms' => round((microtime(true) - $startTime) * 1000, 3)
            ];
        }

        // Check for topic switch
        if (self::isTopicSwitch($cleanQ, $activeEntity['canonical'])) {
            return [
                'condensed_query' => $cleanQ,
                'original_query' => $cleanQ,
                'rewritten' => false,
                'entity' => $activeEntity['canonical'],
                'strategy' => 'passthrough_topic_switch',
                'latency_ms' => round((microtime(true) - $startTime) * 1000, 3)
            ];
        }

        // If already completely self-contained, pass through
        if (self::isSelfContained($cleanQ)) {
            return [
                'condensed_query' => $cleanQ,
                'original_query' => $cleanQ,
                'rewritten' => false,
                'entity' => $activeEntity['canonical'],
                'strategy' => 'passthrough_self_contained',
                'latency_ms' => round((microtime(true) - $startTime) * 1000, 3)
            ];
        }

        // Perform Deterministic Anaphora Resolution & Subject Injection
        $entityName = $activeEntity['canonical'];
        $rewritten = $cleanQ;

        // Specific pattern replacements
        $replacements = [
            // "apply to var as well?" -> "Does Temporal Dead Zone apply to var as well?"
            '/^does\s+(it|this)\s+apply\s+to\b/i' => "Does {$entityName} apply to",
            '/^can\s+(it|this)\s+be\b/i' => "Can {$entityName} be",
            '/^why\s+does\s+(it|this)\b/i' => "Why does {$entityName}",
            '/^how\s+does\s+(it|this)\b/i' => "How does {$entityName}",
            '/^what\s+happens\s+if\s+i\s+pass\s+(.*)\s+to\s+(it|this)\??$/i' => "What happens if I pass $1 to {$entityName}?",
            '/^what\s+happens\s+when\s+(it|this)\b/i' => "What happens when {$entityName}",
            '/^how\s+do\s+i\s+fix\s+(it|this)\??$/i' => "How do I fix {$entityName}?",
            '/^how\s+does\s+the\s+cleanup\s+function\s+work\??$/i' => "How does the {$entityName} cleanup function work?",
            '/^can\s+you\s+show\s+me\s+an\s+example(\s+of\s+(it|this|that))?\??$/i' => "Can you show me an example of {$entityName}?",
            '/^show\s+me\s+an\s+example(\s+of\s+(it|this|that))?\??$/i' => "Example of {$entityName}",
            '/^give\s+me\s+an\s+example(\s+of\s+(it|this|that))?\??$/i' => "Example of {$entityName}",
            '/^what\s+is\s+the\s+syntax\s+for\s+(it|this|that)\??$/i' => "What is the syntax for {$entityName}?",
            '/^is\s+(it|this)\s+(mutable|immutable|mandatory|optional|synchronous|asynchronous)\??$/i' => "Is {$entityName} $2?",
            '/^what\s+about\s+(var|let|const|grid|flexbox|3nf|jwt)\??$/i' => "$1 compared to {$entityName}",
            '/\b(this|that)\s+(hook|function|method|element|tag|feature|index|concept)\b/i' => $entityName,
            '/\bto\s+(it|this|that)\b/i' => "to {$entityName}",
            '/\bwith\s+(it|this|that)\b/i' => "with {$entityName}",
            '/\bfor\s+(it|this|that)\b/i' => "for {$entityName}",
            '/\bfrom\s+(it|this|that)\b/i' => "from {$entityName}",
            '/\bof\s+(it|this|that)\b/i' => "of {$entityName}",
            '/\bin\s+(it|this|that)\b/i' => "in {$entityName}",
            '/\b(it|this|that)\s+causes?\b/i' => "{$entityName} causes"
        ];

        $matchedRule = false;
        foreach ($replacements as $pat => $rep) {
            if (preg_match($pat, $rewritten)) {
                $rewritten = preg_replace($pat, $rep, $rewritten);
                $matchedRule = true;
                break;
            }
        }

        // Fallback: If pronoun still exists at start or middle, substitute directly or prefix
        if (!$matchedRule) {
            if (preg_match('/\b(it|this|that)\b/i', $rewritten)) {
                $rewritten = preg_replace('/\b(it|this|that)\b/i', $entityName, $rewritten, 1);
            } else {
                // Short question with omitted subject (e.g. "Any performance implications?")
                $rewritten = "{$entityName}: {$cleanQ}";
            }
        }

        $elapsed = round((microtime(true) - $startTime) * 1000, 3);

        return [
            'condensed_query' => trim($rewritten),
            'original_query' => $cleanQ,
            'rewritten' => true,
            'entity' => $entityName,
            'strategy' => 'deterministic_anaphora_resolution',
            'latency_ms' => $elapsed
        ];
    }
}
