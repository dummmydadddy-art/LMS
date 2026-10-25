<?php
// EduConnect LMS - Dynamic Feature Flags (EXP-0016)
class RagFlags {
    private static ?array $flags = null;
    private static array $requestOverrides = [];
    private static array $securityEvents = [];

    // P0: Safety-critical flags that must NEVER be disabled by arbitrary HTTP requests
    private static array $safetyCriticalFlags = [
        'ENABLE_PREMISE_VERIFIER',
        'ENABLE_CURRICULUM_BOUNDARY',
        'ENABLE_INPUT_SANITY',
        'ENABLE_DYNAMIC_K',
        'ENABLE_SEMANTIC_RERANK',
        'ENABLE_CROSS_ENCODER',
        'ENABLE_CITATION_ENFORCEMENT'
    ];

    public static function loadDefaults(): array {
        $configFile = __DIR__ . '/rag_flags.json';
        if (file_exists($configFile)) {
            $json = json_decode(file_get_contents($configFile), true);
            if (is_array($json)) {
                return $json;
            }
        }
        return [
            'ENABLE_INPUT_SANITY' => false,
            'ENABLE_TYPO_NORMALIZATION' => false,
            'ENABLE_SEMANTIC_RERANK' => false,
            'ENABLE_CROSS_ENCODER' => false,
            'ENABLE_DYNAMIC_K' => false,
            'ENABLE_ENTITY_MEMORY' => false,
            'ENABLE_PREMISE_VERIFIER' => false,
            'ENABLE_CITATION_ENFORCEMENT' => false,
            'ENABLE_CURRICULUM_BOUNDARY' => false,
            'ENABLE_RATE_LIMIT' => false,
            'ENABLE_WARMUP' => false
        ];
    }

    public static function setRequestOverrides(array $overrides): void {
        self::$requestOverrides = $overrides;
    }

    public static function resetRequestOverrides(): void {
        self::$requestOverrides = [];
    }

    public static function logSecurityEvent(string $type, array $details): void {
        $event = [
            'timestamp' => date('c'),
            'type' => $type,
            'details' => $details,
            'client_ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ];
        self::$securityEvents[] = $event;
        $logFile = __DIR__ . '/security_events.log';
        @file_put_contents($logFile, json_encode($event) . "\n", FILE_APPEND);
    }

    public static function getSecurityEvents(): array {
        return self::$securityEvents;
    }

    public static function initFromRequest(): void {
        self::$requestOverrides = [];
        $header = $_SERVER['HTTP_X_RAG_FLAGS'] ?? null;
        if ($header === null) {
            return;
        }

        // P0 Security Lockdown (EXP-0024):
        // External clients cannot arbitrarily mutate flags.
        // Must possess authoritative service key AND request must come via gateway.
        $configuredServiceKey = getenv('LMS_SERVICE_API_KEY') ?: '';
        $configuredGatewayTrust = getenv('LMS_GATEWAY_TRUST_TOKEN') ?: '';

        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $serviceKey = null;
        $gatewayTrust = null;
        foreach ($headers as $k => $v) {
            $lower = strtolower($k);
            if ($lower === 'x-service-key') $serviceKey = $v;
            if ($lower === 'x-gateway-trust') $gatewayTrust = $v;
        }
        if (!$serviceKey) $serviceKey = $_SERVER['HTTP_X_SERVICE_KEY'] ?? $_SERVER['X_SERVICE_KEY'] ?? null;
        if (!$gatewayTrust) $gatewayTrust = $_SERVER['HTTP_X_GATEWAY_TRUST'] ?? null;

        // Require both valid service key AND gateway trust (prevents direct worker bypass)
        $isAuthorizedAdmin = (
            !empty($configuredServiceKey) &&
            !empty($serviceKey) &&
            hash_equals($configuredServiceKey, $serviceKey) &&
            !empty($configuredGatewayTrust) &&
            !empty($gatewayTrust) &&
            hash_equals($configuredGatewayTrust, $gatewayTrust)
        );

        if (!$isAuthorizedAdmin) {
            self::logSecurityEvent('UNAUTHORIZED_FLAG_MUTATION_ATTEMPT', [
                'rejected_header' => $header,
                'reason' => 'Missing or invalid administrative authorization key'
            ]);
            return;
        }

        $parts = explode(',', $header);
        $parsed = [];
        foreach ($parts as $p) {
            $p = trim($p);
            if ($p === '') continue;
            if (str_contains($p, '=')) {
                [$k, $v] = explode('=', $p, 2);
                $key = trim($k);
                $val = filter_var(trim($v), FILTER_VALIDATE_BOOLEAN);

                // Safety Invariant: Safety-critical flags cannot be disabled even with service key over HTTP
                if (in_array($key, self::$safetyCriticalFlags, true) && $val === false) {
                    self::logSecurityEvent('SAFETY_CRITICAL_FLAG_DEACTIVATION_BLOCKED', [
                        'flag' => $key,
                        'rejected_value' => false
                    ]);
                    continue;
                }
                $parsed[$key] = $val;
            } else {
                $key = trim($p);
                $parsed[$key] = true;
            }
        }
        self::$requestOverrides = $parsed;
    }

    public static function isEnabled(string $flag): bool {
        if (array_key_exists($flag, self::$requestOverrides)) {
            return (bool) self::$requestOverrides[$flag];
        }
        if (self::$flags === null) {
            self::$flags = self::loadDefaults();
        }
        return (bool) (self::$flags[$flag] ?? false);
    }

    public static function get(string $flag, mixed $default = null): mixed {
        if (array_key_exists($flag, self::$requestOverrides)) {
            return self::$requestOverrides[$flag];
        }
        if (self::$flags === null) {
            self::$flags = self::loadDefaults();
        }
        return self::$flags[$flag] ?? $default;
    }

    public static function getAll(): array {
        if (self::$flags === null) {
            self::$flags = self::loadDefaults();
        }
        return array_merge(self::$flags, self::$requestOverrides);
    }
}
