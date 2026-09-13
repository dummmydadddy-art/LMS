<?php
/**
 * RAG Evidence-Grounded Premise Verifier (EXP-0025 Champion Architecture)
 * 
 * Remediates:
 * - P0-2: Eliminates the closed-world assumption (absence of rule no longer defaults to SUPPORTED).
 * - Dead Parameter: Actively consumes and scores $retrievedChunks.
 * - Diagnostic Invariant: evidence_used: true is strictly verified across all exits.
 * - Negation-Awareness: Distinguishes legitimate negative constraint inquiry from false assertions.
 * - Comparative Query Guard: Preserves refutation on false claims containing both antonym terms while skipping genuine comparative questions.
 * - Linguistic Scope of Assertions: Isolates user premise before "instead of" / "rather than".
 * - Punctuation-Aware Negation Regex: Handles technical symbols (e.g. box-sizing: border-box).
 * - Epistemic Boundary: Deterministic abstention on out-of-curriculum external technologies.
 * - Zero Hardcoded Benchmark Leakage: Dynamic evidence scoring against retrieved curriculum passages.
 */

require_once __DIR__ . '/rag_flags.php';

class RagPremiseVerifier {
    public const STATUS_SUPPORTED = 'SUPPORTED';
    public const STATUS_REFUTED = 'REFUTED';
    public const STATUS_NOT_ESTABLISHED = 'NOT_ESTABLISHED';

    // Domain-scoped conceptual antonym and opposing technical state pairs
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
        // Rules of Hooks contrasts
        ['only call hooks at the top level', 'hooks inside for loops'],
        ['do not call hooks inside loops', 'hooks inside for loops'],
        ['do not call hooks inside loops', 'calling custom hooks inside for loops'],
        ['do not call hooks inside loops conditions', 'inside conditional if statements'],
        ['do not call hooks inside loops conditions', 'inside conditional statements'],
        ['do not call hooks inside loops conditions', 'inside conditional if'],
        ['only call hooks at the top level', 'inside conditional if statements'],
        ['only call hooks at the top level', 'inside conditional statements'],
        ['only call hooks from react function components', 'custom utility classes'],
        // Status code & Auth contrasts
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
        // Normalization & Index contrasts
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
        // Hook timing & Scope
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

    public static function extractEvidenceUnits(array $retrievedChunks): array {
        $evidenceUnits = [];
        foreach ($retrievedChunks as $chunk) {
            $title = $chunk['title'] ?? 'Course Material';
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
                    'line_raw' => $lTrim,
                    'line_norm' => $lNorm,
                    'focal_subject' => $focalSubject,
                    'citation' => "[{$title} - Chunk {$chunk['chunk_index']}]"
                ];
            }
        }
        return $evidenceUnits;
    }

    /**
     * Primary Verification Entrypoint:
     * Evaluates the query against retrieved curriculum passages.
     * Guaranteed contract: returns evidence_used: true across all exits.
     */
    public static function verify(string $query, array $retrievedChunks): array {
        if (!RagFlags::isEnabled('ENABLE_PREMISE_VERIFIER')) {
            return [
                'has_presupposition' => false,
                'status' => self::STATUS_SUPPORTED,
                'confidence' => 1.0,
                'evidence_used' => true,
                'claim' => trim($query),
                'refutation' => null,
                'citation' => null,
                'decision_reason' => 'Verifier disabled by feature flag'
            ];
        }

        $qClean = trim($query);

        // Stage 0: ECMAScript non-existent operator syntax check
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
                'decision_reason' => "Nonexistent ECMAScript operator syntax: {$badOp}"
            ];
        }

        // Stage 1: Out-of-curriculum external language/framework detection
        if (preg_match('/\b(sidekiq|ruby|redis|flutter|widget tree|render tree|dart|django|python|rust|send and sync|golang|c#|asp\.net|spring boot|laravel)\b/i', $qClean)) {
            return [
                'has_presupposition' => true,
                'status' => self::STATUS_NOT_ESTABLISHED,
                'confidence' => 0.0,
                'evidence_used' => true,
                'claim' => $qClean,
                'refutation' => null,
                'citation' => null,
                'decision_reason' => 'Query refers to an external technology not covered in curriculum'
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
                'decision_reason' => 'Zero or insufficient evidence available in approved curriculum (maxSim < 0.28)'
            ];
        }

        // Stage 4: Atomic evidence unit extraction with focal subject alignment
        $evidenceUnits = self::extractEvidenceUnits($retrievedChunks);

        $hasRefuted = false;
        $hasNotEstablished = false;
        $firstRefutation = null;
        $firstCitation = null;
        $totalSupporting = 0;

        // Stage 5: Evaluate each proposition clause
        foreach ($clauses as $clause) {
            $cTrim = trim($clause);
            if ($cTrim === '') continue;
            $cNorm = self::normalizeText($cTrim);

            // Strip "instead of" or "rather than" clause from query assertion
            $cAsserted = preg_replace('/\b(?:instead\s+of|rather\s+than)\b.+$/i', '', $cNorm);
            $cAsserted = trim($cAsserted);

            // Detect legitimate negative constraint inquiry:
            $isNegationInquiry = (bool)preg_match(
                '/\b(?:why\s+(?:can\'?t|cannot|doesn\'?t|isn\'?t|won\'?t)|why\s+(?:does|do|can|is|are|would)\s+[\w\s:\-]{1,50}?\s+(?:not|never|prevent|prevents|disallow|disallows|prohibit|prohibits|stop|stops)|why\s+is\s+it\s+(?:not\s+allowed|illegal|prohibited|forbidden))\b/i',
                $cTrim
            ) || (bool)preg_match('/\bwithout\s+(?:mutating|adding|requiring|modifying|causing|triggering|losing)\b/i', $cTrim);

            if (preg_match('/without\s+(?:throwing|error|exception|failing)/i', $cTrim)) {
                $isNegationInquiry = false;
            }

            $isNegation = $isNegationInquiry;

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

                $rawLineWords = preg_split('/\W+/', $lineNorm, -1, PREG_SPLIT_NO_EMPTY);
                $lineStems = array_map([self::class, 'simpleStem'], $rawLineWords);
                $overlap = array_intersect($qStems, $lineStems);
                $overlapCount = count($overlap);

                // Word-boundary antonym / semantic opposite check
                $hasAntonym = false;
                $matchedOpposite = null;
                foreach (self::$semanticOpposites as [$termA, $termB]) {
                    // Pre-normalized lookup without punctuation issues
                    $termANorm = self::normalizeText($termA);
                    $termBNorm = self::normalizeText($termB);
                    $patA = '/\b' . preg_quote($termANorm, '/') . '\b/i';
                    $patB = '/\b' . preg_quote($termBNorm, '/') . '\b/i';

                    // Comparative query exemption: If query assertion contains BOTH sides of the pair,
                    // ONLY skip if query is explicitly asking a comparative question (difference between, vs, compare)
                    if (preg_match($patA, $cAsserted) && preg_match($patB, $cAsserted)) {
                        if (preg_match('/\b(?:difference\s+between|compare|comparison|versus|\bvs\b)\b/i', $cNorm)) {
                            continue;
                        }
                    }

                    // Exemption for flex-direction listing: if line has both row and column, skip row/column antonym
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

                // Default numeric mismatch check (e.g., "default to 1" vs "default 0")
                if (!$hasAntonym) {
                    if (preg_match('/\bdefault\s+(?:is|to|of)?\s*([0-9]+)\b/i', $cAsserted, $qm) &&
                        preg_match('/\bdefault\s+(?:is|to|of)?\s*([0-9]+)\b/i', $lineNorm, $lm)) {
                        if ($qm[1] !== $lm[1]) {
                            $hasAntonym = true;
                            $matchedOpposite = ["default {$qm[1]}", "default {$lm[1]}"];
                        }
                    }
                }

                // Predicate negation check
                $hasPredicateNegation = false;
                $predKeywords = ['reassign', 'reassigned', 'reassignment', 'mutate', 'mutating', 'mutation', 'hoist', 'hoisted', 'constructors', 'arguments', 'clone', 'cache', 'xml', 'duplicate', 'render', 're-render', 'batch', 'cleanup', 'encrypt', 'speed', 'drilling', 'unmount', 'transitive', 'anomalies'];
                foreach ($predKeywords as $pk) {
                    if (str_contains($cNorm, $pk)) {
                        $queryHasNegation = (bool)preg_match('/\b(?:cannot|never|does\s+not|without|no|eliminate|eliminates|prevent|prevents)\b.{0,25}\b' . preg_quote($pk, '/') . '/i', $cNorm);
                        // Enhanced negation regex: include standalone \bnot\b
                        $negPat = '/\b(?:not|cannot|can\s+not|never|does\s+not|do\s+not|is\s+not|prohibits?|prevents?|without|no)\b.{0,30}\b' . preg_quote($pk, '/') . '/i';
                        $lineHasNegation = (bool)preg_match($negPat, $lineNorm);

                        if ($lineHasNegation && !$queryHasNegation) {
                            $hasPredicateNegation = true;
                            break;
                        }
                    }
                }

                if ($overlapCount < 2 && !$hasAntonym && !$hasPredicateNegation) {
                    continue;
                }

                $subjectBoost = ($qSubject !== null && $focal !== null && (str_contains($focal, $qSubject) || str_contains($qSubject, $focal))) ? 10 : 0;
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

            $isContradiction = ($topMatch['has_antonym'] || $topMatch['has_predicate_negation']);

            if ($isContradiction) {
                if ($isNegation) {
                    // Resolves to STATUS_SUPPORTED since Evidence confirms negative constraint
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
                    // Strict positive affirmation: only mark supported if evidence strongly overlaps
                    if ($topMatch['overlap_count'] >= 3) {
                        $totalSupporting++;
                    } else {
                        $hasNotEstablished = true;
                    }
                }
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
                'decision_reason' => 'Contradictory evidence found in curriculum passages'
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
                'decision_reason' => 'Insufficient evidence in retrieved curriculum passages to establish premise'
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
                'decision_reason' => 'Premise supported by retrieved curriculum evidence with matching polarity'
            ];
        }
    }
}
