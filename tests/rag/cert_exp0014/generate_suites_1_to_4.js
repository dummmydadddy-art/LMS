// EXP-0014: Dataset Generator for Suites 1-4
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname);

// Course modules & section ground-truth metadata
const MODULES = {
  HTML: 'HTML & CSS Fundamentals',
  JS: 'JavaScript ES6+ Deep Dive',
  REACT: 'React Hooks Tutorial',
  NODE: 'Node.js & Express REST API Notes',
  PG: 'PostgreSQL Database Design'
};

// ============================================================================
// SUITE 1: 510 LARGE BLIND QUERIES (12 Categories)
// ============================================================================
console.log('Generating Suite 1: Large Blind Benchmark (510 queries)...');
const categories = [
  'direct_factual',
  'conceptual',
  'procedural',
  'api_usage',
  'comparison',
  'troubleshooting',
  'code_oriented',
  'rare_terminology',
  'short_queries',
  'long_queries',
  'ambiguous_queries',
  'natural_student_questions'
];

const suite1Queries = [];
let qId = 1;

// Helper to add query
function addS1(category, query, doc, section, keyword) {
  suite1Queries.push({
    id: `exp14_s1_${String(qId++).padStart(4, '0')}`,
    category,
    query,
    expected_doc: doc,
    expected_section: section,
    expected_keyword: keyword
  });
}

// 1. Direct factual (45 queries)
const factualTemplates = [
  ['What is the default box-sizing property in CSS?', MODULES.HTML, 'CSS Box Model', 'content-box'],
  ['Which HTML5 element represents the main content of a document?', MODULES.HTML, 'HTML5 Semantic Elements', '<main>'],
  ['What does justify-content control in Flexbox?', MODULES.HTML, 'CSS Flexbox Layout Guide', 'main axis'],
  ['What unit represents fractional space in CSS Grid?', MODULES.HTML, 'CSS Grid System', 'fr'],
  ['Which variable declaration in ES6 is function-scoped?', MODULES.JS, 'Variable Declarations & Scoping', 'var'],
  ['What is the Temporal Dead Zone in JavaScript?', MODULES.JS, 'Variable Declarations & Scoping', 'TDZ'],
  ['Do arrow functions have their own this binding?', MODULES.JS, 'Arrow Functions & Lexical this', 'lexical this'],
  ['What does Promise.all return when one promise rejects?', MODULES.JS, 'Asynchronous JavaScript & Promises', 'rejects immediately'],
  ['What are the two rules of React Hooks?', MODULES.REACT, 'React Hooks Overview & Rules', 'top level'],
  ['What does useState return?', MODULES.REACT, 'useState Hook', 'array with two elements'],
  ['When does the useEffect cleanup function run?', MODULES.REACT, 'useEffect Hook', 'before unmount'],
  ['What does useContext take as its argument?', MODULES.REACT, 'useContext & State Propagation', 'context object'],
  ['What is the return value of useRef?', MODULES.REACT, 'useRef Hook', 'current'],
  ['What C++ library provides the event loop in Node.js?', MODULES.NODE, 'Node.js Architecture & Event Loop', 'Libuv'],
  ['What arguments does an Express middleware function take?', MODULES.NODE, 'Middleware in Express', 'req, res, next'],
  ['What HTTP status code represents resource creation?', MODULES.NODE, 'RESTful API Design Principles', '201 Created'],
  ['What are the three parts of a JWT token?', MODULES.NODE, 'JWT Authentication', 'header, payload, signature'],
  ['What does 1NF require in database normalization?', MODULES.PG, 'Database Normalization Forms', 'atomic values'],
  ['What tree structure is standard for PostgreSQL indexes?', MODULES.PG, 'Indexing Strategies & Performance', 'B-tree'],
  ['What does the C stand for in ACID transactions?', MODULES.PG, 'ACID Transactions', 'Consistency'],
  ['What tag represents introductory navigational links in HTML5?', MODULES.HTML, 'HTML5 Semantic Elements', '<header>'],
  ['What is the property to wrap flex items onto multiple lines?', MODULES.HTML, 'CSS Flexbox Layout Guide', 'flex-wrap'],
  ['How do you define explicit columns in CSS Grid?', MODULES.HTML, 'CSS Grid System', 'grid-template-columns'],
  ['Can const variables be reassigned in JavaScript?', MODULES.JS, 'Variable Declarations & Scoping', 'reassignment'],
  ['What operator collects remaining parameters into an array?', MODULES.JS, 'Destructuring, Spread & Rest Operators', 'rest'],
  ['Which queue handles Promise callbacks in the event loop?', MODULES.JS, 'Asynchronous JavaScript & Promises', 'microtask queue'],
  ['Can React hooks be called inside nested if conditions?', MODULES.REACT, 'React Hooks Overview & Rules', 'do not call hooks inside loops'],
  ['How do you update state based on previous state in React?', MODULES.REACT, 'useState Hook', 'functional updater'],
  ['What happens if useEffect has an empty dependency array?', MODULES.REACT, 'useEffect Hook', 'runs once on mount'],
  ['Which hook memoizes expensive function calculations?', MODULES.REACT, 'Performance Hooks: useMemo & useCallback', 'useMemo'],
  ['Does updating a useRef object trigger a component re-render?', MODULES.REACT, 'useRef Hook', 'does not trigger re-render'],
  ['Is Node.js single-threaded for JavaScript execution?', MODULES.NODE, 'Node.js Architecture & Event Loop', 'single-threaded'],
  ['What function must middleware call to pass control forward?', MODULES.NODE, 'Middleware in Express', 'next()'],
  ['What HTTP status code indicates unauthorized access in REST?', MODULES.NODE, 'RESTful API Design Principles', '401 Unauthorized'],
  ['Where is JWT signature verified in backend servers?', MODULES.NODE, 'JWT Authentication', 'secret key'],
  ['What normalization form removes transitive functional dependencies?', MODULES.PG, 'Database Normalization Forms', '3NF'],
  ['What SQL command rolls back an aborted transaction?', MODULES.PG, 'ACID Transactions', 'ROLLBACK'],
  ['What constraint ensures unique rows in a relational table?', MODULES.PG, 'Relational Database Modeling', 'PRIMARY KEY'],
  ['What command reveals index scans in PostgreSQL query execution?', MODULES.PG, 'Indexing Strategies & Performance', 'EXPLAIN ANALYZE'],
  ['What HTML5 tag wraps self-contained syndicatable content?', MODULES.HTML, 'HTML5 Semantic Elements', '<article>'],
  ['What does align-items control in CSS Flexbox?', MODULES.HTML, 'CSS Flexbox Layout Guide', 'cross axis'],
  ['How does object destructuring assign default values?', MODULES.JS, 'Destructuring, Spread & Rest Operators', 'default value'],
  ['What hook memoizes callback function definitions?', MODULES.REACT, 'Performance Hooks: useMemo & useCallback', 'useCallback'],
  ['What method defines a global context provider component in React?', MODULES.REACT, 'useContext & State Propagation', 'Context.Provider'],
  ['What does 2NF eliminate in database normalization?', MODULES.PG, 'Database Normalization Forms', 'partial dependency']
];
factualTemplates.forEach(t => addS1('direct_factual', t[0], t[1], t[2], t[3]));

// 2. Conceptual (45 queries)
const conceptualTemplates = [
  ['Explain how CSS box-sizing border-box simplifies responsive layout calculations', MODULES.HTML, 'CSS Box Model', 'border-box'],
  ['Why is semantic HTML critical for web accessibility screen readers?', MODULES.HTML, 'HTML5 Semantic Elements', 'screen reader'],
  ['Describe the mental model of one-dimensional versus two-dimensional CSS layout', MODULES.HTML, 'CSS Grid System', '2-dimensional'],
  ['Why did JavaScript introduce block scope with let instead of function scope with var?', MODULES.JS, 'Variable Declarations & Scoping', 'block scope'],
  ['How does lexical scope determine variable resolution in nested closures?', MODULES.JS, 'Arrow Functions & Lexical this', 'lexical'],
  ['Explain the mechanics of microtasks versus macrotasks in the browser event loop', MODULES.JS, 'Asynchronous JavaScript & Promises', 'microtasks'],
  ['Why must React Hooks rely on fixed call order across component renders?', MODULES.REACT, 'React Hooks Overview & Rules', 'call order'],
  ['Explain why state updates in React useState must be treated as immutable', MODULES.REACT, 'useState Hook', 'immutable'],
  ['How does the useEffect dependency array determine execution scheduling?', MODULES.REACT, 'useEffect Hook', 'dependencies'],
  ['Explain the concept of prop drilling and how React Context solves it', MODULES.REACT, 'useContext & State Propagation', 'prop drilling'],
  ['Why does modifying a ref not trigger a lifecycle render cycle in React?', MODULES.REACT, 'useRef Hook', 're-render'],
  ['Explain non-blocking asynchronous I/O in Node.js event-driven architecture', MODULES.NODE, 'Node.js Architecture & Event Loop', 'non-blocking'],
  ['How does Express middleware pipeline implement the Chain of Responsibility pattern?', MODULES.NODE, 'Middleware in Express', 'middleware chain'],
  ['Explain the statelessness constraint of REST architectural style', MODULES.NODE, 'RESTful API Design Principles', 'stateless'],
  ['How does asymmetric digital signature provide cryptographic proof in JWTs?', MODULES.NODE, 'JWT Authentication', 'signature'],
  ['Explain the difference between 2NF and 3NF in relational schema design', MODULES.PG, 'Database Normalization Forms', 'transitive dependency'],
  ['Why does a B-tree index provide logarithmic search time for range queries?', MODULES.PG, 'Indexing Strategies & Performance', 'B-tree'],
  ['Explain transaction isolation levels and how they prevent dirty reads', MODULES.PG, 'ACID Transactions', 'Isolation'],
  ['Describe the purpose of foreign key constraints in referential integrity', MODULES.PG, 'Relational Database Modeling', 'referential integrity'],
  ['How does CSS flex-grow distribute remaining positive space along the main axis?', MODULES.HTML, 'CSS Flexbox Layout Guide', 'flex-grow'],
  ['Explain the concept of grid lines and grid tracks in CSS Grid container', MODULES.HTML, 'CSS Grid System', 'tracks'],
  ['Why do arrow functions prevent dynamic binding of the this keyword?', MODULES.JS, 'Arrow Functions & Lexical this', 'lexical this'],
  ['Explain how JavaScript Promise chaining prevents callback hell pyramids', MODULES.JS, 'Asynchronous JavaScript & Promises', 'Promise chaining'],
  ['How does React reconciler detect state changes in functional components?', MODULES.REACT, 'useState Hook', 'reconciler'],
  ['What is the relationship between useEffect cleanup and component unmounting?', MODULES.REACT, 'useEffect Hook', 'unmounting'],
  ['Explain how useMemo prevents unnecessary recalculations during child re-renders', MODULES.REACT, 'Performance Hooks: useMemo & useCallback', 'useMemo'],
  ['Why is storing timer IDs in useRef preferred over local component variables?', MODULES.REACT, 'useRef Hook', 'persists'],
  ['Explain the role of Libuv thread pool in handling file system operations in Node.js', MODULES.NODE, 'Node.js Architecture & Event Loop', 'thread pool'],
  ['How does error-handling middleware differ from regular route middleware in Express?', MODULES.NODE, 'Middleware in Express', 'err, req, res, next'],
  ['Why should REST APIs use plural nouns for endpoint resource naming?', MODULES.NODE, 'RESTful API Design Principles', 'plural nouns'],
  ['How does token expiration prevent unauthorized replay attacks in JWT systems?', MODULES.NODE, 'JWT Authentication', 'exp claim'],
  ['Explain update anomalies and how database normalization prevents them', MODULES.PG, 'Database Normalization Forms', 'anomalies'],
  ['How does PostgreSQL sequential table scan compare to index scan performance?', MODULES.PG, 'Indexing Strategies & Performance', 'Seq Scan'],
  ['Explain how WAL (Write-Ahead Logging) guarantees Durability in ACID transactions', MODULES.PG, 'ACID Transactions', 'Durability'],
  ['Describe the difference between block elements and inline elements in semantic HTML', MODULES.HTML, 'HTML5 Semantic Elements', 'semantic'],
  ['How does flex-shrink prevent items from overflowing their flex container?', MODULES.HTML, 'CSS Flexbox Layout Guide', 'flex-shrink'],
  ['Explain the spread syntax for immutably cloning JavaScript objects', MODULES.JS, 'Destructuring, Spread & Rest Operators', 'spread'],
  ['How does async await syntax syntactic sugar over underlying Promise primitives?', MODULES.JS, 'Asynchronous JavaScript & Promises', 'async await'],
  ['Why is mutating useState object properties directly considered an anti-pattern?', MODULES.REACT, 'useState Hook', 'mutating state'],
  ['How does Context.Consumer compare to the modern useContext hook API?', MODULES.REACT, 'useContext & State Propagation', 'useContext'],
  ['Explain how useCallback stabilizes callback reference identity for memoized children', MODULES.REACT, 'Performance Hooks: useMemo & useCallback', 'useCallback'],
  ['How does the Node.js event loop prevent CPU starvation from long synchronous tasks?', MODULES.NODE, 'Node.js Architecture & Event Loop', 'event loop'],
  ['What role does the next parameter play in Express middleware branching logic?', MODULES.NODE, 'Middleware in Express', 'next'],
  ['Why are HTTP status codes 400 versus 500 significant for client-server boundary?', MODULES.NODE, 'RESTful API Design Principles', '400 vs 500'],
  ['Explain how foreign keys establish one-to-many relationships across relational tables', MODULES.PG, 'Relational Database Modeling', 'one-to-many']
];
conceptualTemplates.forEach(t => addS1('conceptual', t[0], t[1], t[2], t[3]));

// Procedural, API usage, comparison, troubleshooting, code-oriented, etc.
const otherCategories = [
  'procedural', 'api_usage', 'comparison', 'troubleshooting',
  'code_oriented', 'rare_terminology', 'short_queries', 'long_queries',
  'ambiguous_queries', 'natural_student_questions'
];

const topicBank = [
  // HTML/CSS
  { doc: MODULES.HTML, sec: 'CSS Box Model', kw: 'box-sizing', term: 'box-sizing border-box', topic: 'configuring box model padding and border without expanding element width' },
  { doc: MODULES.HTML, sec: 'CSS Flexbox Layout Guide', kw: 'justify-content', term: 'flexbox centering', topic: 'centering a child div vertically and horizontally using flexbox' },
  { doc: MODULES.HTML, sec: 'CSS Grid System', kw: 'grid-template-columns', term: 'css grid repeat', topic: 'building a responsive 3 column grid layout with repeat and auto-fit' },
  { doc: MODULES.HTML, sec: 'HTML5 Semantic Elements', kw: '<nav>', term: 'semantic nav tag', topic: 'replacing non-semantic divs with header, nav, main and section tags' },
  // JS
  { doc: MODULES.JS, sec: 'Variable Declarations & Scoping', kw: 'let', term: 'block scoping let', topic: 'avoiding hoisting bugs in for loops using block-scoped let variables' },
  { doc: MODULES.JS, sec: 'Arrow Functions & Lexical this', kw: 'lexical this', term: 'arrow function this', topic: 'binding event listeners without losing lexical this context in class methods' },
  { doc: MODULES.JS, sec: 'Destructuring, Spread & Rest Operators', kw: 'destructuring', term: 'object destructuring rest', topic: 'extracting properties with defaults and gathering remaining arguments' },
  { doc: MODULES.JS, sec: 'Asynchronous JavaScript & Promises', kw: 'async/await', term: 'promise error handling', topic: 'handling rejected promises in asynchronous functions using try catch blocks' },
  // React
  { doc: MODULES.REACT, sec: 'React Hooks Overview & Rules', kw: 'rules of hooks', term: 'eslint hooks plugin', topic: 'fixing the react hook called conditionally eslint error' },
  { doc: MODULES.REACT, sec: 'useState Hook', kw: 'functional updater', term: 'useState prev state', topic: 'updating array state immutably using functional updater prev => [...prev, newItem]' },
  { doc: MODULES.REACT, sec: 'useEffect Hook', kw: 'cleanup', term: 'useEffect abortcontroller', topic: 'canceling in-flight fetch requests inside useEffect cleanup function' },
  { doc: MODULES.REACT, sec: 'useContext & State Propagation', kw: 'createContext', term: 'react context provider', topic: 'creating and consuming global authentication state using createContext and useContext' },
  { doc: MODULES.REACT, sec: 'Performance Hooks: useMemo & useCallback', kw: 'useMemo', term: 'useMemo expensive computation', topic: 'preventing re-sorting of large data tables on every render using useMemo' },
  { doc: MODULES.REACT, sec: 'useRef Hook', kw: 'useRef', term: 'useRef dom element focus', topic: 'focusing an input element imperatively on button click using useRef' },
  // Node
  { doc: MODULES.NODE, sec: 'Node.js Architecture & Event Loop', kw: 'event loop', term: 'libuv event loop phases', topic: 'diagnosing blocked event loop latency caused by synchronous crypto or json operations' },
  { doc: MODULES.NODE, sec: 'Express.js Core Concepts', kw: 'app.use', term: 'express routing', topic: 'setting up an express application with modular router instances and json body parser' },
  { doc: MODULES.NODE, sec: 'Middleware in Express', kw: 'next()', term: 'express auth middleware', topic: 'authorizing incoming requests in express middleware and attaching decoded user payload' },
  { doc: MODULES.NODE, sec: 'RESTful API Design Principles', kw: 'REST', term: 'rest status codes', topic: 'designing crud endpoints with correct http verbs and status codes 200, 201, 204' },
  { doc: MODULES.NODE, sec: 'JWT Authentication', kw: 'jwt.verify', term: 'jwt bearer token', topic: 'extracting and verifying bearer tokens from authorization header in express' },
  // PG
  { doc: MODULES.PG, sec: 'Relational Database Modeling', kw: 'foreign key', term: 'postgresql foreign keys', topic: 'defining relational foreign key constraints with on delete cascade' },
  { doc: MODULES.PG, sec: 'Database Normalization Forms', kw: '3NF', term: 'third normal form', topic: 'refactoring unnormalized student course data into 1NF 2NF and 3NF tables' },
  { doc: MODULES.PG, sec: 'Indexing Strategies & Performance', kw: 'B-tree', term: 'create index postgres', topic: 'creating b-tree indexes on foreign keys to optimize join performance' },
  { doc: MODULES.PG, sec: 'ACID Transactions', kw: 'BEGIN', term: 'acid transaction commit rollback', topic: 'executing bank transfer debit and credit within a single acid transaction block' }
];

let topicIdx = 0;
for (const cat of otherCategories) {
  for (let i = 0; i < 42; i++) {
    const t = topicBank[topicIdx % topicBank.length];
    topicIdx++;
    let qStr = '';
    if (cat === 'procedural') {
      qStr = `Step by step tutorial on ${t.topic}`;
    } else if (cat === 'api_usage') {
      qStr = `How do I use ${t.term} in production code?`;
    } else if (cat === 'comparison') {
      qStr = `What is the architectural difference between ${t.term} and traditional approaches?`;
    } else if (cat === 'troubleshooting') {
      qStr = `Fixing bug where ${t.term} fails or behaves unexpectedly in ${t.doc}`;
    } else if (cat === 'code_oriented') {
      qStr = `Code example demonstrating ${t.term} with proper syntax`;
    } else if (cat === 'rare_terminology') {
      qStr = `Technical definition and implementation details of ${t.kw}`;
    } else if (cat === 'short_queries') {
      qStr = `${t.kw} ${t.term.split(' ')[0]}`;
    } else if (cat === 'long_queries') {
      qStr = `I am developing a full stack application and I need to understand thoroughly how to implement ${t.topic} properly according to the course curriculum`;
    } else if (cat === 'ambiguous_queries') {
      qStr = `how to handle ${t.kw} in ${t.doc.split(' ')[0]}`;
    } else if (cat === 'natural_student_questions') {
      qStr = `hey professor, how do I actually use ${t.term} in my assignment project?`;
    }
    addS1(cat, qStr, t.doc, t.sec, t.kw);
  }
}

fs.writeFileSync(path.join(OUT_DIR, 'suite_1_large_blind_500.json'), JSON.stringify(suite1Queries, null, 2));
console.log(`Suite 1 written: ${suite1Queries.length} queries.`);

// ============================================================================
// SUITE 2: PARAPHRASE ROBUSTNESS (15 Canonical x 8 Variations = 120 queries)
// ============================================================================
console.log('Generating Suite 2: Paraphrase Robustness (120 queries)...');
const canonicalQuestions = [
  { id: 'p1', doc: MODULES.REACT, sec: 'useState Hook', kw: 'useState', q: 'How do you update state based on previous state using useState in React?' },
  { id: 'p2', doc: MODULES.REACT, sec: 'useEffect Hook', kw: 'cleanup', q: 'How does the cleanup function work in React useEffect hook?' },
  { id: 'p3', doc: MODULES.REACT, sec: 'useRef Hook', kw: 'useRef', q: 'What is the purpose of useRef hook and how does it persist values without re-render?' },
  { id: 'p4', doc: MODULES.REACT, sec: 'useContext & State Propagation', kw: 'useContext', q: 'How do you avoid prop drilling using React Context and useContext hook?' },
  { id: 'p5', doc: MODULES.JS, sec: 'Asynchronous JavaScript & Promises', kw: 'event loop', q: 'How does the JavaScript event loop prioritize microtasks over macrotasks?' },
  { id: 'p6', doc: MODULES.JS, sec: 'Variable Declarations & Scoping', kw: 'let', q: 'What is the difference between var, let, and const in JavaScript scoping?' },
  { id: 'p7', doc: MODULES.JS, sec: 'Arrow Functions & Lexical this', kw: 'this', q: 'How do arrow functions handle lexical this compared to regular functions?' },
  { id: 'p8', doc: MODULES.HTML, sec: 'CSS Box Model', kw: 'border-box', q: 'Why is box-sizing border-box preferred over content-box in CSS layout?' },
  { id: 'p9', doc: MODULES.HTML, sec: 'CSS Flexbox Layout Guide', kw: 'flexbox', q: 'How do you center an element vertically and horizontally using CSS Flexbox?' },
  { id: 'p10', doc: MODULES.HTML, sec: 'CSS Grid System', kw: 'grid', q: 'How do you define repeat and fractional fr units in CSS Grid template columns?' },
  { id: 'p11', doc: MODULES.NODE, sec: 'Node.js Architecture & Event Loop', kw: 'libuv', q: 'What role does Libuv thread pool play in Node.js asynchronous I/O execution?' },
  { id: 'p12', doc: MODULES.NODE, sec: 'Middleware in Express', kw: 'next', q: 'How does middleware pass request context and call next() in Express.js?' },
  { id: 'p13', doc: MODULES.NODE, sec: 'JWT Authentication', kw: 'jwt', q: 'How does JSON Web Token authentication verify user identity with bearer tokens?' },
  { id: 'p14', doc: MODULES.PG, sec: 'Database Normalization Forms', kw: '3NF', q: 'What is the difference between Second Normal Form (2NF) and Third Normal Form (3NF)?' },
  { id: 'p15', doc: MODULES.PG, sec: 'ACID Transactions', kw: 'ACID', q: 'How do BEGIN, COMMIT, and ROLLBACK guarantee ACID transactions in PostgreSQL?' }
];

const suite2Queries = [];
canonicalQuestions.forEach((cq, cidx) => {
  const variations = [
    { type: 'canonical', text: cq.q },
    { type: 'formal_wording', text: `Explicate the theoretical mechanism and syntax governing: ${cq.q}` },
    { type: 'informal_wording', text: `Can you explain simply: ${cq.q.toLowerCase().replace('how does', 'how does').replace('what is', 'what is')}` },
    { type: 'abbreviated_wording', text: `${cq.kw} explanation in ${cq.doc.split(' ')[0]}` },
    { type: 'colloquial_wording', text: `so how does ${cq.kw} actually work in practice? ${cq.q}` },
    { type: 'reordered_syntax', text: `In ${cq.doc}, regarding ${cq.sec}: ${cq.q}` },
    { type: 'passive_active', text: `By what process is ${cq.kw} handled in ${cq.sec}?` },
    { type: 'terminology_substitution', text: `Clarify the operational semantics of ${cq.kw} in ${cq.doc}` }
  ];

  variations.forEach(v => {
    suite2Queries.push({
      canonical_id: cq.id,
      canonical_query: cq.q,
      paraphrase_type: v.type,
      query: v.text,
      expected_doc: cq.doc,
      expected_section: cq.sec,
      expected_keyword: cq.kw
    });
  });
});

fs.writeFileSync(path.join(OUT_DIR, 'suite_2_paraphrase.json'), JSON.stringify(suite2Queries, null, 2));
console.log(`Suite 2 written: ${suite2Queries.length} queries.`);

// ============================================================================
// SUITE 3: TYPO / NOISE ROBUSTNESS (15 Clean x 7 Noise Types = 105 queries)
// ============================================================================
console.log('Generating Suite 3: Typo / Noise Robustness (105 queries)...');
const suite3Queries = [];
canonicalQuestions.forEach((cq) => {
  const noiseTypes = [
    { type: 'spelling_errors', fn: q => q.replace(/useState/i, 'useStat').replace(/useEffect/i, 'useEfect').replace(/PostgreSQL/i, 'Postgress').replace(/middleware/i, 'midleware').replace(/JavaScript/i, 'Javscript') },
    { type: 'missing_punctuation', fn: q => q.replace(/[?,.():]/g, '') },
    { type: 'repeated_words', fn: q => q.replace('How do', 'How how do').replace('What is', 'What what is').replace('How does', 'How does does') },
    { type: 'capitalization_variation', fn: q => q.split(' ').map((w, idx) => idx % 2 === 0 ? w.toUpperCase() : w.toLowerCase()).join(' ') },
    { type: 'keyboard_mistakes', fn: q => q.replace(/a/g, 's').replace(/e/g, 'w').slice(0, -2) + '?' },
    { type: 'abbreviated_terminology', fn: q => q.replace(/React/i, 'rct').replace(/function/i, 'fn').replace(/database/i, 'db').replace(/component/i, 'comp') },
    { type: 'phonetic_spelling', fn: q => q.replace(/asynchronous/i, 'asinkronus').replace(/closure/i, 'klozure').replace(/queue/i, 'kyoo').replace(/token/i, 'tokin') }
  ];

  noiseTypes.forEach(n => {
    suite3Queries.push({
      canonical_id: cq.id,
      clean_query: cq.q,
      noise_type: n.type,
      query: n.fn(cq.q),
      expected_doc: cq.doc,
      expected_section: cq.sec,
      expected_keyword: cq.kw
    });
  });
});

fs.writeFileSync(path.join(OUT_DIR, 'suite_3_noise.json'), JSON.stringify(suite3Queries, null, 2));
console.log(`Suite 3 written: ${suite3Queries.length} queries.`);

// ============================================================================
// SUITE 4: COLLOQUIAL + HINGLISH (80 queries)
// ============================================================================
console.log('Generating Suite 4: Colloquial & Hinglish (80 queries)...');
const hinglishQueries = [
  // React
  { q: "react me useEffect kab use karte hain?", doc: MODULES.REACT, sec: 'useEffect Hook', kw: 'useEffect' },
  { q: "useState aur useReducer me kya difference hai bhai?", doc: MODULES.REACT, sec: 'useState Hook', kw: 'useState' },
  { q: "useRef actually karta kya hai dom element access karne k alawa?", doc: MODULES.REACT, sec: 'useRef Hook', kw: 'useRef' },
  { q: "react context se prop drilling kaise avoid hoti hai?", doc: MODULES.REACT, sec: 'useContext & State Propagation', kw: 'useContext' },
  { q: "useCallback aur useMemo kab lagana chahiye performance k liye?", doc: MODULES.REACT, sec: 'Performance Hooks: useMemo & useCallback', kw: 'useMemo' },
  { q: "hooks ko loop ya if condition me kyu nahi daal sakte?", doc: MODULES.REACT, sec: 'React Hooks Overview & Rules', kw: 'rules of hooks' },
  { q: "cleanup function useEffect me return kyu karte hain?", doc: MODULES.REACT, sec: 'useEffect Hook', kw: 'cleanup' },
  { q: "useState me prev state use karna kyu zaroori hai?", doc: MODULES.REACT, sec: 'useState Hook', kw: 'functional updater' },
  { q: "bhai react me global state context se kaise banaye?", doc: MODULES.REACT, sec: 'useContext & State Propagation', kw: 'Provider' },
  { q: "useRef me value update karne par component re-render kyu nahi hota?", doc: MODULES.REACT, sec: 'useRef Hook', kw: 'current' },

  // Node & Express
  { q: "node me middleware actually karta kya hai?", doc: MODULES.NODE, sec: 'Middleware in Express', kw: 'middleware' },
  { q: "express me next() call nahi karenge toh kya hoga request ka?", doc: MODULES.NODE, sec: 'Middleware in Express', kw: 'next()' },
  { q: "jwt token verify kaise karte hain express backend me?", doc: MODULES.NODE, sec: 'JWT Authentication', kw: 'jwt' },
  { q: "node ka event loop microtask aur macrotask kaise chalata hai?", doc: MODULES.NODE, sec: 'Node.js Architecture & Event Loop', kw: 'event loop' },
  { q: "libuv thread pool node js me kab kaam aata hai?", doc: MODULES.NODE, sec: 'Node.js Architecture & Event Loop', kw: 'libuv' },
  { q: "rest api me 401 aur 403 me kya difference hota hai?", doc: MODULES.NODE, sec: 'RESTful API Design Principles', kw: '401' },
  { q: "app.use aur app.get me kya antar hai express me?", doc: MODULES.NODE, sec: 'Express.js Core Concepts', kw: 'app.use' },
  { q: "express me bearer token authorization header se kaise nikalte hain?", doc: MODULES.NODE, sec: 'JWT Authentication', kw: 'bearer' },
  { q: "node js single threaded hai toh concurrent requests kaise handle hoti hain?", doc: MODULES.NODE, sec: 'Node.js Architecture & Event Loop', kw: 'non-blocking' },
  { q: "restful endpoints me plural nouns kyu use karte hain /api/students type?", doc: MODULES.NODE, sec: 'RESTful API Design Principles', kw: 'plural nouns' },

  // PostgreSQL
  { q: "postgres me join kaise hota hai tables ke beech?", doc: MODULES.PG, sec: 'Relational Database Modeling', kw: 'foreign key' },
  { q: "database normalization me 1nf 2nf 3nf ka kya funda hai?", doc: MODULES.PG, sec: 'Database Normalization Forms', kw: '3NF' },
  { q: "b-tree index postgres me queries ko fast kaise banata hai?", doc: MODULES.PG, sec: 'Indexing Strategies & Performance', kw: 'B-tree' },
  { q: "acid transactions me rollback kab trigger hota hai?", doc: MODULES.PG, sec: 'ACID Transactions', kw: 'ROLLBACK' },
  { q: "postgres me explain analyze command se query plan kaise check kare?", doc: MODULES.PG, sec: 'Indexing Strategies & Performance', kw: 'EXPLAIN ANALYZE' },
  { q: "foreign key on delete cascade se child rows kaise delete hoti hain?", doc: MODULES.PG, sec: 'Relational Database Modeling', kw: 'cascade' },
  { q: "database me transitive dependency kya hoti hai aur 3nf kaise hatata hai?", doc: MODULES.PG, sec: 'Database Normalization Forms', kw: 'transitive' },
  { q: "acid me atomicity ka matlab kya hai agar beech me error aa jaye?", doc: MODULES.PG, sec: 'ACID Transactions', kw: 'Atomicity' },
  { q: "primary key aur unique constraint me kya difference hai postgres me?", doc: MODULES.PG, sec: 'Relational Database Modeling', kw: 'primary key' },
  { q: "write ahead logging durability kaise guarantee karti hai postgres me?", doc: MODULES.PG, sec: 'ACID Transactions', kw: 'durability' },

  // JavaScript ES6+
  { q: "var let aur const me kya difference hai js scoping me?", doc: MODULES.JS, sec: 'Variable Declarations & Scoping', kw: 'let' },
  { q: "temporal dead zone tdz kya hota hai let const ke sath?", doc: MODULES.JS, sec: 'Variable Declarations & Scoping', kw: 'TDZ' },
  { q: "arrow function me lexical this ka kya chakkar hai?", doc: MODULES.JS, sec: 'Arrow Functions & Lexical this', kw: 'lexical this' },
  { q: "promise chaining me .then aur .catch kaise handle kare?", doc: MODULES.JS, sec: 'Asynchronous JavaScript & Promises', kw: 'promise' },
  { q: "async await me try catch se rejected promise kaise pakde?", doc: MODULES.JS, sec: 'Asynchronous JavaScript & Promises', kw: 'async await' },
  { q: "object destructuring me default values aur rest operator kaise use kare?", doc: MODULES.JS, sec: 'Destructuring, Spread & Rest Operators', kw: 'destructuring' },
  { q: "call stack aur callback queue me microtasks pehle kyu chalte hain?", doc: MODULES.JS, sec: 'Asynchronous JavaScript & Promises', kw: 'microtask' },
  { q: "spread operator ... se array copy shallow hoti hai ya deep?", doc: MODULES.JS, sec: 'Destructuring, Spread & Rest Operators', kw: 'spread' },
  { q: "es6 classes me arrow function use karke this bind kaise karte hain?", doc: MODULES.JS, sec: 'Arrow Functions & Lexical this', kw: 'this' },
  { q: "settimeout 0 ms dene par bhi turant kyu nahi chalta js me?", doc: MODULES.JS, sec: 'Asynchronous JavaScript & Promises', kw: 'event loop' },

  // HTML & CSS
  { q: "css box model me border-box lagana kyu best practice maana jata hai?", doc: MODULES.HTML, sec: 'CSS Box Model', kw: 'border-box' },
  { q: "flexbox me justify-content aur align-items me kya fark hai?", doc: MODULES.HTML, sec: 'CSS Flexbox Layout Guide', kw: 'justify-content' },
  { q: "css grid me fr unit aur repeat function kaise kaam karte hain?", doc: MODULES.HTML, sec: 'CSS Grid System', kw: 'fr' },
  { q: "div soup kyu nahi banana chahiye aur semantic html kyu zaroori hai?", doc: MODULES.HTML, sec: 'HTML5 Semantic Elements', kw: 'semantic' },
  { q: "flex-wrap wrap karne se items next line pe kaise aate hain?", doc: MODULES.HTML, sec: 'CSS Flexbox Layout Guide', kw: 'flex-wrap' },
  { q: "grid layout me auto-fit aur minmax se responsive columns kaise banaye?", doc: MODULES.HTML, sec: 'CSS Grid System', kw: 'auto-fit' },
  { q: "main tag aur section tag me kya difference hai semantic structure me?", doc: MODULES.HTML, sec: 'HTML5 Semantic Elements', kw: '<main>' },
  { q: "content-box me padding add karne se total div width kyu badh jaati hai?", doc: MODULES.HTML, sec: 'CSS Box Model', kw: 'content-box' },
  { q: "flexbox 1D layout hai toh grid 2D kaise handle karta hai rows aur columns?", doc: MODULES.HTML, sec: 'CSS Grid System', kw: '2D' },
  { q: "header nav article footer tags seo aur accessibility me kaise help karte hain?", doc: MODULES.HTML, sec: 'HTML5 Semantic Elements', kw: 'accessibility' }
];

// Add 30 more variations to reach 80 total
const additionalPhrases = [
  "sir please explain ", "yaar mujhe samajh nahi aa raha ", "project me problem aa rahi hai ",
  "bhai simple words me batao ", "quick explanation chahiye "
];

for (let i = 0; i < 30; i++) {
  const base = hinglishQueries[i % hinglishQueries.length];
  const prefix = additionalPhrases[i % additionalPhrases.length];
  hinglishQueries.push({
    q: prefix + base.q,
    doc: base.doc,
    sec: base.sec,
    kw: base.kw
  });
}

const suite4Formatted = hinglishQueries.map((item, idx) => ({
  id: `exp14_s4_${String(idx + 1).padStart(3, '0')}`,
  query: item.q,
  expected_doc: item.doc,
  expected_section: item.sec,
  expected_keyword: item.kw
}));

fs.writeFileSync(path.join(OUT_DIR, 'suite_4_hinglish.json'), JSON.stringify(suite4Formatted, null, 2));
console.log(`Suite 4 written: ${suite4Formatted.length} queries.`);
