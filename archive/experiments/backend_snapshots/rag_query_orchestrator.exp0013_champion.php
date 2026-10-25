<?php
// EduConnect LMS - Dynamic Multi-Hop K Expansion & Multi-Module Query Orchestrator (EXP-0011)
// Deterministic, lightweight classifier & orchestration engine for multi-module & multi-hop queries.

class RagQueryOrchestrator {
    /**
     * Curriculum Module Registry: canonical document mapping and domain indicators
     */
    private static array $moduleRegistry = [
        'react' => [
            'name' => 'React Frontend',
            'doc' => 'React Hooks Tutorial',
            'patterns' => [
                '/\breact\b/i',
                '/\buse(?:State|Effect|Context|Reducer|Callback|Memo|Ref)\b/i',
                '/\bcustom\s+hooks?\b/i',
                '/\brules?\s+of\s+hooks?\b/i',
                '/\bcomponent\s+lifecycles?\b/i',
                '/\bre-?renders?\b/i',
                '/\bvirtual\s+dom\b/i',
                '/\bjsx\b/i',
                '/\bprops?\b/i',
                '/\bcontrolled\s+inputs?\b/i',
                '/\bauthcontext\b/i',
                '/\berror\s+boundary\b/i'
            ]
        ],
        'node' => [
            'name' => 'Node.js & Express Backend',
            'doc' => 'Node.js & Express REST API Notes',
            'patterns' => [
                '/\bexpress(?:\.js)?\b/i',
                '/\bnode(?:\.js)?\b/i',
                '/\bmiddleware\b/i',
                '/\brouter?\b/i',
                '/\broute\s+handlers?\b/i',
                '/\breq\b/i',
                '/\bres\b/i',
                '/\bnext\s*\(\s*\)/i',
                '/\bjwt\b/i',
                '/\bjson\s+web\s+tokens?\b/i',
                '/\bbearer\s+tokens?\b/i',
                '/\bcors\b/i',
                '/\bbody-?parser\b/i',
                '/\bexpress\.json\b/i',
                '/\bbackend\s+server\b/i',
                '/\brest(?:\s*(?:apis?|routes?|endpoints?|ful))\b/i',
                '/\bhttp\s+(?:status|headers?|methods?)\b/i'
            ]
        ],
        'postgres' => [
            'name' => 'PostgreSQL Database',
            'doc' => 'PostgreSQL Database Design & Optimization',
            'patterns' => [
                '/\bpostgres(?:ql)?\b/i',
                '/\bdatabase\b/i',
                '/\bsql\b/i',
                '/\bacid\b/i',
                '/\b(?:atomicity|consistency|isolation|durability)\b/i',
                '/\bb-?tree\s+index(?:es)?\b/i',
                '/\bindexes?\b/i',
                '/\bprimary\s+keys?\b/i',
                '/\bforeign\s+keys?\b/i',
                '/\bcomposite\s+(?:primary\s+)?keys?\b/i',
                '/\b(?:1nf|2nf|3nf)\b/i',
                '/\bnormaliz(?:ation|ed|ing)\b/i',
                '/\btransitive\s+dependenc(?:y|ies)\b/i',
                '/\btransactions?\b/i',
                '/\b(?:begin|commit|rollback)\b/i',
                '/\bconnection\s+pools?\b/i',
                '/\bpg\.pool\b/i',
                '/\bexplain\s+analyze\b/i',
                '/\btable\s+scans?\b/i',
                '/\bdeadlocks?\b/i',
                '/\bparameterized\s+queries\b/i',
                '/\bunique\s+constraints?\b/i'
            ]
        ],
        'js' => [
            'name' => 'JavaScript Language & Runtime',
            'doc' => 'JavaScript ES6+ Deep Dive',
            'patterns' => [
                '/\bjavascript\b/i',
                '/\bes6(?:\+)?\b/i',
                '/\bevent\s+loop\b/i',
                '/\bcall\s+stack\b/i',
                '/\bmicrotask(?:\s+queue)?\b/i',
                '/\bmacrotask(?:\s+queue)?\b/i',
                '/\btask\s+queue\b/i',
                '/\bpromises?\b/i',
                '/\basync\s*\/\s*await\b/i',
                '/\bclosures?\b/i',
                '/\blexical\s+scop(?:e|ing)\b/i',
                '/\btemporal\s+dead\s+zone\b/i',
                '/\btdz\b/i',
                '/\barrow\s+functions?\b/i',
                '/\blexical\s+this\b/i',
                '/\bdestructuring\b/i',
                '/\bspread\s+operator\b/i',
                '/\brest\s+parameters?\b/i',
                '/\bprototype(?:\s+chain)?\b/i',
                '/\bprototypal\s+inheritance\b/i',
                '/\bconst\b/i',
                '/\blet\b/i',
                '/\bobject\.(?:freeze|is)\b/i'
            ]
        ],
        'html_css' => [
            'name' => 'HTML5 & CSS3 Fundamentals',
            'doc' => 'HTML5 & CSS3 Modern Fundamentals',
            'patterns' => [
                '/\bhtml(?:5)?\b/i',
                '/\bcss(?:3)?\b/i',
                '/\bbox\s+model\b/i',
                '/\bborder-box\b/i',
                '/\bcontent-box\b/i',
                '/\bflexbox\b/i',
                '/\bflex-direction\b/i',
                '/\bgrid\b/i',
                '/\bsemantic\s+elements?\b/i',
                '/\b<(?:main|header|nav|section|article|aside|footer)>\b/i'
            ]
        ]
    ];

    /**
     * Analyze a query for complexity, module presence, comparative intent, causal chains, and multi-hop structure.
     */
    public static function analyze(string $query): array {
        $t0 = microtime(true);

        $detectedModules = [];
        $detectedConcepts = [];

        // 1. Detect Modules and Concepts
        foreach (self::$moduleRegistry as $modKey => $modData) {
            $matchedPatterns = [];
            foreach ($modData['patterns'] as $pattern) {
                if (preg_match($pattern, $query, $matches)) {
                    $matchedPatterns[] = strtolower(trim($matches[0]));
                }
            }
            if (!empty($matchedPatterns)) {
                $detectedModules[] = $modKey;
                $detectedConcepts[$modKey] = array_values(array_unique($matchedPatterns));
            }
        }

        $moduleCount = count($detectedModules);

        // 2. Detect Comparative Intent
        $isComparative = (bool)preg_match(
            '/\b(?:difference\s+between|compare\b.+?\b(?:with|to|and)|versus|\bvs\.?\b|how\s+does\b.+?\bdiffer\s+from|trade-?offs?\s+between)\b/i',
            $query
        );

        // 3. Detect Causal Chains & Inter-Module Effects ("how does A affect/influence/trigger B")
        $isCausal = (bool)preg_match(
            '/\b(?:how\s+does\b.+?\b(?:affect|influence|cause|interact\s+with|lead\s+to|trigger)\b|when\b.+?\bhappens.+?\bwhat\s+happens\b|why\s+does\b.+?\btrigger\b)/i',
            $query
        );

        // 4. Detect Multi-Hop Sequential Dependency Patterns
        $isMultiHopPattern = (bool)preg_match(
            '/\b(?:flow\s+(?:from)?\b.+?\b(?:through|via)\b.+?\b(?:to|down\s+to|into)\b|trace\s+how\b|end-to-end\s+(?:data\s+)?flow\b|propagat(?:e|ing|ion)\s+(?:from|through)\b|orchestrat(?:e|ing|ion)\s+across\b|step-by-step\b|cross-origin\s+requests?\s+from\b.+?\bto\b)/i',
            $query
        );

        // 5. Query Classification
        if ($moduleCount >= 3 && ($isMultiHopPattern || $isCausal)) {
            $classification = 'MULTI_HOP';
        } elseif ($moduleCount >= 3) {
            $classification = 'MULTI_MODULE';
        } elseif ($moduleCount === 2) {
            $classification = $isMultiHopPattern ? 'MULTI_HOP' : 'TWO_MODULE';
        } else {
            $classification = 'SINGLE_MODULE';
        }

        // 6. Dynamic Retrieval Budget Policy
        $recommendedK = 4;
        $kPerModule = [];

        if ($classification === 'SINGLE_MODULE') {
            $recommendedK = 4;
            $primaryMod = $detectedModules[0] ?? 'general';
            $kPerModule[$primaryMod] = 4;
        } elseif ($classification === 'TWO_MODULE') {
            $recommendedK = 6;
            foreach ($detectedModules as $m) {
                $kPerModule[$m] = 3;
            }
        } elseif ($classification === 'MULTI_MODULE') {
            $recommendedK = min(8, max(6, $moduleCount * 2));
            foreach ($detectedModules as $m) {
                $kPerModule[$m] = 2;
            }
        } elseif ($classification === 'MULTI_HOP') {
            $recommendedK = min(8, max(6, $moduleCount * 2));
            foreach ($detectedModules as $m) {
                $kPerModule[$m] = 2;
            }
        }

        $latencyMs = (microtime(true) - $t0) * 1000.0;

        return [
            'classification' => $classification,
            'modules' => $detectedModules,
            'module_count' => $moduleCount,
            'concepts' => $detectedConcepts,
            'concept_count' => array_sum(array_map('count', $detectedConcepts)),
            'is_comparative' => $isComparative,
            'is_causal' => $isCausal,
            'is_multi_hop' => ($classification === 'MULTI_HOP'),
            'recommended_k' => $recommendedK,
            'k_per_module' => $kPerModule,
            'latency_ms' => round($latencyMs, 4)
        ];
    }

    /**
     * Verify module coverage across retrieved chunks.
     * Identifies covered and missing modules.
     */
    public static function verifyCoverage(array $detectedModules, array $retrievedChunks): array {
        if (empty($detectedModules)) {
            return [
                'covered_modules' => [],
                'missing_modules' => [],
                'coverage_ratio' => 1.0,
                'is_complete' => true
            ];
        }

        $docToMod = [
            'React Hooks Tutorial' => 'react',
            'Node.js & Express REST API Notes' => 'node',
            'PostgreSQL Database Design & Optimization' => 'postgres',
            'PostgreSQL Database Design' => 'postgres',
            'JavaScript ES6+ Deep Dive' => 'js',
            'HTML5 & CSS3 Modern Fundamentals' => 'html_css'
        ];

        $coveredModules = [];
        foreach ($retrievedChunks as $chunk) {
            $title = $chunk['title'] ?? '';
            foreach ($docToMod as $docName => $modKey) {
                if (stripos($title, $docName) !== false || stripos($docName, $title) !== false) {
                    $coveredModules[$modKey] = true;
                }
            }
        }

        $coveredList = array_keys($coveredModules);
        $missingList = array_values(array_diff($detectedModules, $coveredList));
        $coverageRatio = count($detectedModules) > 0 ? count($coveredList) / count($detectedModules) : 1.0;

        return [
            'covered_modules' => $coveredList,
            'missing_modules' => $missingList,
            'coverage_ratio' => round($coverageRatio, 4),
            'is_complete' => empty($missingList)
        ];
    }

    /**
     * Generate a targeted secondary search query specifically for a missing module.
     */
    public static function getTargetedQueryForModule(string $moduleKey, string $originalQuery): string {
        $modInfo = self::$moduleRegistry[$moduleKey] ?? null;
        if (!$modInfo) {
            return $originalQuery;
        }

        $docTitle = $modInfo['doc'];
        
        $relevantTerms = [];
        foreach ($modInfo['patterns'] as $pattern) {
            if (preg_match_all($pattern, $originalQuery, $matches)) {
                foreach ($matches[0] as $m) {
                    $relevantTerms[] = trim($m);
                }
            }
        }

        $relevantTerms = array_unique($relevantTerms);
        if (!empty($relevantTerms)) {
            return $docTitle . ' ' . implode(' ', $relevantTerms);
        }

        return $docTitle . ' ' . $modInfo['name'];
    }

    /**
     * Build an evidence graph linking detected modules to retrieved chunks.
     */
    public static function buildEvidenceGraph(array $detectedModules, array $retrievedChunks): array {
        $docToMod = [
            'React Hooks Tutorial' => 'react',
            'Node.js & Express REST API Notes' => 'node',
            'PostgreSQL Database Design & Optimization' => 'postgres',
            'PostgreSQL Database Design' => 'postgres',
            'JavaScript ES6+ Deep Dive' => 'js',
            'HTML5 & CSS3 Modern Fundamentals' => 'html_css'
        ];

        $graph = [];
        foreach ($detectedModules as $mod) {
            $graph[$mod] = [
                'name' => self::$moduleRegistry[$mod]['name'] ?? $mod,
                'doc' => self::$moduleRegistry[$mod]['doc'] ?? '',
                'chunks' => []
            ];
        }

        foreach ($retrievedChunks as $chunk) {
            $title = $chunk['title'] ?? '';
            foreach ($docToMod as $docName => $modKey) {
                if ((stripos($title, $docName) !== false || stripos($docName, $title) !== false) && isset($graph[$modKey])) {
                    $graph[$modKey]['chunks'][] = [
                        'chunk_id' => $chunk['id'] ?? null,
                        'chunk_index' => $chunk['chunk_index'] ?? null,
                        'title' => $title,
                        'similarity' => $chunk['similarity'] ?? 0.0
                    ];
                }
            }
        }

        $groundedModules = 0;
        $ungroundedModules = [];
        foreach ($graph as $mod => $data) {
            if (!empty($data['chunks'])) {
                $groundedModules++;
            } else {
                $ungroundedModules[] = $mod;
            }
        }

        $totalModules = count($detectedModules);
        $isFullyGrounded = ($totalModules > 0 && $groundedModules === $totalModules);

        return [
            'graph' => $graph,
            'is_fully_grounded' => $isFullyGrounded,
            'grounded_modules_count' => $groundedModules,
            'total_modules_count' => $totalModules,
            'ungrounded_modules' => $ungroundedModules
        ];
    }
}
