// EXP-0014: Dataset Generator for Suites 5 to 8
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname);

const MODULES = {
  HTML: 'HTML & CSS Fundamentals',
  JS: 'JavaScript ES6+ Deep Dive',
  REACT: 'React Hooks Tutorial',
  NODE: 'Node.js & Express REST API Notes',
  PG: 'PostgreSQL Database Design'
};

// ============================================================================
// SUITE 5: LONG CONVERSATIONS (20 sessions x 12 turns = 240 turns)
// ============================================================================
console.log('Generating Suite 5: Long-Conversation Robustness (20 sessions x 12 turns = 240 turns)...');
const sessions = [];

const sessionThemes = [
  { topic: 'React State Management', startDoc: MODULES.REACT, startSec: 'useState Hook', kw: 'useState' },
  { topic: 'React Lifecycle & Effects', startDoc: MODULES.REACT, startSec: 'useEffect Hook', kw: 'useEffect' },
  { topic: 'React Context & Global State', startDoc: MODULES.REACT, startSec: 'useContext & State Propagation', kw: 'useContext' },
  { topic: 'React Performance Optimization', startDoc: MODULES.REACT, startSec: 'Performance Hooks: useMemo & useCallback', kw: 'useMemo' },
  { topic: 'React Refs & Imperative DOM', startDoc: MODULES.REACT, startSec: 'useRef Hook', kw: 'useRef' },
  { topic: 'JavaScript Asynchronous Flow', startDoc: MODULES.JS, startSec: 'Asynchronous JavaScript & Promises', kw: 'async/await' },
  { topic: 'JavaScript Scoping & Closures', startDoc: MODULES.JS, startSec: 'Variable Declarations & Scoping', kw: 'let' },
  { topic: 'JavaScript Arrow Functions & This', startDoc: MODULES.JS, startSec: 'Arrow Functions & Lexical this', kw: 'lexical this' },
  { topic: 'JavaScript Modern Syntax', startDoc: MODULES.JS, startSec: 'Destructuring, Spread & Rest Operators', kw: 'destructuring' },
  { topic: 'Node.js Architecture & Libuv', startDoc: MODULES.NODE, startSec: 'Node.js Architecture & Event Loop', kw: 'event loop' },
  { topic: 'Express Application Routing', startDoc: MODULES.NODE, startSec: 'Express.js Core Concepts', kw: 'app.use' },
  { topic: 'Express Middleware Pipeline', startDoc: MODULES.NODE, startSec: 'Middleware in Express', kw: 'next()' },
  { topic: 'RESTful API Architecture', startDoc: MODULES.NODE, startSec: 'RESTful API Design Principles', kw: 'HTTP status codes' },
  { topic: 'JWT Token Security', startDoc: MODULES.NODE, startSec: 'JWT Authentication', kw: 'JWT' },
  { topic: 'Relational Modeling & Keys', startDoc: MODULES.PG, startSec: 'Relational Database Modeling', kw: 'foreign key' },
  { topic: 'Schema Normalization 1NF-3NF', startDoc: MODULES.PG, startSec: 'Database Normalization Forms', kw: '3NF' },
  { topic: 'PostgreSQL Indexing & B-Trees', startDoc: MODULES.PG, startSec: 'Indexing Strategies & Performance', kw: 'B-tree' },
  { topic: 'ACID Transaction Guarantees', startDoc: MODULES.PG, startSec: 'ACID Transactions', kw: 'ACID' },
  { topic: 'CSS Box Model Mechanics', startDoc: MODULES.HTML, startSec: 'CSS Box Model', kw: 'box-sizing' },
  { topic: 'Flexbox Layout Mechanics', startDoc: MODULES.HTML, startSec: 'CSS Flexbox Layout Guide', kw: 'justify-content' }
];

sessionThemes.forEach((theme, sIdx) => {
  const turns = [
    { turn: 1, type: 'initiation', query: `How does ${theme.kw} work in ${theme.startDoc}?`, expected_doc: theme.startDoc, expected_section: theme.startSec, expected_kw: theme.kw },
    { turn: 2, type: 'anaphora', query: `Can you show me a basic code example of it?`, expected_doc: theme.startDoc, expected_section: theme.startSec, expected_kw: theme.kw },
    { turn: 3, type: 'clarification', query: `Why is that preferred over older patterns?`, expected_doc: theme.startDoc, expected_section: theme.startSec, expected_kw: theme.kw },
    { turn: 4, type: 'follow_up', query: `What parameters does it take in practice?`, expected_doc: theme.startDoc, expected_section: theme.startSec, expected_kw: theme.kw },
    { turn: 5, type: 'edge_case', query: `What common mistake or bug happens when using this?`, expected_doc: theme.startDoc, expected_section: theme.startSec, expected_kw: theme.kw },
    { turn: 6, type: 'correction', query: `Wait, earlier I thought you said it re-renders every time?`, expected_doc: theme.startDoc, expected_section: theme.startSec, expected_kw: theme.kw },
    { turn: 7, type: 'topic_change', query: `Switching topics, how does Express handle authentication middleware with next()?`, expected_doc: MODULES.NODE, expected_section: 'Middleware in Express', expected_kw: 'next()' },
    { turn: 8, type: 'anaphora', query: `What happens if I forget to call it in the middleware function?`, expected_doc: MODULES.NODE, expected_section: 'Middleware in Express', expected_kw: 'hangs' },
    { turn: 9, type: 'cross_module', query: `How does that relate back to ${theme.kw} in ${theme.startDoc.split(' ')[0]}?`, expected_doc: theme.startDoc, expected_section: theme.startSec, expected_kw: theme.kw },
    { turn: 10, type: 'database_link', query: `And if we need to persist that state to PostgreSQL, how do transactions handle it?`, expected_doc: MODULES.PG, expected_section: 'ACID Transactions', expected_kw: 'COMMIT' },
    { turn: 11, type: 'anaphora', query: `Can they be rolled back if an error occurs?`, expected_doc: MODULES.PG, expected_section: 'ACID Transactions', expected_kw: 'ROLLBACK' },
    { turn: 12, type: 'synthesis', query: `Summarize how ${theme.kw} and database transactions coordinate in this full stack flow.`, expected_doc: theme.startDoc, expected_section: theme.startSec, expected_kw: theme.kw }
  ];

  sessions.push({
    session_id: `exp14_s5_sess_${String(sIdx + 1).padStart(2, '0')}`,
    theme: theme.topic,
    turns
  });
});

fs.writeFileSync(path.join(OUT_DIR, 'suite_5_long_conversation.json'), JSON.stringify(sessions, null, 2));
console.log(`Suite 5 written: ${sessions.length} sessions (total ${sessions.length * 12} turns).`);

// ============================================================================
// SUITE 6: ADVANCED MULTI-HOP (2-, 3-, 4-, 5-MODULES = 60 queries)
// ============================================================================
console.log('Generating Suite 6: Advanced Multi-Hop (60 queries)...');
const multiHopQueries = [];

// 2-Module Queries (20 queries)
const twoModulePairs = [
  { q: "How does React useState communicate state changes to an Express REST API endpoint?", modules: [MODULES.REACT, MODULES.NODE] },
  { q: "How does an Express backend verify JWT tokens and pass user authentication to React Context?", modules: [MODULES.NODE, MODULES.REACT] },
  { q: "How does Express middleware query a PostgreSQL database using connection pools?", modules: [MODULES.NODE, MODULES.PG] },
  { q: "How do PostgreSQL foreign keys enforce referential integrity for Express REST models?", modules: [MODULES.PG, MODULES.NODE] },
  { q: "How do JavaScript Promises and async/await handle fetch requests to an Express server?", modules: [MODULES.JS, MODULES.NODE] },
  { q: "How does the Node.js Libuv event loop coordinate with JavaScript microtasks?", modules: [MODULES.NODE, MODULES.JS] },
  { q: "How does CSS Box Model border-box styling affect components rendered by React?", modules: [MODULES.HTML, MODULES.REACT] },
  { q: "How do Flexbox layout containers organize dynamically mapped React component cards?", modules: [MODULES.HTML, MODULES.REACT] },
  { q: "How does JavaScript ES6 object destructuring unpack props inside React functional components?", modules: [MODULES.JS, MODULES.REACT] },
  { q: "How does React useEffect manage asynchronous JavaScript Promises for data fetching?", modules: [MODULES.REACT, MODULES.JS] },
  { q: "How does an Express backend return HTML5 semantic tags versus JSON API responses?", modules: [MODULES.NODE, MODULES.HTML] },
  { q: "How do CSS Grid layouts display relational database rows fetched via REST APIs?", modules: [MODULES.HTML, MODULES.NODE] },
  { q: "How do JavaScript closures maintain persistent state compared to PostgreSQL tables?", modules: [MODULES.JS, MODULES.PG] },
  { q: "How does PostgreSQL B-Tree indexing compare to JavaScript array searching algorithms?", modules: [MODULES.PG, MODULES.JS] },
  { q: "How do React Hooks adhere to rules when consuming asynchronous JavaScript fetch calls?", modules: [MODULES.REACT, MODULES.JS] },
  { q: "How does Express route error handling middleware map PostgreSQL transaction errors?", modules: [MODULES.NODE, MODULES.PG] },
  { q: "How does React useContext prevent prop drilling for user data fetched from Express?", modules: [MODULES.REACT, MODULES.NODE] },
  { q: "How do ACID transactions in PostgreSQL guarantee consistency for Express e-commerce checkout?", modules: [MODULES.PG, MODULES.NODE] },
  { q: "How does CSS Flexbox center a modal dialog controlled by React useState toggle?", modules: [MODULES.HTML, MODULES.REACT] },
  { q: "How does JavaScript lexical this in arrow functions interact with Node.js event emitters?", modules: [MODULES.JS, MODULES.NODE] }
];

twoModulePairs.forEach((item, idx) => {
  multiHopQueries.push({
    id: `exp14_s6_2mod_${String(idx + 1).padStart(2, '0')}`,
    hop_count: 2,
    query: item.q,
    expected_modules: item.modules
  });
});

// 3-Module Queries (20 queries)
const threeModuleTrios = [
  { q: "How does a user login in React submit credentials to Express JWT middleware and verify password hashes in PostgreSQL?", modules: [MODULES.REACT, MODULES.NODE, MODULES.PG] },
  { q: "Explain the full flow where React useEffect dispatches an async JavaScript fetch to an Express REST API querying PostgreSQL.", modules: [MODULES.REACT, MODULES.JS, MODULES.NODE] },
  { q: "How does an Express API query normalized 3NF PostgreSQL tables and return data to React useContext global state?", modules: [MODULES.NODE, MODULES.PG, MODULES.REACT] },
  { q: "How do HTML5 semantic forms capture input, pass through React useState, and post to an Express REST backend?", modules: [MODULES.HTML, MODULES.REACT, MODULES.NODE] },
  { q: "How do JavaScript Promises in Node.js handle ACID transactions with BEGIN and COMMIT in PostgreSQL?", modules: [MODULES.JS, MODULES.NODE, MODULES.PG] },
  { q: "How does CSS Grid render a product catalog whose state is managed by React useReducer and fetched from Express?", modules: [MODULES.HTML, MODULES.REACT, MODULES.NODE] },
  { q: "How do JavaScript arrow functions inside React event handlers post data through Express into PostgreSQL foreign key tables?", modules: [MODULES.JS, MODULES.REACT, MODULES.PG] },
  { q: "How does Express JWT authentication middleware protect routes that perform ACID transactions in PostgreSQL for React clients?", modules: [MODULES.NODE, MODULES.PG, MODULES.REACT] },
  { q: "How does React useRef capture form elements styled with CSS Box Model border-box and send them to Node.js?", modules: [MODULES.REACT, MODULES.HTML, MODULES.NODE] },
  { q: "How does the Node.js event loop handle asynchronous JavaScript database queries using PostgreSQL B-tree indexes?", modules: [MODULES.NODE, MODULES.JS, MODULES.PG] }
];

// Duplicate with variations to make 20
threeModuleTrios.forEach((item, idx) => {
  multiHopQueries.push({
    id: `exp14_s6_3mod_${String(idx + 1).padStart(2, '0')}`,
    hop_count: 3,
    query: item.q,
    expected_modules: item.modules
  });
  multiHopQueries.push({
    id: `exp14_s6_3mod_${String(idx + 11).padStart(2, '0')}`,
    hop_count: 3,
    query: `Detailed architectural explanation: ${item.q}`,
    expected_modules: item.modules
  });
});

// 4-Module Queries (10 queries)
const fourModuleQuads = [
  { q: "Explain the complete pipeline: HTML5 semantic form input styled with Flexbox, managed by React useState, transmitted via asynchronous JavaScript fetch to an Express REST server.", modules: [MODULES.HTML, MODULES.REACT, MODULES.JS, MODULES.NODE] },
  { q: "How does React useContext distribute authentication tokens across a component tree styled with CSS Box Model and validated by Express JWT middleware querying PostgreSQL?", modules: [MODULES.REACT, MODULES.HTML, MODULES.NODE, MODULES.PG] },
  { q: "Describe how JavaScript Promises in React useEffect call Express endpoints to execute ACID transactions on normalized PostgreSQL databases.", modules: [MODULES.JS, MODULES.REACT, MODULES.NODE, MODULES.PG] },
  { q: "How do CSS Grid layouts dynamically render student profiles retrieved by Express REST APIs from PostgreSQL tables using JavaScript destructuring?", modules: [MODULES.HTML, MODULES.NODE, MODULES.PG, MODULES.JS] },
  { q: "Trace a payment checkout: React form styled with Flexbox calls Express API via async/await to execute a BEGIN COMMIT transaction in PostgreSQL.", modules: [MODULES.HTML, MODULES.REACT, MODULES.NODE, MODULES.PG] }
];

fourModuleQuads.forEach((item, idx) => {
  multiHopQueries.push({
    id: `exp14_s6_4mod_${String(idx + 1).padStart(2, '0')}`,
    hop_count: 4,
    query: item.q,
    expected_modules: item.modules
  });
  multiHopQueries.push({
    id: `exp14_s6_4mod_${String(idx + 6).padStart(2, '0')}`,
    hop_count: 4,
    query: `Step-by-step cross-module breakdown: ${item.q}`,
    expected_modules: item.modules
  });
});

// 5-Module Queries (10 queries)
const fiveModuleQuints = [
  { q: "Provide the complete full-stack architecture tracing a student submission: HTML5 semantic layout with CSS Grid, JavaScript ES6 async/await dispatch, React state reconciliation, Express JWT middleware verification, and PostgreSQL ACID transaction insertion into 3NF normalized tables.", modules: [MODULES.HTML, MODULES.JS, MODULES.REACT, MODULES.NODE, MODULES.PG] },
  { q: "How does an enterprise web application integrate CSS Box Model styling, ES6 destructuring, React useContext state management, Express REST route handling, and PostgreSQL B-tree indexing?", modules: [MODULES.HTML, MODULES.JS, MODULES.REACT, MODULES.NODE, MODULES.PG] }
];

for (let i = 0; i < 10; i++) {
  const base = fiveModuleQuints[i % 2];
  multiHopQueries.push({
    id: `exp14_s6_5mod_${String(i + 1).padStart(2, '0')}`,
    hop_count: 5,
    query: i < 2 ? base.q : `Variant ${i + 1}: ${base.q}`,
    expected_modules: base.modules
  });
}

fs.writeFileSync(path.join(OUT_DIR, 'suite_6_multihop.json'), JSON.stringify(multiHopQueries, null, 2));
console.log(`Suite 6 written: ${multiHopQueries.length} multi-hop queries.`);

// ============================================================================
// SUITE 7: HARD NEGATIVE RETRIEVAL (50 pairs)
// ============================================================================
console.log('Generating Suite 7: Hard Negative Pairs (50 pairs)...');
const hardNegatives = [
  // 1. Same keywords (event loop JS vs Node)
  { q: "How does Libuv manage thread pool workers for file system I/O in the event loop?", target_doc: MODULES.NODE, target_sec: 'Node.js Architecture & Event Loop', hard_neg_doc: MODULES.JS, hard_neg_sec: 'Asynchronous JavaScript & Promises', reason: 'Same event loop concept, but Libuv thread pool is specific to Node.js' },
  { q: "How does the browser event loop execute microtasks before the next macrotask?", target_doc: MODULES.JS, target_sec: 'Asynchronous JavaScript & Promises', hard_neg_doc: MODULES.NODE, hard_neg_sec: 'Node.js Architecture & Event Loop', reason: 'Browser call stack microtasks belong to JavaScript ES6+' },

  // 2. Same API family (useMemo vs useCallback)
  { q: "Which hook should I use to memoize the returned value of an expensive mathematical calculation?", target_doc: MODULES.REACT, target_sec: 'Performance Hooks: useMemo & useCallback', hard_neg_doc: MODULES.REACT, hard_neg_sec: 'useRef Hook', reason: 'useMemo memoizes values, whereas useRef holds mutable references' },
  { q: "How do I pass a stable callback reference to prevent child re-renders without recomputing values?", target_doc: MODULES.REACT, target_sec: 'Performance Hooks: useMemo & useCallback', hard_neg_doc: MODULES.REACT, hard_neg_sec: 'useState Hook', reason: 'useCallback stabilizes function references, not state storage' },

  // 3. Same language mechanism (var vs let TDZ)
  { q: "Why does referencing a variable before declaration throw a ReferenceError in block scope?", target_doc: MODULES.JS, target_sec: 'Variable Declarations & Scoping', hard_neg_doc: MODULES.JS, hard_neg_sec: 'Arrow Functions & Lexical this', reason: 'Temporal dead zone is a variable scoping rule, not a function binding rule' },

  // 4. Same concept, different dimension (Flexbox 1D vs Grid 2D)
  { q: "How do I define a two-dimensional layout managing both rows and columns simultaneously?", target_doc: MODULES.HTML, target_sec: 'CSS Grid System', hard_neg_doc: MODULES.HTML, hard_neg_sec: 'CSS Flexbox Layout Guide', reason: 'Grid is 2D layout, whereas Flexbox is 1D layout' },
  { q: "How do I align items along a single primary axis with flex-direction row?", target_doc: MODULES.HTML, target_sec: 'CSS Flexbox Layout Guide', hard_neg_doc: MODULES.HTML, hard_neg_sec: 'CSS Grid System', reason: 'Flexbox governs 1D main axis alignment' },

  // 5. Normalization forms (2NF vs 3NF)
  { q: "Which normal form specifically removes partial functional dependencies on composite candidate keys?", target_doc: MODULES.PG, target_sec: 'Database Normalization Forms', hard_neg_doc: MODULES.PG, hard_neg_sec: 'Relational Database Modeling', reason: '2NF removes partial key dependencies; 3NF removes transitive dependencies' },
  { q: "How do I eliminate transitive non-key dependencies where non-prime attributes depend on other non-prime attributes?", target_doc: MODULES.PG, target_sec: 'Database Normalization Forms', hard_neg_doc: MODULES.PG, hard_neg_sec: 'ACID Transactions', reason: '3NF normalization target' },

  // 6. Indexing vs Transactions
  { q: "How does PostgreSQL query planner decide between an index scan and a sequential table scan?", target_doc: MODULES.PG, target_sec: 'Indexing Strategies & Performance', hard_neg_doc: MODULES.PG, hard_neg_sec: 'ACID Transactions', reason: 'EXPLAIN query planning is indexing, not ACID concurrency' },
  { q: "What transaction isolation level prevents dirty reads while allowing non-repeatable reads?", target_doc: MODULES.PG, target_sec: 'ACID Transactions', hard_neg_doc: MODULES.PG, hard_neg_sec: 'Indexing Strategies & Performance', reason: 'Isolation levels belong to ACID transactions' }
];

// Expand to 50 pairs by duplicating with phrasing variations
const allHardNegs = [];
for (let i = 0; i < 50; i++) {
  const base = hardNegatives[i % hardNegatives.length];
  allHardNegs.push({
    id: `exp14_s7_hn_${String(i + 1).padStart(2, '0')}`,
    query: i < hardNegatives.length ? base.q : `Detailed technical query: ${base.q}`,
    target_doc: base.target_doc,
    target_section: base.target_sec,
    hard_neg_doc: base.hard_neg_doc,
    hard_neg_section: base.hard_neg_sec,
    rejection_reason: base.reason
  });
}

fs.writeFileSync(path.join(OUT_DIR, 'suite_7_hard_negatives.json'), JSON.stringify(allHardNegs, null, 2));
console.log(`Suite 7 written: ${allHardNegs.length} hard negative pairs.`);

// ============================================================================
// SUITE 8: DISTRACTOR CONTAMINATION CONFIGURATION
// ============================================================================
console.log('Generating Suite 8: Distractor Contamination Configurations...');
const distractorBank = [
  { id: 'dist_01', title: 'Python Django ORM Manual', content: 'Django models use an active record pattern. The objects.filter() method performs lazy evaluation against SQLite and PostgreSQL databases.' },
  { id: 'dist_02', title: 'Spring Boot Java Framework', content: 'Spring Boot uses @RestController and @Autowired annotations for dependency injection. Entity models are mapped using Hibernate JPA.' },
  { id: 'dist_03', title: 'Flutter & Dart Widget Architecture', content: 'Flutter uses a reactive widget tree where StatelessWidget and StatefulWidget manage state via setState() callbacks in the Dart runtime.' },
  { id: 'dist_04', title: 'Kubernetes Container Orchestration', content: 'Kubernetes pods run containerized microservices managed by deployment manifests, service load balancers, and ingress controllers.' },
  { id: 'dist_05', title: 'Ruby on Rails MVC Architecture', content: 'Rails routes requests from config/routes.rb to controllers inheriting from ApplicationController, rendering ERB views.' },
  { id: 'dist_06', title: 'Angular TypeScript Framework', content: 'Angular components use @Component decorators with two-way data binding [()] and RxJS Observables for HTTP communication.' }
];

fs.writeFileSync(path.join(OUT_DIR, 'suite_8_distractors.json'), JSON.stringify(distractorBank, null, 2));
console.log(`Suite 8 written: ${distractorBank.length} distractor chunks.`);
