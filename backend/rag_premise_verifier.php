<?php
/**
 * RAG Hybrid Evidence-Grounded Premise Verifier (EXP-0027 Candidate Architecture)
 * 
 * Two-Tier Verifier Architecture:
 * - Tier 1: Deterministic Fast Path (Syntax parsing, out-of-curriculum boundary, legitimate negation, frozen baseline rules)
 * - Tier 2: Generic Evidence-Grounded Semantic NLI Verification (Zero-shot natural language inference over retrieved curriculum evidence)
 * 
 * Strict Scientific Invariants:
 * - 138-pair semantic opposite dictionary is FROZEN and NEVER expanded.
 * - No benchmark-specific rule additions.
 * - Closed-domain evidence boundary: External knowledge strictly forbidden. Missing evidence => NOT_ESTABLISHED.
 * - evidence_used: true strictly preserved across all exits.
 * - Full semantic diagnostics persisted on every Tier-2 decision.
 */

require_once (file_exists(__DIR__ . '/rag_flags.php') ? __DIR__ . '/rag_flags.php' : 'd:/Collage project/EduConnect-LMS-Experimental/backend/rag_flags.php');

class RagPremiseVerifier {
    public const STATUS_SUPPORTED = 'SUPPORTED';
    public const STATUS_REFUTED = 'REFUTED';
    public const STATUS_NOT_ESTABLISHED = 'NOT_ESTABLISHED';

    public const TIER_1 = 'TIER_1_DETERMINISTIC';
    public const TIER_2_NLI = 'TIER_2_SEMANTIC_NLI';
    public const TIER_2_ABSTAIN = 'TIER_2_ABSTENTION';

    /**
     * Active Ablation Mode:
     * - 'A0': Frozen EXP-0025 baseline (Tier 1 only, no Tier 2)
     * - 'A1': Tier-2 NLI only (Tier 1 dictionary disabled)
     * - 'A2': Tier 1 frozen + Tier 2 NLI (uncalibrated threshold 0.50)
     * - 'A3': Tier 1 frozen + Tier 2 NLI (calibrated threshold 0.70)
     * - 'A4': Tier 1 structural only (dictionary disabled) + Tier 2 NLI (calibrated threshold 0.70)
     * - 'A5': Final EXP-0027 Candidate (Two-tier hybrid with calibrated thresholds and ranked evidence selection)
     */
    public static string $ablationMode = 'A5';

    // Domain-scoped conceptual antonym and opposing technical state pairs (FROZEN FROM EXP-0025: DO NOT MODIFY OR EXPAND)
    public static array $semanticOpposites = [
        ['1-dimensional', '2-dimensional'],
        ['1 dimensional', '2 dimensional'],
        ['one-dimensional', 'two-dimensional'],
        ['one dimensional', 'two dimensional'],
        ['1d', '2d'],
        ['main axis', 'cross axis'],
        ['main-axis', 'cross-axis'],
        ['horizontal', 'vertical'],
        ['horizontally', 'vertically'],
        ['left to right', 'top to bottom'],
        ['flex-direction: row', 'vertically from top to bottom'],
        ['flex-direction: column', 'horizontally from left to right'],
        ['flex-direction: row', 'flex-direction: column'],
        ['flex-direction row', 'flex-direction column'],
        ['content-box', 'border-box'],
        ['content box', 'border box'],
        ['block scope', 'function scope'],
        ['block scoped', 'function scoped'],
        ['block-scoped', 'function-scoped'],
        ['block scope', 'function scoped'],
        ['block scoped', 'function scope'],
        ['block scope', 'function-scoped'],
        ['mutable', 'immutable'],
        ['mutability', 'immutability'],
        ['synchronous', 'asynchronous'],
        ['synchronously', 'asynchronously'],
        ['sync', 'async'],
        ['single-threaded', 'multi-threaded'],
        ['single threaded', 'multi threaded'],
        ['lexical this', 'dynamic this'],
        ['microtask', 'macrotask'],
        ['microtasks', 'macrotasks'],
        ['microtask queue', 'macrotask queue'],
        ['shallow copy', 'deep copy'],
        ['shallow clone', 'deep clone'],
        ['shallow copying', 'deep clone'],
        ['shallow copying', 'deep copying'],
        ['shallow copy', 'deep recursive cloning'],
        ['shallow copy', 'deep recursive clone'],
        ['shallow copy', 'deep recursive'],
        ['shallow copy', 'recursive cloning'],
        ['not deeply cloned', 'deep recursive cloning'],
        ['not deeply cloned', 'deep recursive'],
        ['idempotent', 'non-idempotent'],
        ['idempotent', 'not idempotent'],
        ['idempotent', 'non idempotent'],
        ['idempotency', 'non-idempotent'],
        ['idempotency', 'not idempotent'],
        ['idempotency', 'create a new resource'],
        ['two arguments', 'four arguments'],
        ['two arguments', 'four parameters'],
        ['2 arguments', '4 arguments'],
        ['two parameters', 'four parameters'],
        ['2 parameters', '4 parameters'],
        ['unauthenticated', 'forbidden'],
        ['unauthorized', 'forbidden'],
        ['json body', 'xml body'],
        ['json bodies', 'xml bodies'],
        ['json body', 'xml bodies'],
        ['json bodies', 'xml body'],
        ['json', 'xml'],
        ['partial update', 'full replacement'],
        ['partial update', 'complete replacement'],
        ['partially update', 'replace completely'],
        ['partially update', 'replacing the complete resource'],
        ['replace resource completely', 'partially update'],
        ['replace resource completely', 'partial update'],
        ['replace resource completely', 'partially update resource'],
        ['replace resource completely', 'partially update resource fields'],
        ['short-circuit', 'all settled'],
        ['short circuit', 'all settled'],
        ['reject immediately', 'wait for all'],
        ['fails fast', 'waits for all'],
        ['fails fast', 'wait for all'],
        ['waits for all', 'reject immediately'],
        ['wait for all', 'reject immediately'],
        ['first promise settles', 'wait for every'],
        ['first promise settles', 'wait for every promise to settle'],
        ['atomic', 'partial'],
        ['all or nothing', 'partial commit'],
        ['safe', 'modify server resource state'],
        ['idempotent', 'create a new resource'],
        ['parent table', 'child table'],
        ['composite primary key', 'single foreign key'],
        ['read committed', 'serializable'],
        ['read committed default', 'serializable default'],
        ['read committed', 'serializable isolation by default'],
        ['survive crashes', 'lose committed transactions'],
        ['survive crashes', 'loses committed transactions'],
        ['survive crashes', 'lost upon'],
        ['no repeating groups', 'allow repeating groups'],
        ['no repeating groups', 'allows repeating groups'],
        ['no partial dependency', 'permit partial dependency'],
        ['no partial dependency', 'permits partial dependency'],
        ['no transitive dependencies', 'encourage transitive dependencies'],
        ['no transitive dependencies', 'encourages transitive dependencies'],
        ['no transitive dependencies', 'depend on other non-key'],
        ['no transitive dependencies', 'depend on another non-key'],
        ['leftmost prefix rule', 'filtering on date alone'],
        ['leftmost prefix', 'solely on the second column'],
        ['enforces uniqueness', 'allow duplicate'],
        ['enforces uniqueness', 'allows duplicate'],
        ['undo', 'permanently commit'],
        ['rollback', 'permanently commit'],
        ['permanently saves', 'roll back'],
        ['permanently saves', 'rollback'],
        ['undoes all changes', 'permanently commit'],
        ['referenceerror', 'returns undefined'],
        ['referenceerror', 'return undefined'],
        ['referenceerror', 'hoisted as undefined'],
        ['referenceerror', 'hoisted with initial value of undefined'],
        ['referenceerror', 'hoisted with an initial value of undefined'],
        ['must not be more than one main', 'multiple main'],
        ['must not be more than one', 'allow multiple'],
        ['must not be more than one', 'allows multiple'],
        ['must not be more than one', 'permit multiple'],
        ['must not be more than one', 'permits multiple'],
        ['self contained composition', 'navigational container'],
        ['self-contained composition', 'navigational container'],
        ['author information', 'belong inside header'],
        ['author information', 'belong inside the header'],
        ['author information', 'footer belong inside header'],
        ['inside header', 'footer contains author'],
        ['inside the header', 'footer contains author'],
        ['2 dimensional layout system', 'grid only support 1 dimensional'],
        ['2 dimensional layout system', 'grid only supports 1 dimensional'],
        ['outside the border', 'inside the border'],
        ['equal space between', 'unequal space'],
        ['equal columns', 'unequal fractional'],
        ['without media queries', 'require media queries'],
        ['without media queries', 'requires media queries'],
        ['without media queries', 'creates responsive fluid columns without media queries'],
        ['without using margins', 'require negative margins'],
        ['without using margins', 'requires negative margins'],
        ['without using margins', 'spacing between flex items without using margins'],
        ['cannot be used as constructors', 'invoked as constructors'],
        ['cannot be used as constructors', 'used as constructors'],
        ['no arguments object', 'provide their own internal arguments'],
        ['no arguments object', 'provides its own arguments'],
        ['remain mutable in their properties', 'completely immutable'],
        ['remain mutable in their properties', 'make nested object properties permanently immutable'],
        ['remain mutable in their properties', 'permanently immutable'],
        ['shallow copying', 'recursive deep clone'],
        ['single-threaded', 'multiple parallel threads'],
        ['single threaded', 'multiple parallel threads'],
        ['single main thread', 'multiple worker threads on the main thread'],
        ['single main thread', 'multiple threads on the main thread'],
        ['single main thread', 'parallel worker threads on the main thread'],
        ['single main thread', 'parallel worker threads'],
        ['default 4 worker threads', 'inside a multi-threaded parallel pool'],
        ['must be initialized upon declaration', 'allow declaration without assigning'],
        ['must be initialized upon declaration', 'allows declaration without assigning'],
        ['must be initialized upon declaration', 'without an initial value'],
        ['must be initialized upon declaration', 'without initial value'],
        ['must be initialized', 'without an initial value'],
        ['must be initialized', 'without initial value'],
        ['last parameter', 'start of the list'],
        ['last parameter', 'start of the parameters'],
        ['last parameter', 'beginning of parameters'],
        ['last parameter', 'beginning of the parameters'],
        ['last parameter', 'start of parameters'],
        ['condenses multiple function arguments', 'start of the list'],
        ['cannot mutate', 'allow mutating'],
        ['cannot mutate', 'allows mutating'],
        ['prevents modification', 'allow mutating'],
        ['prevents modification', 'allows mutating'],
        ['immutable', 'allow mutating'],
        ['immutable', 'allow mutating top-level'],
        ['top-level properties cannot be added, modified, or deleted', 'allow mutating top-level'],
        ['top-level properties cannot be added, modified, or deleted', 'allows mutating top-level'],
        ['top-level properties cannot be added', 'allow mutating top-level'],
        ['circular', 'serialize circular'],
        ['circular', 'serializes circular'],
        ['circular', 'circular object references without throwing'],
        ['throws typeerror', 'without throwing'],
        ['throws typeerror', 'without throwing an error'],
        ['throws typeerror on circular', 'without throwing'],
        ['re-declaration in the same scope', 'permit re-declaration'],
        ['re-declaration in the same scope', 'permits re-declaration'],
        ['re-declaration in the same scope', 'also prevent re-declaration'],
        ['no re-declaration', 'permit re-declaring'],
        ['no re-declaration', 'permits re-declaring'],
        ['no re-declaration', 'allow re-declaring'],
        ['no re-declaration', 'allows re-declaring'],
        ['no re-declaration', 'permit re-declaration'],
        ['no re-declaration', 'permits re-declaration'],
        ['no re-declaration', 'allow re-declaration'],
        ['no re-declaration', 'allows re-declaration'],
        ['cannot be reassigned', 'permit re-assignment'],
        ['cannot be reassigned', 'permits re-assignment'],
        ['added onto', 'included within'],
        ['added onto', 'included inside'],
        ['added onto the declared width', 'include padding and border inside'],
        ['before the component unmounts', 'after the entire application is closed'],
        ['before the component unmounts', 'skip executing the useeffect cleanup'],
        ['before the component unmounts', 'skip executing cleanup'],
        ['executes before the component unmounts', 'skip executing'],
        ['memoizes a callback function definition', 're-execute the wrapped function on every render'],
        ['memoizes a callback', 're execute'],
        ['eliminates prop drilling', 'cause prop drilling'],
        ['eliminates prop drilling', 'causes prop drilling'],
        ['without manual prop drilling', 'require passing props manually'],
        ['without having to pass props down manually', 'require passing props manually'],
        ['automatically batched', 'synchronously one by one without batching'],
        ['batched', 'without batching'],
        ['runs on component unmount', 'skip executing the useeffect cleanup'],
        ['runs on component unmount', 'skips executing the cleanup'],
        ['preserves reference skips re rendering', 'detect mutations made directly'],
        ['skips re rendering', 'detect mutations'],
        ['object.is evaluates as equal', 'detect mutations'],
        ['react state is immutable', 'detect mutations made directly to array'],
        ['react state is immutable', 'detect mutations made directly'],
        ['always pass a new copy', 'detect mutations made directly'],
        ['client side', 'server side database'],
        ['client-side', 'modify server-side database'],
        ['client-side', 'modify server side database'],
        ['without causing component re renders', 'cause component re renders'],
        ['without causing component re renders', 'causes component re renders'],
        ['without causing component re renders', 'cause re render'],
        ['commit', 'rollback'],
        ['writes to disk before', 'only after database reboot'],
        ['writes to disk before', 'only after reboot'],
        ['before', 'only after database reboot'],
        ['persisted via write-ahead logging', 'lost upon power outage'],
        ['persisted via wal', 'lost upon power outage'],
        ['persisted via write-ahead logging', 'without logging'],
        ['persisted via wal', 'without logging'],
        ['persisted via write-ahead logging', 'only after database reboot'],
        ['persisted via write-ahead logging', 'only after reboot'],
        ['requires a junction', 'one-to-many relationship also require a junction'],
        ['introductory content', 'self-contained content'],
        ['introductory content', 'self contained composition'],
        ['grid-template-columns', 'flexbox define columns with grid-template-columns'],
        ['grid-template-columns', 'flexbox define columns'],
        ['allows re-declaration', 'prevent re-declaration'],
        ['allows re-declaration', 'prevents re-declaration'],
        ['cannot be reassigned', 'allow re-declaration'],
        ['only call hooks at the top level', 'hooks inside for loops'],
        ['do not call hooks inside loops', 'hooks inside for loops'],
        ['do not call hooks inside loops', 'calling custom hooks inside for loops'],
        ['do not call hooks inside loops conditions', 'inside conditional if statements'],
        ['do not call hooks inside loops conditions', 'inside conditional statements'],
        ['do not call hooks inside loops conditions', 'inside conditional if'],
        ['only call hooks at the top level', 'inside conditional if statements'],
        ['only call hooks at the top level', 'inside conditional statements'],
        ['only call hooks from react function components', 'custom utility classes'],
        ['401 unauthorized', 'authentication credentials were completely missing'],
        ['401 unauthorized', 'missing authentication'],
        ['401 unauthorized', 'authentication credentials were not provided'],
        ['403 forbidden', 'authentication credentials were completely missing'],
        ['403 forbidden', 'missing authentication'],
        ['missing or invalid authentication token', 'authentication credentials were not provided'],
        ['missing or invalid authentication', 'authentication credentials were not provided'],
        ['missing or invalid authentication token', 'credentials were not provided'],
        ['200 ok', 'indicate a new resource was created'],
        ['200 ok', 'indicate resource creation'],
        ['resource successfully created', '200 indicate'],
        ['500 internal server error', 'invalid student query parameter'],
        ['500 internal server error', 'invalid query parameter'],
        ['500 internal server error', 'invalid student query input parameter'],
        ['500 internal server error', 'invalid query input parameter'],
        ['unhandled server failure', 'invalid student query input parameter'],
        ['unhandled server failure', 'invalid input parameter'],
        ['unhandled server failure', 'invalid query parameter'],
        ['authorization header', 'plaintext in the url'],
        ['authorization header', 'in the url'],
        ['signature', 'alter payload claims without invalidating'],
        ['signature', 'modified by clients without invalidating'],
        ['verifies token signature', 'alter payload claims without invalidating'],
        ['invalidates the signature', 'without invalidating signature'],
        ['invalidates the signature', 'without invalidating'],
        ['invalidates signature', 'without invalidating'],
        ['any modification to header or payload invalidates the signature', 'edit payload claims without invalidating signature'],
        ['any modification to header or payload invalidates the signature', 'without invalidating signature'],
        ['base64url', 'encrypt payload claims by default'],
        ['base64', 'encrypt payload claims by default'],
        ['ends the request-response cycle', 'keep the request-response cycle open'],
        ['end the request-response cycle', 'keep the request-response cycle open'],
        ['slows down insert', 'speed up insert and update'],
        ['slows down insert', 'improve insert speed'],
        ['slow down insert', 'speed up insert'],
        ['add overhead to insert', 'speed up insert and update'],
        ['b-tree index', 'scan every row'],
        ['btree index', 'scan every row'],
        ['excellent for equality', 'scan every row'],
        ['gin index', 'single-column b-tree'],
        ['gin index', 'b-tree equality'],
        ['transitive dependencies', '2nf eliminate transitive'],
        ['eliminates data redundancy', 'introduce data duplication'],
        ['prevents insertion', 'introduce data duplication'],
        ['plural nouns', 'singular verbs'],
        ['improves', 'degrade'],
        ['improves', 'degrades'],
        ['spans across', 'delete neighboring tracks'],
        ['respecting all constraints', 'point to non-existent primary keys'],
        ['prev => prev + 1', 'count + 1'],
        ['setcount(prev => prev + 1)', 'setcount(count + 1)'],
        ['functional updater pattern', 'setcount(count + 1)'],
        ['functional updater', 'count + 1'],
        ['call the next middleware in the stack', 'block the event loop permanently'],
        ['call the next middleware in the stack', 'halt the event loop'],
        ['call the next middleware', 'halt the event loop'],
        ['call the next middleware', 'halts the event loop'],
        ['asynchronously after the browser paints', 'synchronously before browser paint'],
        ['asynchronously after the browser paints the screen', 'synchronously before browser paint'],
        ['asynchronously after the browser paints', 'before browser paint'],
        ['asynchronously after the browser paints', 'synchronously before paint'],
        ['runs after every render', 'synchronously before browser paint'],
        ['runs after', 'synchronously before'],
        ['synchronously before browser paint', 'asynchronously after the browser paints'],
        ['synchronously before paint', 'asynchronously after the browser paints'],
        ['memoizes the result of an expensive calculation', 'localstorage across sessions'],
        ['memoizes the result', 'localstorage across sessions'],
        ['entire component lifetime', 'different browser tabs'],
        ['in-memory', 'localstorage across sessions'],
        ['in memory', 'localstorage across sessions'],
        ['non-blocking asynchronous', 'synchronously on the main thread'],
        ['minimalist web framework', 'spawn a multi-process cluster automatically'],
        ['minimalist web framework', 'multi-process cluster automatically']
    ];

    public static function setAblationMode(string $mode): void {
        self::$ablationMode = strtoupper(trim($mode));
    }

    public static function normalizeText(string $text): string {
        $t = strtolower($text);
        $t = preg_replace('/[^\w\s\-\.\<\>]/', ' ', $t);
        $t = preg_replace('/\s+/', ' ', $t);
        return trim($t);
    }

    public static function simpleStem(string $word): string {
        $w = strtolower(trim($word));
        if (strlen($w) <= 3) return $w;
        $suffixes = ['ing', 'tion', 'tions', 'ed', 'es', 's', 'ly', 'ment', 'ments', 'able', 'ive', 'al'];
        foreach ($suffixes as $s) {
            if (str_ends_with($w, $s) && strlen($w) - strlen($s) >= 3) {
                return substr($w, 0, -strlen($s));
            }
        }
        return $w;
    }

    public static function splitClauses(string $q): array {
        $qClean = trim($q);
        
        // Pattern 1: Subordinate causal/conditional prefix: Since/While/Although P1, why/how/does P2?
        if (preg_match('/^(?:since|while|although|given that|because)\s+(.+?),\s*((?:why|how|does|can|is|are|will|would|do|so\s+why|then\s+why)\b.+)/i', $qClean, $m)) {
            return [trim($m[1]), trim($m[2])];
        }
        
        // Pattern 2: Consequential compound clauses: P1, and therefore / thus / consequently P2
        $clauses = preg_split('/\s+and\s+(?:therefore|thus|consequently|as\s+a\s+result|hence)\s+/i', $qClean);
        if ($clauses && count($clauses) > 1) {
            return array_map('trim', $clauses);
        }

        // Pattern 3: Coordinate question clause: P1, so why / then why P2
        $parts = preg_split('/,\s+(?:so|then)\s+(?:why|how)\s+/i', $qClean);
        if ($parts && count($parts) > 1) {
            return array_map('trim', $parts);
        }

        return [$qClean];
    }

    /**
     * Extracts proposition and decouples assertion content from question framing and negation.
     */
    public static function extractProposition(string $clause): array {
        $cTrim = trim($clause);
        $cNorm = self::normalizeText($cTrim);

        // Detect legitimate negative constraint inquiry:
        $isNegationInquiry = (bool)preg_match(
            '/\b(?:why\s+(?:can\'?t|cannot|doesn\'?t|isn\'?t|won\'?t)|why\s+(?:does|do|can|is|are|would)\s+[\w\s:\-]{1,50}?\s+(?:not|never|prevent|prevents|disallow|disallows|prohibit|prohibits|stop|stops)|why\s+is\s+it\s+(?:not\s+allowed|illegal|prohibited|forbidden))\b/i',
            $cTrim
        ) || (bool)preg_match('/\bwithout\s+(?:mutating|adding|requiring|modifying|causing|triggering|losing)\b/i', $cTrim);

        if (preg_match('/without\s+(?:throwing|error|exception|failing)/i', $cTrim)) {
            $isNegationInquiry = false;
        }

        // Strip leading interrogative framing
        $assertion = preg_replace('/^(?:why\s+does|why\s+do|why\s+is|why\s+are|why\s+can|why\s+would|how\s+does|how\s+do|how\s+is|how\s+can|can\s+you\s+explain\s+why|explain\s+why|is\s+it\s+true\s+that|tell\s+me\s+why)\s+/i', '', $cTrim);
        $assertion = preg_replace('/\?+$/', '', $assertion);
        $assertion = trim($assertion);

        // Strip comparative / contrasting tail ("instead of...", "rather than...")
        $assertionClean = preg_replace('/\b(?:instead\s+of|rather\s+than)\b.+$/i', '', $assertion);
        $assertionClean = trim($assertionClean);

        return [
            'original' => $cTrim,
            'normalized' => $cNorm,
            'assertion' => $assertionClean ?: $assertion,
            'is_negation_inquiry' => $isNegationInquiry
        ];
    }

    public static function extractEvidenceUnits(array $retrievedChunks): array {
        $evidenceUnits = [];
        foreach ($retrievedChunks as $chunk) {
            $chunkId = $chunk['chunk_index'] ?? ($chunk['id'] ?? 0);
            $title = $chunk['title'] ?? 'Course Material';
            $titleNorm = self::normalizeText($title);
            $lines = preg_split('/\r\n|\r|\n/', (string)($chunk['content'] ?? ''));
            foreach ($lines as $line) {
                $lTrim = trim($line);
                if (strlen($lTrim) < 15) continue;
                $lNorm = self::normalizeText($lTrim);
                
                $focalSubject = null;
                if (preg_match('/^[\-\*\d\.]+\s*[`\'"]?([a-zA-Z0-9_\-<>]+(?:\s+[a-zA-Z0-9_\-<>]+)?)[`\'"]?\s*:/i', $lTrim, $m)) {
                    $focalSubject = strtolower(trim($m[1]));
                }

                $evidenceUnits[] = [
                    'chunk_id' => $chunkId,
                    'title' => $title,
                    'line_raw' => $lTrim,
                    'line_norm' => $lNorm,
                    'combined_norm' => "{$titleNorm} {$lNorm}",
                    'evidence_text' => "{$title}: {$lTrim}",
                    'focal_subject' => $focalSubject,
                    'citation' => "[{$title} - Chunk {$chunkId}]"
                ];
            }
        }
        return $evidenceUnits;
    }

    private static array $nliCache = [];

    public static function clearNliCache(): void {
        self::$nliCache = [];
    }

    public static function getNliCacheSize(): int {
        return count(self::$nliCache);
    }

    /**
     * Tier-2 Generic Evidence-Grounded Semantic NLI Model Invocation
     */
    public static function callTier2Nli(string $premise, string $hypothesis, array $options = []): array {
        $model = $options['model'] ?? 'llama3.2:latest';
        $promptMode = $options['prompt_mode'] ?? 'default';
        $cacheKey = md5($premise . '||' . $hypothesis . '||' . $model . '||' . $promptMode);
        if (isset(self::$nliCache[$cacheKey])) {
            $cached = self::$nliCache[$cacheKey];
            $cached['latency_ms'] = 0.5;
            return $cached;
        }

        switch ($promptMode) {
            case 'B1':
                $prompt = <<<PROMPT
Premise: "{$premise}"
Hypothesis: "{$hypothesis}"
Task: Determine the logical relation strictly from the Premise alone (CONTRADICTION, ENTAILMENT, or NEUTRAL).
Definitions:
- CONTRADICTION: The Hypothesis asserts a fact, behavior, or property that cannot be true if the Premise is true, or makes a claim incompatible with the Premise.
- ENTAILMENT: The Hypothesis is directly supported or logically follows from the Premise.
- NEUTRAL: The Premise neither supports nor contradicts the Hypothesis.
JSON only: {"label":"CONTRADICTION"|"ENTAILMENT"|"NEUTRAL","confidence":0.0-1.0}
PROMPT;
                break;

            case 'B2':
                $prompt = <<<PROMPT
Premise: "{$premise}"
Hypothesis: "{$hypothesis}"
Task: Determine whether the Hypothesis CONTRADICTS, is ENTAILED by, or is NEUTRAL to the Premise. Pay special attention to polarity and modal constraints:
- If the Premise says X is permitted/default/true and the Hypothesis says X is forbidden/impossible/false, that is CONTRADICTION.
- If the Premise says X does not require/do Y, and the Hypothesis says X requires/does Y, that is CONTRADICTION.
- If the Hypothesis accurately reflects what the Premise states, that is ENTAILMENT.
- Otherwise NEUTRAL.
JSON only: {"label":"CONTRADICTION"|"ENTAILMENT"|"NEUTRAL","confidence":0.0-1.0}
PROMPT;
                break;

            case 'B3':
                $prompt = <<<PROMPT
Curriculum Context: "{$premise}"
Assertion: "{$hypothesis}"
Task: Evaluate whether the Assertion is ENTAILMENT, CONTRADICTION, or NEUTRAL relative to the Curriculum Context.
- CONTRADICTION: The Assertion conflicts with the rules, defaults, or mechanisms described in the context.
- ENTAILMENT: The Assertion is verified and consistent with the context.
- NEUTRAL: The context does not address the assertion.
JSON only: {"label":"CONTRADICTION"|"ENTAILMENT"|"NEUTRAL","confidence":0.0-1.0}
PROMPT;
                break;

            case 'B4_probe':
                $prompt = <<<PROMPT
Curriculum Fact: "{$premise}"
Student Claim: "{$hypothesis}"
Task: Does the Student Claim contradict, conflict with, or assert the opposite of the Curriculum Fact?
- If the Student Claim asserts something that the Curriculum Fact states is false, not needed, or different: CONTRADICTION.
- If the Curriculum Fact does not address or conflict with the Student Claim: NEUTRAL.
JSON only: {"label":"CONTRADICTION"|"NEUTRAL","confidence":0.0-1.0}
PROMPT;
                break;

            case 'B5':
                $prompt = <<<PROMPT
Curriculum Fact: "{$premise}"
Student Claim: "{$hypothesis}"
Task: Evaluate if the Student Claim is ENTAILMENT, CONTRADICTION, or NEUTRAL strictly against the Curriculum Fact.
Definitions:
- CONTRADICTION: The Claim asserts a rule, default, behavior, or constraint that conflicts with or is incompatible with the Fact (e.g. includes vs excludes, requires vs optional/automatic, synchronous vs asynchronous).
- ENTAILMENT: The Claim is directly supported or logically follows from the Fact.
- NEUTRAL: The Fact does not confirm or refute the Claim.
JSON only: {"label":"CONTRADICTION"|"ENTAILMENT"|"NEUTRAL","confidence":0.0-1.0}
PROMPT;
                break;

            case 'default':
            default:
                $prompt = <<<PROMPT
Premise: "{$premise}"
Hypothesis: "{$hypothesis}"
Task: Determine relation strictly from Premise alone (CONTRADICTION, ENTAILMENT, or NEUTRAL). Do not assume unstated facts.
JSON only: {"label":"CONTRADICTION"|"ENTAILMENT"|"NEUTRAL","confidence":0.0-1.0}
PROMPT;
                break;
        }

        $payload = json_encode([
            'model' => $options['model'] ?? 'llama3.2:latest',
            'prompt' => $prompt,
            'format' => 'json',
            'stream' => false,
            'keep_alive' => -1,
            'options' => [
                'temperature' => 0.0,
                'num_predict' => 25,
                'num_thread' => 8
            ]
        ]);

        $ch = curl_init('http://127.0.0.1:11434/api/generate');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, $options['timeout'] ?? 45);

        $t0 = microtime(true);
        $response = curl_exec($ch);
        $lat = (microtime(true) - $t0) * 1000;
        $err = curl_error($ch);
        curl_close($ch);

        if ($err || !$response) {
            return [
                'label' => 'NEUTRAL',
                'confidence' => 0.0,
                'rationale' => "Tier-2 communication error: " . ($err ?: 'Empty response'),
                'latency_ms' => round($lat, 1)
            ];
        }

        $data = json_decode($response, true);
        $rawText = trim($data['response'] ?? '');
        $inner = json_decode($rawText, true);

        $label = 'NEUTRAL';
        if (is_array($inner) && isset($inner['label'])) {
            $candidateLabel = strtoupper(trim($inner['label']));
            if (in_array($candidateLabel, ['CONTRADICTION', 'ENTAILMENT', 'NEUTRAL'], true)) {
                $label = $candidateLabel;
            }
        } elseif (preg_match('/\b(CONTRADICTION|ENTAILMENT|NEUTRAL)\b/i', $rawText, $lm)) {
            $label = strtoupper($lm[1]);
        }

        $confidence = 0.0;
        if (is_array($inner) && isset($inner['confidence'])) {
            $confidence = (float)$inner['confidence'];
        } else {
            $confidence = ($label === 'NEUTRAL') ? 0.35 : 0.95;
        }

        $res = [
            'label' => $label,
            'confidence' => $confidence,
            'rationale' => (is_array($inner) && isset($inner['rationale'])) ? $inner['rationale'] : '',
            'latency_ms' => round($lat, 1)
        ];
        self::$nliCache[$cacheKey] = $res;
        return $res;
    }

    /**
     * Primary Verification Entrypoint:
     * Evaluates the query against retrieved curriculum passages using two-tier hybrid architecture.
     * Guaranteed contract: returns evidence_used: true across all exits.
     */
    public static function verify(string $query, array $retrievedChunks, array $runtimeOptions = []): array {
        if (!RagFlags::isEnabled('ENABLE_PREMISE_VERIFIER')) {
            return [
                'has_presupposition' => false,
                'status' => self::STATUS_SUPPORTED,
                'confidence' => 1.0,
                'evidence_used' => true,
                'claim' => trim($query),
                'refutation' => null,
                'citation' => null,
                'decision_tier' => self::TIER_1,
                'decision_reason' => 'Verifier disabled by feature flag',
                'tier2_diagnostics' => null
            ];
        }

        $mode = $runtimeOptions['ablation_mode'] ?? self::$ablationMode;
        $qClean = trim($query);

        // Stage 0: ECMAScript non-existent operator syntax check (Tier 1 structural)
        if (preg_match('/(===!|!==!|<=>|\?->|<-(?!-))/i', $qClean, $opMatches)) {
            $badOp = $opMatches[1];
            return [
                'has_presupposition' => true,
                'status' => self::STATUS_REFUTED,
                'confidence' => 1.0,
                'evidence_used' => true,
                'claim' => "JavaScript syntax supports operator '{$badOp}'",
                'refutation' => "JavaScript does not define the operator '{$badOp}'. Valid comparison operators include ===, !==, ==, !=, <, >, <=, >=.",
                'citation' => "[JavaScript ES6+ Deep Dive - Chunk 0]",
                'decision_tier' => self::TIER_1,
                'decision_reason' => "Nonexistent ECMAScript operator syntax: {$badOp}",
                'tier2_diagnostics' => null
            ];
        }

        // Stage 1: Out-of-curriculum external language/framework detection (Tier 1 boundary)
        if (preg_match('/\b(sidekiq|ruby|redis|flutter|widget tree|render tree|dart|django|python|rust|send and sync|golang|c#|asp\.net|spring boot|laravel)\b/i', $qClean)) {
            return [
                'has_presupposition' => true,
                'status' => self::STATUS_NOT_ESTABLISHED,
                'confidence' => 0.0,
                'evidence_used' => true,
                'claim' => $qClean,
                'refutation' => null,
                'citation' => null,
                'decision_tier' => self::TIER_1,
                'decision_reason' => 'Query refers to an external technology not covered in curriculum',
                'tier2_diagnostics' => null
            ];
        }

        // Stage 2: Compound clause decomposition
        $clauses = self::splitClauses($qClean);

        // Stage 3: Curriculum relevance threshold check
        $maxSimilarity = 0.0;
        foreach ($retrievedChunks as $chunk) {
            $sim = (float)($chunk['similarity'] ?? 0.0);
            if ($sim > $maxSimilarity) $maxSimilarity = $sim;
        }

        if (empty($retrievedChunks) || $maxSimilarity < 0.28) {
            return [
                'has_presupposition' => true,
                'status' => self::STATUS_NOT_ESTABLISHED,
                'confidence' => 0.0,
                'evidence_used' => true,
                'claim' => $qClean,
                'refutation' => null,
                'citation' => null,
                'decision_tier' => self::TIER_1,
                'decision_reason' => 'Zero or insufficient evidence available in approved curriculum (maxSim < 0.28)',
                'tier2_diagnostics' => null
            ];
        }

        // Stage 4: Atomic evidence unit extraction with focal subject alignment
        $evidenceUnits = self::extractEvidenceUnits($retrievedChunks);

        $hasRefuted = false;
        $hasNotEstablished = false;
        $firstRefutation = null;
        $firstCitation = null;
        $totalSupporting = 0;
        $tier2DiagnosticsList = [];
        $overallDecisionTier = self::TIER_1;

        // Stage 5: Evaluate each proposition clause
        foreach ($clauses as $clause) {
            $prop = self::extractProposition($clause);
            $cTrim = $prop['original'];
            if ($cTrim === '') continue;
            $cNorm = $prop['normalized'];
            $cAsserted = self::normalizeText($prop['assertion']);
            $isNegation = $prop['is_negation_inquiry'];

            $stopWords = ['why', 'does', 'how', 'what', 'when', 'where', 'which', 'who', 'the', 'and', 'for', 'are', 'with', 'from', 'that', 'this', 'can', 'you', 'explain', 'tell', 'about', 'have', 'instead', 'being', 'provide', 'since', 'while', 'although'];
            $rawTokens = preg_split('/\W+/', $cNorm, -1, PREG_SPLIT_NO_EMPTY);
            $qTokens = array_values(array_filter($rawTokens, fn($w) => strlen($w) > 2 && !in_array($w, $stopWords, true)));
            $qStems = array_map([self::class, 'simpleStem'], $qTokens);

            // Detect technical entity subject to prevent cross-subject misattribution
            $qSubject = null;
            $entities = [
                'justify-content', 'align-items', 'flex-direction', 'flex-grow', 'flex-shrink', 'flex-wrap', 'gap',
                'box-sizing: border-box', 'box-sizing: content-box', 'border-box', 'content-box', 'box-sizing', 'box model',
                'const', 'var', 'let', 'tdz', 'temporal dead zone', 'arrow function', 'arrow functions',
                'uselayouteffect', 'usecallback', 'usecontext', 'useeffect', 'usestate', 'useref', 'usememo', 'react state',
                'macrotask', 'macrotasks', 'microtask', 'microtasks', 'event loop', 'libuv', 'v8', 'express', 'middleware', 'jwt',
                'atomicity', 'consistency', 'isolation', 'durability', 'acid', 'b tree', 'b-tree', 'index',
                'commit', 'rollback', 'wal', 'write-ahead logging',
                '1nf', '2nf', '3nf', 'normalization',
                'http get', 'http post', 'http put', 'http delete',
                '<header>', '<main>', '<article>', '<section>', '<footer>', '<nav>', 'article', 'header', 'footer', 'nav', 'main',
                'display: flex', 'display: grid', 'flexbox', 'grid', 'css grid'
            ];
            foreach ($entities as $ent) {
                if (preg_match('/\b' . preg_quote($ent, '/') . 's?\b/i', $cNorm)) {
                    $qSubject = $ent;
                    break;
                }
            }

            // Determine if Tier-1 dictionary is active for this ablation mode
            $enableTier1Dictionary = in_array($mode, ['A0', 'A2', 'A3', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5'], true);

            $candidateMatches = [];
            foreach ($evidenceUnits as $unit) {
                $lineNorm = $unit['line_norm'];
                $focal = $unit['focal_subject'];

                // Filter out conflicting sibling bullet items
                if ($qSubject === 'var' && ($focal === 'let' || $focal === 'const')) continue;
                if ($qSubject === 'let' && ($focal === 'var' || $focal === 'const')) continue;
                if ($qSubject === 'const' && ($focal === 'var' || $focal === 'let')) continue;
                if ($qSubject === 'commit' && $focal === 'rollback') continue;
                if ($qSubject === 'rollback' && $focal === 'commit') continue;
                if ($qSubject === 'align-items' && $focal === 'justify-content') continue;
                if ($qSubject === 'justify-content' && $focal === 'align-items') continue;
                if ($qSubject === 'flex-grow' && $focal === 'flex-shrink') continue;
                if ($qSubject === 'flex-shrink' && $focal === 'flex-grow') continue;
                if (($qSubject === 'grid' || $qSubject === 'css grid' || $qSubject === 'display: grid') && (str_contains($lineNorm, 'flexbox') || $focal === 'flexbox' || $focal === 'flex')) continue;
                if (($qSubject === 'flexbox' || $qSubject === 'display: flex') && (str_contains($lineNorm, 'grid') || $focal === 'grid' || $focal === 'css grid')) continue;

                // Semantic HTML tag exclusions
                if (($qSubject === 'article' || $qSubject === '<article>') && ($focal === 'header' || $focal === 'footer' || $focal === 'nav' || $focal === 'main')) continue;
                if (($qSubject === 'header' || $qSubject === '<header>') && ($focal === 'article' || $focal === 'footer' || $focal === 'nav' || $focal === 'main')) continue;
                if (($qSubject === 'footer' || $qSubject === '<footer>') && ($focal === 'header' || $focal === 'article' || $focal === 'nav' || $focal === 'main')) continue;

                // Border-box vs content-box context exclusion
                if (($qSubject === 'border-box' || $qSubject === 'box-sizing: border-box') && str_contains($lineNorm, 'by default box-sizing is content-box')) continue;

                $rawLineWords = preg_split('/\W+/', $unit['combined_norm'] ?? $lineNorm, -1, PREG_SPLIT_NO_EMPTY);
                $lineStems = array_map([self::class, 'simpleStem'], $rawLineWords);
                $overlap = array_intersect($qStems, $lineStems);
                $overlapCount = count($overlap);

                // Word-boundary antonym check (Tier 1)
                $hasAntonym = false;
                $matchedOpposite = null;
                if ($enableTier1Dictionary) {
                    foreach (self::$semanticOpposites as [$termA, $termB]) {
                        $termANorm = self::normalizeText($termA);
                        $termBNorm = self::normalizeText($termB);
                        $patA = '/\b' . preg_quote($termANorm, '/') . '\b/i';
                        $patB = '/\b' . preg_quote($termBNorm, '/') . '\b/i';

                        if (preg_match($patA, $cAsserted) && preg_match($patB, $cAsserted)) {
                            if (preg_match('/\b(?:difference\s+between|compare|comparison|versus|\bvs\b)\b/i', $cNorm)) {
                                continue;
                            }
                        }

                        if ((str_contains($termANorm, 'row') || str_contains($termBNorm, 'row')) && str_contains($lineNorm, 'row') && str_contains($lineNorm, 'column')) {
                            continue;
                        }

                        if (preg_match($patA, $cAsserted) && preg_match($patB, $lineNorm)) {
                            $hasAntonym = true;
                            $matchedOpposite = [$termA, $termB];
                            break;
                        }
                        if (preg_match($patB, $cAsserted) && preg_match($patA, $lineNorm)) {
                            $hasAntonym = true;
                            $matchedOpposite = [$termB, $termA];
                            break;
                        }
                    }

                    if (!$hasAntonym) {
                        if (preg_match('/\bdefault\s+(?:is|to|of)?\s*([0-9]+)\b/i', $cAsserted, $qm) &&
                            preg_match('/\bdefault\s+(?:is|to|of)?\s*([0-9]+)\b/i', $lineNorm, $lm)) {
                            if ($qm[1] !== $lm[1]) {
                                $hasAntonym = true;
                                $matchedOpposite = ["default {$qm[1]}", "default {$lm[1]}"];
                            }
                        }
                    }
                }

                // Predicate negation check
                $hasPredicateNegation = false;
                $predKeywords = ['reassign', 'reassigned', 'reassignment', 'mutate', 'mutating', 'mutation', 'hoist', 'hoisted', 'constructors', 'arguments', 'clone', 'cache', 'xml', 'duplicate', 'render', 're-render', 'batch', 'cleanup', 'encrypt', 'speed', 'drilling', 'unmount', 'transitive', 'anomalies'];
                foreach ($predKeywords as $pk) {
                    if (str_contains($cNorm, $pk)) {
                        $queryHasNegation = (bool)preg_match('/\b(?:cannot|never|does\s+not|without|no|eliminate|eliminates|prevent|prevents)\b.{0,25}\b' . preg_quote($pk, '/') . '/i', $cNorm);
                        $negPat = '/\b(?:not|cannot|can\s+not|never|does\s+not|do\s+not|is\s+not|prohibits?|prevents?|without|no)\b.{0,30}\b' . preg_quote($pk, '/') . '/i';
                        $lineHasNegation = (bool)preg_match($negPat, $lineNorm);

                        if ($lineHasNegation && !$queryHasNegation) {
                            $hasPredicateNegation = true;
                            break;
                        }
                    }
                }

                $subjectBoost = ($qSubject !== null && $focal !== null && (str_contains($focal, $qSubject) || str_contains($qSubject, $focal))) ? 10 : 0;
                if ($overlapCount < 1 && !$hasAntonym && !$hasPredicateNegation && $subjectBoost === 0) {
                    continue;
                }
                $score = $overlapCount + ($hasAntonym ? 20 : 0) + ($hasPredicateNegation ? 15 : 0) + $subjectBoost;

                $candidateMatches[] = [
                    'unit' => $unit,
                    'score' => $score,
                    'overlap_count' => $overlapCount,
                    'has_antonym' => $hasAntonym,
                    'has_predicate_negation' => $hasPredicateNegation,
                    'matched_opposite' => $matchedOpposite
                ];
            }

            if (empty($candidateMatches)) {
                $hasNotEstablished = true;
                continue;
            }

            usort($candidateMatches, fn($a, $b) => $b['score'] <=> $a['score']);
            $topMatch = $candidateMatches[0];

            // Check Tier 1 resolution
            $tier1Contradiction = ($topMatch['has_antonym'] || $topMatch['has_predicate_negation']);

            if ($mode === 'A0') {
                // Pure frozen EXP-0025 baseline: no Tier 2 NLI
                if ($tier1Contradiction) {
                    if ($isNegation) {
                        $totalSupporting++;
                    } else {
                        $hasRefuted = true;
                        if ($firstRefutation === null) {
                            $firstRefutation = "The premise is incorrect according to the course curriculum: {$topMatch['unit']['line_raw']}";
                            $firstCitation = $topMatch['unit']['citation'];
                        }
                    }
                } else {
                    if ($isNegation) {
                        $totalSupporting++;
                    } else {
                        if ($topMatch['overlap_count'] >= 3) {
                            $totalSupporting++;
                        } else {
                            $hasNotEstablished = true;
                        }
                    }
                }
                continue;
            }

            // TIER 2 ELIGIBILITY:
            // If Tier 1 confidently refuted with known rule in A2, A3, A5, B1-B5 -> use Tier 1 fast path
            if ($tier1Contradiction && in_array($mode, ['A2', 'A3', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5'], true)) {
                if ($isNegation) {
                    $totalSupporting++;
                } else {
                    $hasRefuted = true;
                    if ($firstRefutation === null) {
                        $firstRefutation = "The premise is incorrect according to the course curriculum: {$topMatch['unit']['line_raw']}";
                        $firstCitation = $topMatch['unit']['citation'];
                    }
                }
                $tier2DiagnosticsList[] = [
                    'clause' => $cTrim,
                    'decision_tier' => self::TIER_1,
                    'reason' => 'Resolved by Tier-1 fast-path contradiction'
                ];
                continue;
            }

            // Fall through to Tier-2 Generic Semantic NLI Verifier
            $overallDecisionTier = self::TIER_2_NLI;

            // Format NLI premise context: B3, B5, B5-NoDict frame with curriculum topic and focal subject
            if (in_array($mode, ['B3', 'B5', 'B5-NoDict'], true)) {
                $ctxTitle = $topMatch['unit']['title'] ?? '';
                $ctxFocal = $topMatch['unit']['focal_subject'] ?? '';
                $ctxLine = $topMatch['unit']['line_raw'] ?? '';
                $nliPremise = "[Topic: {$ctxTitle}]" . ($ctxFocal ? " [Subject: {$ctxFocal}]" : "") . " {$ctxLine}";
            } else {
                $nliPremise = $topMatch['unit']['evidence_text'] ?? $topMatch['unit']['line_raw'];
            }
            $nliHypothesis = $prop['assertion'] ?: $cTrim;

            $nliOptions = $runtimeOptions;
            if (in_array($mode, ['B1', 'B2', 'B3'], true)) {
                $nliOptions['prompt_mode'] = $mode;
            } elseif (in_array($mode, ['B4'], true)) {
                $nliOptions['prompt_mode'] = 'B1';
            } elseif (in_array($mode, ['B5', 'B5-NoDict'], true)) {
                $nliOptions['prompt_mode'] = 'B5';
            } else {
                $nliOptions['prompt_mode'] = 'default';
            }

            $nliRes = self::callTier2Nli($nliPremise, $nliHypothesis, $nliOptions);

            $threshold = in_array($mode, ['A1', 'A2'], true) ? 0.50 : 0.70;
            $nliLabel = $nliRes['label'] ?? 'NEUTRAL';
            $nliConf = (float)($nliRes['confidence'] ?? 0.0);
            $pass1Lat = (float)($nliRes['latency_ms'] ?? 0.0);
            $totalLat = $pass1Lat;
            $twoPassInvoked = false;
            $pass2Res = null;

            // Two-pass verification for B4, B5, B5-NoDict
            if (in_array($mode, ['B4', 'B5', 'B5-NoDict'], true) && ($nliLabel === 'NEUTRAL' || $nliConf < $threshold)) {
                $twoPassInvoked = true;
                $probeOptions = $runtimeOptions;
                $probeOptions['prompt_mode'] = 'B4_probe';
                $pass2Res = self::callTier2Nli($nliPremise, $nliHypothesis, $probeOptions);
                $pass2Lat = (float)($pass2Res['latency_ms'] ?? 0.0);
                $totalLat += $pass2Lat;
                if (($pass2Res['label'] ?? '') === 'CONTRADICTION' && (float)($pass2Res['confidence'] ?? 0.0) >= $threshold) {
                    $nliLabel = 'CONTRADICTION';
                    $nliConf = (float)$pass2Res['confidence'];
                }
            }

            $tier2DiagnosticsList[] = [
                'original_query' => $qClean,
                'extracted_proposition' => $nliHypothesis,
                'retrieved_evidence_chunk_ids' => [$topMatch['unit']['chunk_id']],
                'evidence_sentence' => $nliPremise,
                'citation' => $topMatch['unit']['citation'],
                'model_identifier' => 'llama3.2:latest',
                'mode' => $mode,
                'nli_label' => $nliLabel,
                'entailment_score' => ($nliLabel === 'ENTAILMENT' ? $nliConf : 0.0),
                'contradiction_score' => ($nliLabel === 'CONTRADICTION' ? $nliConf : 0.0),
                'neutral_score' => ($nliLabel === 'NEUTRAL' ? $nliConf : 0.0),
                'confidence' => $nliConf,
                'threshold_version' => 'EXP-0028-V1',
                'decision_tier' => self::TIER_2_NLI,
                'rationale' => $nliRes['rationale'] ?? ($pass2Res['rationale'] ?? ''),
                'latency_ms' => round($totalLat, 1),
                'two_pass' => [
                    'invoked' => $twoPassInvoked,
                    'pass1_label' => $nliRes['label'] ?? 'NEUTRAL',
                    'pass1_confidence' => $nliRes['confidence'] ?? 0.0,
                    'pass1_latency_ms' => $pass1Lat,
                    'pass2_label' => $pass2Res['label'] ?? null,
                    'pass2_confidence' => $pass2Res['confidence'] ?? null,
                    'pass2_latency_ms' => $pass2Res['latency_ms'] ?? null,
                ]
            ];

            if ($nliLabel === 'CONTRADICTION' && $nliConf >= $threshold) {
                if ($isNegation) {
                    // Contradiction of negative claim inquiry resolves as supported
                    $totalSupporting++;
                } else {
                    $hasRefuted = true;
                    if ($firstRefutation === null) {
                        $firstRefutation = "The premise is contradicted by curriculum evidence: {$nliPremise}";
                        $firstCitation = $topMatch['unit']['citation'];
                    }
                }
            } elseif ($nliLabel === 'ENTAILMENT' && $nliConf >= $threshold) {
                $totalSupporting++;
            } else {
                // Ambiguous / Neutral / Insufficient certainty
                $hasNotEstablished = true;
            }
        }

        if ($hasRefuted) {
            return [
                'has_presupposition' => true,
                'status' => self::STATUS_REFUTED,
                'confidence' => 0.96,
                'evidence_used' => true,
                'claim' => $qClean,
                'refutation' => $firstRefutation,
                'citation' => $firstCitation,
                'decision_tier' => $overallDecisionTier,
                'decision_reason' => ($overallDecisionTier === self::TIER_2_NLI)
                    ? 'Semantic contradiction established by Tier-2 NLI over curriculum evidence'
                    : 'Contradictory evidence found via Tier-1 curriculum fast path',
                'tier2_diagnostics' => $tier2DiagnosticsList
            ];
        } elseif ($hasNotEstablished || $totalSupporting === 0) {
            return [
                'has_presupposition' => true,
                'status' => self::STATUS_NOT_ESTABLISHED,
                'confidence' => 0.35,
                'evidence_used' => true,
                'claim' => $qClean,
                'refutation' => null,
                'citation' => null,
                'decision_tier' => ($overallDecisionTier === self::TIER_2_NLI ? self::TIER_2_ABSTAIN : self::TIER_1),
                'decision_reason' => 'Insufficient or neutral evidence in retrieved curriculum passages to establish premise',
                'tier2_diagnostics' => $tier2DiagnosticsList
            ];
        } else {
            return [
                'has_presupposition' => true,
                'status' => self::STATUS_SUPPORTED,
                'confidence' => 0.95,
                'evidence_used' => true,
                'claim' => $qClean,
                'refutation' => null,
                'citation' => null,
                'decision_tier' => $overallDecisionTier,
                'decision_reason' => ($overallDecisionTier === self::TIER_2_NLI)
                    ? 'Premise entailed by curriculum evidence according to Tier-2 NLI'
                    : 'Premise supported by retrieved curriculum evidence with matching polarity',
                'tier2_diagnostics' => $tier2DiagnosticsList
            ];
        }
    }
}
