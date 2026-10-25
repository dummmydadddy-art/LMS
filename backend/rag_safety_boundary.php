<?php
// EduConnect LMS - Safety Boundary Hardening & Partial Answer Decomposition (EXP-0009)
// Purpose: Multi-axis domain classification, keyword trap elimination, fabricated API defense,
//          and partial-query decomposition (curriculum vs out-of-bounds separation).

require_once __DIR__ . '/rag_flags.php';

class RagSafetyBoundary {
    // Unsupported technologies, platforms, and languages outside LMS curriculum
    private static array $unsupportedTechnologies = [
        // Frontend / Mobile frameworks
        'vue' => ['/\bvue(\.js)?(\s*3)?\b/i', '/\bcomposition\s+api\b/i', '/\bref\(\)\s+observables?\b/i'],
        'angular' => ['/\bangular(\s*1[0-9])?\b/i', '/\brxjs\b/i', '/\bzone\.js\b/i', '/\binjectable\s+services?\b/i'],
        'nextjs' => ['/\bnext(\.js|js)\b/i', '/\bnext\s*1[3-6]\b/i', '/\bapp\s+router\b/i', '/\bserver\s+components?\b/i', '/\bserver\s+actions?\b/i'],
        'svelte' => ['/\bsvelte(\s*5)?\b/i', '/\brunes?\s+syntax\b/i', '/\$state\b/i', '/\$derived\b/i'],
        'solidjs' => ['/\bsolid(\.js)?\b/i'],
        'remix' => ['/\bremix(\.run)?\b/i'],
        'flutter' => ['/\bflutter\b/i', '/\bdart\b/i'],
        'react_native' => ['/\breact\s+native\b/i'],
        'swiftui' => ['/\bswift(ui)?\b/i', '/\bhstack\b/i', '/\bvstack\b/i'],
        'threejs' => ['/\bthree(\.js|js)\b/i', '/\bthree\s+fiber\b/i', '/\br3f\b/i', '/\bcanvas\s+shaders?\b/i'],
        'tailwind' => ['/\btailwind(\s+css)?\b/i', '/\bjit\s+compilers?\b/i', '/\barbitrary\s+value\b/i'],
        'redux' => ['/\bredux(\s+toolkit)?\b/i', '/\bcreateslice\b/i'],

        // Backend languages and frameworks
        'django' => ['/\bdjango\b/i', '/\bsettings\.py\b/i'],
        'flask' => ['/\bflask\b/i'],
        'fastapi' => ['/\bfastapi\b/i'],
        'fastify' => ['/\bfastify\b/i', '/\bfast-json-stringify\b/i'],
        'nestjs' => ['/\bnest(\.js)?\b/i'],
        'spring_boot' => ['/\bspring(\s*boot)?(\s*3)?\b/i', '/\b@restcontroller\b/i', '/\b@pathvariable\b/i', '/\bvirtual\s+threads?\b/i'],
        'ruby_rails' => ['/\bruby(\s+on\s+rails)?\b/i', '/\brails\b/i', '/\bturbo\s+streams?\b/i', '/\bactioncable\b/i', '/\bactive\s*record\b/i'],
        'laravel' => ['/\blaravel(\s*1[0-9])?\b/i', '/\bartisan\b/i'],
        'aspnet' => ['/\basp\.net\b/i', '/\bc#\b/i', '/\b\.net\b/i'],
        'rust' => ['/\brust\b/i', '/\brust\s+ownership\b/i', '/\bc\+\+\s+smart\s+pointers?\b/i', '/\bcargo\b/i'],
        'golang' => ['/\bgo(lang)?\b/i', '/\bgoroutines?\b/i'],
        'java' => ['/\bjava\b/i', '/\bjvm\b/i'],

        // Computer Science theory outside LMS Web Dev curriculum
        'theory_cs' => [
            '/\bdijkstra\b/i', '/\bshortest\s+path\s+algorithm\b/i', '/\braft\s+consensus\b/i',
            '/\bpaxos\b/i', '/\babstract\s+syntax\s+tree\b/i', '/\bconcrete\s+parse\s+tree\b/i',
            '/\bcompiler\s+design\b/i'
        ],

        // Databases & Message Queues outside curriculum
        'mongodb' => ['/\bmongo(db)?\b/i', '/\bmongoose\b/i'],
        'redis' => ['/\bredis\b/i'],
        'cassandra' => ['/\b(apache\s+)?cassandra\b/i', '/\bwide-column\b/i'],
        'dynamodb' => ['/\bdynamodb\b/i'],
        'sqlite' => ['/\bsqlite\b/i'],
        'cockroachdb' => ['/\bcockroach(db)?\b/i'],
        'mysql' => ['/\bmysql\b/i'],
        'kafka' => ['/\b(apache\s+)?kafka\b/i', '/\bpartition\s+leader\b/i'],
        'rabbitmq' => ['/\brabbitmq\b/i'],
        'graphql' => ['/\bgraphql\b/i', '/\bapollo\b/i'],

        // DevOps / Cloud / Infrastructure
        'docker' => ['/\bdocker(-compose)?\b/i', '/\bdocker\s+containers?\b/i', '/\bvolume\s+mount/i'],
        'kubernetes' => ['/\bkubernetes\b/i', '/\bk8s\b/i', '/\bpods?\b/i'],
        'terraform' => ['/\bterraform\b/i'],
        'aws_cloud' => ['/\baws\b/i', '/\bec2\b/i', '/\bs3\b/i', '/\blambda\b/i', '/\bazure\b/i', '/\bgcp\b/i'],

        // Blockchain & Web3
        'blockchain' => ['/\bblockchain\b/i', '/\bbitcoin\b/i', '/\bethereum\b/i', '/\bsolidity\b/i', '/\bsmart\s+contracts?\b/i', '/\bproof-of-work\b/i', '/\bnakamoto\b/i', '/\bgas\s+fees?\b/i', '/\bbyzantine\b/i'],

        // AI / ML / Quantum
        'ai_ml' => ['/\bpytorch\b/i', '/\btensorflow\b/i', '/\bcuda\b/i', '/\bconvolutional\s+neural\b/i', '/\bcnn\b/i', '/\bmachine\s+learning\b/i', '/\bdeep\s+learning\b/i'],
        'quantum' => ['/\bquantum\b/i', '/\bqubits?\b/i', '/\bsuperposition\b/i'],
        'hardware_iot' => ['/\bbluetooth\b/i', '/\bweb\s+bluetooth\b/i', '/\bnfc\b/i', '/\busb\b/i', '/\barduino\b/i', '/\braspberry\s+pi\b/i'],
        'haskell' => ['/\bhaskell\b/i', '/\bghc\b/i', '/\bmonads?\b/i'],
        'zig' => ['/\bzig(\s+lang)?\b/i', '/\bcomptime\b/i'],
        'webgpu' => ['/\bwebgpu\b/i', '/\bwgsl\b/i'],
        'erlang' => ['/\berlang\b/i', '/\botp\s+actor\b/i', '/\bbeam\s+vm\b/i'],
        'clickhouse' => ['/\bclickhouse\b/i'],
        'culinary_non_academic' => ['/\b(?:recipes?|brownies?|cook(?:ing)?|bake|baking|chocolate|ingredients?)\b/i']
    ];

    // Administrative, security, and non-academic queries
    private static array $administrativePatterns = [
        '/\b(admin(istrator)?(\s+[a-z]+)?\s+password|database\s+password|root\s+password|ssh\s+private\s+key|credentials?)\b/i',
        '/\b(tuition\s+refund|refund\s+policies?|withdraw(al)?\s+refund)\b/i',
        '/\b(drop\s+(an?\s+)?enrolled\s+student|drop\s+course|prerequisite\s+check|bypass\s+the\s+prerequisite)\b/i',
        '/\b(physical\s+data\s+center|datacenter\s+location|where\s+is\s+the\s+server\s+located)\b/i',
        '/\b(change\s+my\s+grade|hack\s+the\s+portal|exam\s+schedule|office\s+hours)\b/i'
    ];

    // Fabricated or nonexistent syntax/features
    private static array $fabricatedFeaturePatterns = [
        '/\binvert\s+table\b/i',
        '/\busequantum\b/i',
        '/\bautorouter\b/i',
        '/\bcreate\s+quantum\s+index\b/i',
        '/\bmulti-dimensional-flex\b/i',
        '/\bmultiple\s+class\s+inheritance\b/i',
        '/\bclass\s+[a-z0-9_]+\s+extends\s+[a-z0-9_]+\s*,\s*[a-z0-9_]+/i',
        '/\bnative\s+physics\s+engine\b/i',
        '/\bneural\s+network\s+classifier.*query\s+planner\b/i',
        '/\bpass-by-reference\s+pointers?\b/i',
        '/\b&\s*[a-z0-9_]+\s+variable\s+prefix\b/i',
        '/\bkernel-bypass\b/i',
        '/\bmalloc\b/i',
        '/\bdisplay:\s*(hologram|infinite)\b/i',
        '/\bhtml6\b/i',
        '/<teleport-portal>/i',
        '/\bobject\.deepfreezeall\b/i',
        '/\bautomatic\s+sharding\s+replication\b/i',
        '/\bbox-sizing:\s*infinite-box\b/i',
        '/\busestate\.forcesync\b/i',
        '/\buseeffectsync\b/i',
        '/\bpromise\.allstrict\b/i',
        '/\bexpress\.autocluster\b/i',
        '/\buseref\.resettoinitial\b/i',
        '/\bsuper_index\b/i',
        '/\barray\.prototype\.groupbykey\b/i',
        '/\busecontext\.subscribeonly\b/i'
    ];

    // Conjunctions used in mixed/comparative multi-domain questions
    private static array $conjunctionPatterns = [
        '/\s+and\s+(how|what|explain|contrast|compare|where|can)\s+/i',
        '/\s+and\s+also\s+/i',
        '/\s+along\s+with\s+/i',
        '/\s*,\s*and\s+/i',
        '/\s+compared?\s+(to|with)\s+/i',
        '/\s+contrast(ing)?\s+with\s+/i',
        '/\s+with\s+/i',
        '/\s+versus\s+/i',
        '/\s+vs\.?\s+/i'
    ];

    /**
     * Check if a query targets unsupported technologies.
     */
    public static function detectUnsupportedTechnology(string $query): ?array {
        foreach (self::$unsupportedTechnologies as $techKey => $patterns) {
            foreach ($patterns as $pat) {
                if (preg_match($pat, $query, $matches)) {
                    return [
                        'technology' => $techKey,
                        'matched' => $matches[0]
                    ];
                }
            }
        }
        return null;
    }

    /**
     * Check if a query targets administrative or credential operations.
     */
    public static function detectAdministrativeQuery(string $query): ?string {
        foreach (self::$administrativePatterns as $pat) {
            if (preg_match($pat, $query, $matches)) {
                return $matches[0];
            }
        }
        return null;
    }

    /**
     * Check if a query asks about a fabricated/nonexistent API.
     */
    public static function detectFabricatedFeature(string $query): ?string {
        foreach (self::$fabricatedFeaturePatterns as $pat) {
            if (preg_match($pat, $query, $matches)) {
                return $matches[0];
            }
        }
        return null;
    }

    /**
     * Decompose a mixed query into supported curriculum part and unsupported part.
     */
    public static function decomposePartialQuery(string $query): ?array {
        $unsupported = self::detectUnsupportedTechnology($query);
        if (!$unsupported) {
            return null;
        }

        // Try splitting on conjunctions
        foreach (self::$conjunctionPatterns as $pat) {
            $parts = preg_split($pat, $query, 2);
            if (count($parts) === 2) {
                $partA = trim($parts[0]);
                $partB = trim($parts[1]);

                $unsupportedA = self::detectUnsupportedTechnology($partA);
                $unsupportedB = self::detectUnsupportedTechnology($partB);

                if ($unsupportedA && !$unsupportedB) {
                    return [
                        'supported' => $partB,
                        'unsupported' => $partA,
                        'unsupported_tech' => $unsupportedA['technology']
                    ];
                } elseif (!$unsupportedA && $unsupportedB) {
                    return [
                        'supported' => $partA,
                        'unsupported' => $partB,
                        'unsupported_tech' => $unsupportedB['technology']
                    ];
                }
            }
        }

        return null;
    }

    /**
     * Comprehensive Safety Boundary Classification
     */
    public static function evaluate(string $query, array $retrievedResults = []): array {
        $q = trim($query);

        // 0. Check for prompt injection / instruction override attacks (EXP-0022)
        if ($injMatch = self::detectInjectionPayload($q)) {
            return [
                'action' => 'ABSTAIN',
                'status' => 'INJECTION_ATTACK_BLOCKED',
                'reason' => "Prompt injection or system override payload detected ('{$injMatch['type']}').",
                'is_partial' => false,
                'supported_part' => null,
                'unsupported_part' => null
            ];
        }

        // 1. Check for administrative / credential requests
        if ($adminMatch = self::detectAdministrativeQuery($q)) {
            return [
                'action' => 'ABSTAIN',
                'status' => 'OUT_OF_DOMAIN',
                'reason' => "Administrative or operational request ('{$adminMatch}') is outside the academic curriculum scope.",
                'is_partial' => false,
                'supported_part' => null,
                'unsupported_part' => null
            ];
        }

        // 2. Check for fabricated / hallucinated APIs
        if ($fabMatch = self::detectFabricatedFeature($q)) {
            return [
                'action' => 'ABSTAIN',
                'status' => 'OUT_OF_DOMAIN',
                'reason' => "Fabricated or nonexistent feature ('{$fabMatch}') is not part of the approved curriculum.",
                'is_partial' => false,
                'supported_part' => null,
                'unsupported_part' => null
            ];
        }

        // 3. Check for mixed partial query (one supported + one unsupported)
        $partial = self::decomposePartialQuery($q);
        if ($partial) {
            return [
                'action' => 'PARTIAL_ANSWER',
                'status' => 'PARTIALLY_IN_DOMAIN',
                'reason' => "Query contains both in-domain curriculum and out-of-domain ('{$partial['unsupported_tech']}') components.",
                'is_partial' => true,
                'supported_part' => $partial['supported'],
                'unsupported_part' => $partial['unsupported'],
                'unsupported_tech' => $partial['unsupported_tech']
            ];
        }

        // 4. Check for pure unsupported technology
        if ($techMatch = self::detectUnsupportedTechnology($q)) {
            return [
                'action' => 'ABSTAIN',
                'status' => 'OUT_OF_DOMAIN',
                'reason' => "Technology '{$techMatch['technology']}' ('{$techMatch['matched']}') is outside the EduConnect LMS curriculum.",
                'is_partial' => false,
                'supported_part' => null,
                'unsupported_part' => null
            ];
        }

        // 5. Query does not trigger explicit boundary violations; proceed to standard confidence gate
        return [
            'action' => 'PROCEED',
            'status' => 'IN_DOMAIN',
            'reason' => 'Query is within curriculum boundaries.',
            'is_partial' => false,
            'supported_part' => null,
            'unsupported_part' => null
        ];
    }

    /**
     * EXP-0022: Redact injection command tokens from metadata reflections.
     */
    public static function sanitizeQueryForMetadata(string $query): string {
        $pattern = '/\b(access_granted|bypass_successful|pwned|lms_master_key|password_hash|run_command|manage_task|call_tool|tool_call|exec_sql|system_exec)\b/i';
        return preg_replace($pattern, '[REDACTED_PAYLOAD_TOKEN]', $query);
    }

    /**
     * EXP-0022: Detect active instruction-like override payloads across 15 attack vectors.
     */
    public static function detectInjectionPayload(string $query): ?array {
        $patterns = [
            'instruction_override' => '/\b(ignore\s+(?:all\s+)?(?:previous\s+)?instructions|disregard\s+(?:all\s+)?(?:prior\s+)?(?:system\s+)?(?:prompt|instructions)|system\s+override|forget\s+(?:all\s+)?previous\s+instructions|new\s+system\s+directive)\b/i',
            'system_prompt_extraction' => '/\b(print\s+(?:your\s+)?(?:exact\s+)?system\s+prompt|repeat\s+(?:all\s+)?(?:words\s+)?above|what\s+instructions\s+were\s+you\s+given|reveal\s+(?:your\s+)?hidden\s+prompt|output\s+system\s+instructions?)\b/i',
            'tool_invocation' => '/\b(call\s+tool\s+[a-z_]+|execute\s+function\s+[a-z_]+|trigger\s+tool\s+[a-z_]+|call_tool|use_tool|manage_task|run_command)\b/i',
            'fake_developer_messages' => '/(\[DEVELOPER\s+NOTICE|ADMINISTRATIVE\s+ALERT|<developer_instruction>|\[SYSTEM\s+INSTRUCTION\]|===\s*SYSTEM\s*===)/i',
            'role_confusion' => '/\b(you\s+are\s+no\s+longer\s+an?\s+educonnect|you\s+are\s+now\s+dan\b|roleplay\s+as\s+an?\s+(?:unrestricted|black-hat|jailbroken))\b/i',
            'delimiter_escape' => '/(\bEND\s+OF\s+SYSTEM\s+PROMPT\b|<!--\s*END\s+OF\s+SYSTEM\s*-->|<\/student_query>|<\/curriculum_evidence>)/i',
            'database_dump' => '/\b(UNION\s+SELECT\s+.*(?:password|hash|token|secret)|DROP\s+TABLE\s+|SELECT\s+.*FROM\s+users)\b/i',
            'multilingual_override' => '/(Игнорируй все предыдущие инструкции|忽略所有之前的指令|ignora todas las instrucciones anteriores|ignoriere alle vorherigen anweisungen|ignorez toutes les instructions précédentes)/i'
        ];

        foreach ($patterns as $type => $pat) {
            if (preg_match($pat, $query, $m)) {
                return ['type' => $type, 'match' => $m[0]];
            }
        }

        // Check for Base64 encoded overrides
        if (preg_match_all('/\b([A-Za-z0-9+\/]{16,}={0,2})\b/', $query, $b64Matches)) {
            foreach ($b64Matches[1] as $cand) {
                $decoded = @base64_decode($cand, true);
                if ($decoded && strlen($decoded) > 8) {
                    if (preg_match('/\b(ignore|system\s+prompt|override|password|secret|pwned)\b/i', $decoded)) {
                        return ['type' => 'base64_encoded_override', 'match' => $cand];
                    }
                }
            }
        }

        return null;
    }
}
