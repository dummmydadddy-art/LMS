# EXP-0038: Chunk Inspection Artifact (C0 vs C1)

**Experiment:** EXP-0038 (Structure-Aware Evidence Chunking with Docling HybridChunker)  
**Date:** 2026-09-17  
**Scope:** Human-readable inspection artifact comparing C0 (baseline regex chunks) and C1 (Docling HybridChunker chunks) across all authentic curriculum materials.  

---

## 1. Chunk Summary Table

| Document Title | Material ID | C0 Chunk Count | C1 Chunk Count | C0 Avg Tokens | C1 Avg Tokens | C1 Max Tokens |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Node.js & Express REST API Notes** | `5d1923d4-d240-4348-8ee3-29c512a8e752` | 5 | 4 | 148.6 | 184.5 | 327 |
| **React Hooks Tutorial** | `abc6db98-3d75-40ea-b988-f1e8a7497bba` | 6 | 5 | 115.2 | 135.8 | 233 |
| **JavaScript ES6+ Deep Dive** | `c254cc49-47b8-455f-bc9e-bc834c0276fe` | 4 | 4 | 199.2 | 193.2 | 331 |
| **PostgreSQL Database Design** | `d4e9dcd2-3b77-4e67-afa5-2d04001d09d0` | 4 | 4 | 178.2 | 179.2 | 247 |
| **HTML & CSS Fundamentals** | `ea1f3b17-0657-4ee2-b155-c56b775dd25e` | 4 | 4 | 204.8 | 205.5 | 292 |

---

## 2. Detailed Document-by-Document Chunk Inspection

### Document: Node.js & Express REST API Notes
* **Material ID:** `5d1923d4-d240-4348-8ee3-29c512a8e752`
* **C0 Baseline Chunks:** 5
* **C1 Docling Chunks:** 4

#### C1 Docling Representative Chunks:
##### C1 Chunk 0 (Tokens: 168, Contextualized Tokens: 185)
* **Hierarchical Headings:** `['Node.js & Express REST API Notes', 'NODE.JS ARCHITECTURE & EVENT LOOP']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
Node.js is an asynchronous, event-driven JavaScript runtime built on Chrome's V8 engine and Libuv.  
Key components:
- - Single Main Thread executes JavaScript code sequentially.
- - Libuv provides a thread pool (default 4 worker threads) to handle non-blocking asynchronous I/O operations like file system reads, DNS lookups, and crypto hashing.
- - The Event Loop continuously checks phases: Timers (setTimeout) -> Pending Callbacks -> Idle/Prepare -> Poll (I/O) -> Check (setImmediate) -> Close Callbacks.
Avoid CPU-intensive operations (heavy loops, synchronous encryption) on the main thread to prevent blocking event handling.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
Node.js & Express REST API Notes
NODE.JS ARCHITECTURE & EVENT LOOP
Node.js is an asynchronous, event-driven JavaScript runtime built on Chrome's V8 engine and Libuv.  
Key components:
- - Single Main Thread executes JavaScript code sequentially.
- - ...
```

##### C1 Chunk 1 (Tokens: 75, Contextualized Tokens: 90)
* **Hierarchical Headings:** `['Node.js & Express REST API Notes', 'EXPRESS.JS CORE CONCEPTS']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
Express is a fast, unopinionated minimalist web framework for Node.js.  
Basic structure:
```
const express = require('express');
const app = express();
app.use(express.json()); // Built-in middleware to parse incoming JSON bodies
```
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
Node.js & Express REST API Notes
EXPRESS.JS CORE CONCEPTS
Express is a fast, unopinionated minimalist web framework for Node.js.  
Basic structure:
```
const express = require('express');
const app = express();
app.use(express.json()); // Built-in mi...
```

##### C1 Chunk 2 (Tokens: 168, Contextualized Tokens: 181)
* **Hierarchical Headings:** `['Node.js & Express REST API Notes', 'MIDDLEWARE IN EXPRESS']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
Middleware functions are functions that have access to the request object (`req`), response object (`res`), and the next middleware function (`next`).  
Capabilities:
- 1. Execute arbitrary code (logging, rate limiting).
- 2. Make changes to the request and response objects (`req.user = decodedToken`).
- 3. End the request-response cycle (`res.status(401).json({ error: 'Unauthorized' })`).
- 4. Call the next middleware in the stack (`next()`).
Error-handling middleware must declare four parameters: `app.use((err, req, res, next) => { ... })`.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
Node.js & Express REST API Notes
MIDDLEWARE IN EXPRESS
Middleware functions are functions that have access to the request object (`req`), response object (`res`), and the next middleware function (`next`).  
Capabilities:
- 1. Execute arbitrary code ...
```

##### C1 Chunk 3 (Tokens: 327, Contextualized Tokens: 341)
* **Hierarchical Headings:** `['Node.js & Express REST API Notes', 'RESTFUL API DESIGN PRINCIPLES']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
- - Resource-oriented URLs using plural nouns: `/api/students`, `/api/courses`, `/api/materials`.
- - HTTP Verbs indicate actions:
- - GET: Retrieve resource(s). Must be idempotent and safe.
- - POST: Create a new resource.
- - PUT: Replace resource completely.
- - PATCH: Partially update resource fields.
- - DELETE: Remove resource.
- - Standard HTTP Status Codes:
- - 200 OK: Successful request.
- - 201 Created: Resource successfully created.
- - 400 Bad Request: Invalid input or missing parameters.
- - 401 Unauthorized: Missing or invalid authentication token.
- - 403 Forbidden: Authenticated user lacks permission for this action.
- - 404 Not Found: Requested resource does not exist.
- - 500 Internal Server Error: Unhandled server failure.
JWT (JSON WEB TOKEN) AUTHENTICATION:  
A compact, URL-safe means of representing claims between parties.  
Structure: Header.Payload.Signature (Base64Url-encoded).  
Authentication flow:
- 1. Student submits credentials (email/password).
- 2. Server validates credentials and signs token with private secret:
   `const token = jwt.sign({ id: student.id, role: 'STUDENT' }, SECRET, { expiresIn: '7d' });`
- 3. Client stores token and sends it in the Authorization header: `Bearer <token>`.
- 4. Auth middleware verifies token signature on protected endpoints.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
Node.js & Express REST API Notes
RESTFUL API DESIGN PRINCIPLES
- - Resource-oriented URLs using plural nouns: `/api/students`, `/api/courses`, `/api/materials`.
- - HTTP Verbs indicate actions:
- - GET: Retrieve resource(s). Must be idempotent and sa...
```

#### C0 Baseline Representative Chunks:
##### C0 Chunk 0 (Tokens: 174)
* **Raw Chunk Text:**
```text
NODE.JS ARCHITECTURE & EVENT LOOP:
Node.js is an asynchronous, event-driven JavaScript runtime built on Chrome's V8 engine and Libuv.
Key components:
- Single Main Thread executes JavaScript code sequentially.
- Libuv provides a thread pool (default 4 worker threads) to handle non-blocking asynchronous I/O operations like file system reads, DNS lookups, and crypto hashing.
- The Event Loop continuously checks phases: Timers (setTimeout) -> Pending Callbacks -> Idle/Prepare -> Poll (I/O) -> Check (setImmediate) -> Close Callbacks.
Avoid CPU-intensive operations (heavy loops, synchronous encryption) on the main thread to prevent blocking event handling.
```

##### C0 Chunk 1 (Tokens: 84)
* **Raw Chunk Text:**
```text
EXPRESS.JS CORE CONCEPTS:
Express is a fast, unopinionated minimalist web framework for Node.js.
Basic structure:
```javascript
const express = require('express');
const app = express();
app.use(express.json()); // Built-in middleware to parse incoming JSON bodies
```
```

##### C0 Chunk 2 (Tokens: 169)
* **Raw Chunk Text:**
```text
MIDDLEWARE IN EXPRESS:
Middleware functions are functions that have access to the request object (`req`), response object (`res`), and the next middleware function (`next`).
Capabilities:
1. Execute arbitrary code (logging, rate limiting).
2. Make changes to the request and response objects (`req.user = decodedToken`).
3. End the request-response cycle (`res.status(401).json({ error: 'Unauthorized' })`).
4. Call the next middleware in the stack (`next()`).
Error-handling middleware must declare four parameters: `app.use((err, req, res, next) => { ... })`.
```

##### C0 Chunk 3 (Tokens: 171)
* **Raw Chunk Text:**
```text
RESTFUL API DESIGN PRINCIPLES:
- Resource-oriented URLs using plural nouns: `/api/students`, `/api/courses`, `/api/materials`.
- HTTP Verbs indicate actions:
  - GET: Retrieve resource(s). Must be idempotent and safe.
  - POST: Create a new resource.
  - PUT: Replace resource completely.
  - PATCH: Partially update resource fields.
  - DELETE: Remove resource.
- Standard HTTP Status Codes:
  - 200 OK: Successful request.
  - 201 Created: Resource successfully created.
  - 400 Bad Request: Invalid input or missing parameters.
  - 401 Unauthorized: Missing or invalid authentication token.
  - 403 Forbidden: Authenticated user lacks permission for this action.
  - 404 Not Found: Requested resource does not exist.
  - 500 Internal Server Error: Unhandled server failure.
```

##### C0 Chunk 4 (Tokens: 145)
* **Raw Chunk Text:**
```text
JWT (JSON WEB TOKEN) AUTHENTICATION:
A compact, URL-safe means of representing claims between parties.
Structure: Header.Payload.Signature (Base64Url-encoded).
Authentication flow:
1. Student submits credentials (email/password).
2. Server validates credentials and signs token with private secret:
   `const token = jwt.sign({ id: student.id, role: 'STUDENT' }, SECRET, { expiresIn: '7d' });`
3. Client stores token and sends it in the Authorization header: `Bearer <token>`.
4. Auth middleware verifies token signature on protected endpoints.
```

---

### Document: React Hooks Tutorial
* **Material ID:** `abc6db98-3d75-40ea-b988-f1e8a7497bba`
* **C0 Baseline Chunks:** 6
* **C1 Docling Chunks:** 5

#### C1 Docling Representative Chunks:
##### C1 Chunk 0 (Tokens: 64, Contextualized Tokens: 73)
* **Hierarchical Headings:** `['React Hooks Tutorial', 'REACT HOOKS OVERVIEW & RULES']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
Hooks allow functional components to utilize state and lifecycle features without writing class components.  
Rules of Hooks:
- 1. Only call Hooks at the top level of your component. Do not call Hooks inside loops, conditions, or nested functions.
- 2. Only call Hooks from React function components or custom Hooks.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
React Hooks Tutorial
REACT HOOKS OVERVIEW & RULES
Hooks allow functional components to utilize state and lifecycle features without writing class components.  
Rules of Hooks:
- 1. Only call Hooks at the top level of your component. Do not call Hooks...
```

##### C1 Chunk 1 (Tokens: 116, Contextualized Tokens: 123)
* **Hierarchical Headings:** `['React Hooks Tutorial', 'USESTATE HOOK']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
`const [state, setState] = useState(initialValue);`
- - When updating state based on previous state, always use the functional updater pattern:
  `setCount(prev => prev + 1);`
- - State updates in React 18 are batched automatically across event handlers, promises, and timeouts.
- - React state is immutable: always pass a new copy of arrays or objects (`setItems([...items, newItem])`).
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
React Hooks Tutorial
USESTATE HOOK
`const [state, setState] = useState(initialValue);`
- - When updating state based on previous state, always use the functional updater pattern:
  `setCount(prev => prev + 1);`
- - State updates in React 18 are batch...
```

##### C1 Chunk 2 (Tokens: 183, Contextualized Tokens: 191)
* **Hierarchical Headings:** `['React Hooks Tutorial', 'USEEFFECT HOOK']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
Performs side effects (data fetching, DOM mutations, subscriptions) in function components.  
`useEffect(() => { ... return () => cleanup(); }, [dependencies]);`
- - No dependency array `useEffect(() => {})`: Runs after EVERY render.
- - Empty array `useEffect(() => {}, [])`: Runs ONCE after initial mount.
- - With dependencies `useEffect(() => {}, [userId])`: Runs after mount and when any dependency value changes by shallow comparison (Object.is).
- - Cleanup function: Returned function executes before the component unmounts and before each re-execution of the effect to clear subscriptions, abort network controllers, or remove event listeners.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
React Hooks Tutorial
USEEFFECT HOOK
Performs side effects (data fetching, DOM mutations, subscriptions) in function components.  
`useEffect(() => { ... return () => cleanup(); }, [dependencies]);`
- - No dependency array `useEffect(() => {})`: Runs ...
```

##### C1 Chunk 3 (Tokens: 233, Contextualized Tokens: 243)
* **Hierarchical Headings:** `['React Hooks Tutorial', 'USECONTEXT & STATE PROPAGATION']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
Enables sharing global state (user profile, theme, auth token) across components without manual prop drilling.
- 1. Create context: `const AuthContext = createContext(null);`
- 2. Provide context: `<AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>`
- 3. Consume context: `const { user } = useContext(AuthContext);`
PERFORMANCE HOOKS: USEMEMO & USECALLBACK:
- - useMemo: Memoizes the result of an expensive calculation:
  `const filteredList = useMemo(() => items.filter(heavyCheck), [items]);`
- - useCallback: Memoizes a callback function definition between renders, preventing unnecessary child re-renders when passing callbacks to React.memo components:
  `const handleClick = useCallback(() => { doSomething(id); }, [id]);`
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
React Hooks Tutorial
USECONTEXT & STATE PROPAGATION
Enables sharing global state (user profile, theme, auth token) across components without manual prop drilling.
- 1. Create context: `const AuthContext = createContext(null);`
- 2. Provide context: `...
```

##### C1 Chunk 4 (Tokens: 83, Contextualized Tokens: 90)
* **Hierarchical Headings:** `['React Hooks Tutorial', 'USEREF HOOK']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
Returns a mutable ref object whose `.current` property persists across the entire component lifetime without triggering a re-render when changed:
- 1. Referencing DOM elements: `<input ref={inputRef} />` -> `inputRef.current.focus();`
- 2. Storing mutable values: Timer IDs, previous state values, render counts.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
React Hooks Tutorial
USEREF HOOK
Returns a mutable ref object whose `.current` property persists across the entire component lifetime without triggering a re-render when changed:
- 1. Referencing DOM elements: `<input ref={inputRef} />` -> `inputRef....
```

#### C0 Baseline Representative Chunks:
##### C0 Chunk 0 (Tokens: 68)
* **Raw Chunk Text:**
```text
REACT HOOKS OVERVIEW & RULES:
Hooks allow functional components to utilize state and lifecycle features without writing class components.
Rules of Hooks:
1. Only call Hooks at the top level of your component. Do not call Hooks inside loops, conditions, or nested functions.
2. Only call Hooks from React function components or custom Hooks.
```

##### C0 Chunk 1 (Tokens: 117)
* **Raw Chunk Text:**
```text
USESTATE HOOK:
`const [state, setState] = useState(initialValue);`
- When updating state based on previous state, always use the functional updater pattern:
  `setCount(prev => prev + 1);`
- State updates in React 18 are batched automatically across event handlers, promises, and timeouts.
- React state is immutable: always pass a new copy of arrays or objects (`setItems([...items, newItem])`).
```

##### C0 Chunk 2 (Tokens: 184)
* **Raw Chunk Text:**
```text
USEEFFECT HOOK:
Performs side effects (data fetching, DOM mutations, subscriptions) in function components.
`useEffect(() => { ... return () => cleanup(); }, [dependencies]);`
- No dependency array `useEffect(() => {})`: Runs after EVERY render.
- Empty array `useEffect(() => {}, [])`: Runs ONCE after initial mount.
- With dependencies `useEffect(() => {}, [userId])`: Runs after mount and when any dependency value changes by shallow comparison (Object.is).
- Cleanup function: Returned function executes before the component unmounts and before each re-execution of the effect to clear subscriptions, abort network controllers, or remove event listeners.
```

##### C0 Chunk 3 (Tokens: 114)
* **Raw Chunk Text:**
```text
USECONTEXT & STATE PROPAGATION:
Enables sharing global state (user profile, theme, auth token) across components without manual prop drilling.
1. Create context: `const AuthContext = createContext(null);`
2. Provide context: `<AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>`
3. Consume context: `const { user } = useContext(AuthContext);`
```

##### C0 Chunk 4 (Tokens: 123)
* **Raw Chunk Text:**
```text
PERFORMANCE HOOKS: USEMEMO & USECALLBACK:
- useMemo: Memoizes the result of an expensive calculation:
  `const filteredList = useMemo(() => items.filter(heavyCheck), [items]);`
- useCallback: Memoizes a callback function definition between renders, preventing unnecessary child re-renders when passing callbacks to React.memo components:
  `const handleClick = useCallback(() => { doSomething(id); }, [id]);`
```

##### C0 Chunk 5 (Tokens: 85)
* **Raw Chunk Text:**
```text
USEREF HOOK:
Returns a mutable ref object whose `.current` property persists across the entire component lifetime without triggering a re-render when changed:
1. Referencing DOM elements: `<input ref={inputRef} />` -> `inputRef.current.focus();`
2. Storing mutable values: Timer IDs, previous state values, render counts.
```

---

### Document: JavaScript ES6+ Deep Dive
* **Material ID:** `c254cc49-47b8-455f-bc9e-bc834c0276fe`
* **C0 Baseline Chunks:** 4
* **C1 Docling Chunks:** 4

#### C1 Docling Representative Chunks:
##### C1 Chunk 0 (Tokens: 144, Contextualized Tokens: 157)
* **Hierarchical Headings:** `['JavaScript ES6+ Deep Dive', 'VARIABLE DECLARATIONS & SCOPING']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
ES6 introduced `let` and `const` to replace `var`:
- - var: Function-scoped, hoisted with an initial value of undefined, and allows re-declaration. This often caused subtle bugs.
- - let: Block-scoped (confined within { }), hoisted into the Temporal Dead Zone (TDZ) where accessing it before declaration throws a ReferenceError. Allows re-assignment but not re-declaration in the same scope.
- - const: Block-scoped, also TDZ hoisted. Must be initialized upon declaration and cannot be reassigned. However, objects and arrays declared with const remain mutable in their properties and elements.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
JavaScript ES6+ Deep Dive
VARIABLE DECLARATIONS & SCOPING
ES6 introduced `let` and `const` to replace `var`:
- - var: Function-scoped, hoisted with an initial value of undefined, and allows re-declaration. This often caused subtle bugs.
- - let: Bloc...
```

##### C1 Chunk 1 (Tokens: 140, Contextualized Tokens: 153)
* **Hierarchical Headings:** `['JavaScript ES6+ Deep Dive', 'ARROW FUNCTIONS & LEXICAL THIS']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
Arrow functions provide concise syntax: `const add = (a, b) => a + b;`  
Key differences from regular functions:
- 1. Lexical `this`: Arrow functions do not bind their own `this`; they inherit `this` from the enclosing lexical execution context. This eliminates the need for `.bind(this)` or `const self = this` in callbacks.
- 2. No `arguments` object: Use rest parameters `(...args)` instead.
- 3. Cannot be used as constructors: Invoking an arrow function with `new` throws a TypeError.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
JavaScript ES6+ Deep Dive
ARROW FUNCTIONS & LEXICAL THIS
Arrow functions provide concise syntax: `const add = (a, b) => a + b;`  
Key differences from regular functions:
- 1. Lexical `this`: Arrow functions do not bind their own `this`; they inherit ...
```

##### C1 Chunk 2 (Tokens: 158, Contextualized Tokens: 173)
* **Hierarchical Headings:** `['JavaScript ES6+ Deep Dive', 'DESTRUCTURING, SPREAD & REST OPERATORS']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
- - Object Destructuring: `const { name, age, role = 'student' } = user;` extracts properties into local variables with optional defaults.
- - Array Destructuring: `const [first, second, ...rest] = items;`
- - Spread Operator (`...`): Expands an iterable into individual elements. Used for shallow copying (`const copy = { ...original };`) and merging (`const merged = [...arr1, ...arr2];`).
- - Rest Parameters (`...args`): Condenses multiple function arguments into a true Array object inside the function body.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
JavaScript ES6+ Deep Dive
DESTRUCTURING, SPREAD & REST OPERATORS
- - Object Destructuring: `const { name, age, role = 'student' } = user;` extracts properties into local variables with optional defaults.
- - Array Destructuring: `const [first, second...
```

##### C1 Chunk 3 (Tokens: 331, Contextualized Tokens: 347)
* **Hierarchical Headings:** `['JavaScript ES6+ Deep Dive', 'ASYNCHRONOUS JAVASCRIPT & PROMISES']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
JavaScript is single-threaded and uses an event loop with a Call Stack, Web APIs, Task Queue (Macrotasks: setTimeout, setInterval), and Microtask Queue (Promises, queueMicrotask). Microtasks always take priority over macrotasks.  
A Promise represents an asynchronous operation with three states: pending, fulfilled, or rejected.  
Example promise creation:
```
const fetchData = () => new Promise((resolve, reject) => {
  setTimeout(() => resolve({ id: 1, name: "Arjun" }), 500);
});
```
Async/Await Syntax:  
Built on top of Promises, `async/await` allows asynchronous code to be written sequentially:
```
async function loadStudent() {
  try {
    const student = await fetchData();
    console.log("Loaded:", student.name);
  } catch (error) {
    console.error("Fetch failed:", error.message);
  }
}
```
Promise Utilities:
- - Promise.all([p1, p2]): Fails fast if any promise rejects; returns array of results when all resolve.
- - Promise.allSettled([p1, p2]): Waits for all promises to settle regardless of outcome.
- - Promise.race([p1, p2]): Resolves or rejects as soon as the first promise settles.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
JavaScript ES6+ Deep Dive
ASYNCHRONOUS JAVASCRIPT & PROMISES
JavaScript is single-threaded and uses an event loop with a Call Stack, Web APIs, Task Queue (Macrotasks: setTimeout, setInterval), and Microtask Queue (Promises, queueMicrotask). Microtask...
```

#### C0 Baseline Representative Chunks:
##### C0 Chunk 0 (Tokens: 148)
* **Raw Chunk Text:**
```text
VARIABLE DECLARATIONS & SCOPING:
ES6 introduced `let` and `const` to replace `var`:
- var: Function-scoped, hoisted with an initial value of undefined, and allows re-declaration. This often caused subtle bugs.
- let: Block-scoped (confined within { }), hoisted into the Temporal Dead Zone (TDZ) where accessing it before declaration throws a ReferenceError. Allows re-assignment but not re-declaration in the same scope.
- const: Block-scoped, also TDZ hoisted. Must be initialized upon declaration and cannot be reassigned. However, objects and arrays declared with const remain mutable in their properties and elements.
```

##### C0 Chunk 1 (Tokens: 144)
* **Raw Chunk Text:**
```text
ARROW FUNCTIONS & LEXICAL THIS:
Arrow functions provide concise syntax: `const add = (a, b) => a + b;`
Key differences from regular functions:
1. Lexical `this`: Arrow functions do not bind their own `this`; they inherit `this` from the enclosing lexical execution context. This eliminates the need for `.bind(this)` or `const self = this` in callbacks.
2. No `arguments` object: Use rest parameters `(...args)` instead.
3. Cannot be used as constructors: Invoking an arrow function with `new` throws a TypeError.
```

##### C0 Chunk 2 (Tokens: 163)
* **Raw Chunk Text:**
```text
DESTRUCTURING, SPREAD & REST OPERATORS:
- Object Destructuring: `const { name, age, role = 'student' } = user;` extracts properties into local variables with optional defaults.
- Array Destructuring: `const [first, second, ...rest] = items;`
- Spread Operator (`...`): Expands an iterable into individual elements. Used for shallow copying (`const copy = { ...original };`) and merging (`const merged = [...arr1, ...arr2];`).
- Rest Parameters (`...args`): Condenses multiple function arguments into a true Array object inside the function body.
```

##### C0 Chunk 3 (Tokens: 342)
* **Raw Chunk Text:**
```text
ASYNCHRONOUS JAVASCRIPT & PROMISES:
JavaScript is single-threaded and uses an event loop with a Call Stack, Web APIs, Task Queue (Macrotasks: setTimeout, setInterval), and Microtask Queue (Promises, queueMicrotask). Microtasks always take priority over macrotasks.
A Promise represents an asynchronous operation with three states: pending, fulfilled, or rejected.
Example promise creation:
```javascript
const fetchData = () => new Promise((resolve, reject) => {
  setTimeout(() => resolve({ id: 1, name: "Arjun" }), 500);
});
```
Async/Await Syntax:
Built on top of Promises, `async/await` allows asynchronous code to be written sequentially:
```javascript
async function loadStudent() {
  try {
    const student = await fetchData();
    console.log("Loaded:", student.name);
  } catch (error) {
    console.error("Fetch failed:", error.message);
  }
}
```
Promise Utilities:
- Promise.all([p1, p2]): Fails fast if any promise rejects; returns array of results when all resolve.
- Promise.allSettled([p1, p2]): Waits for all promises to settle regardless of outcome.
- Promise.race([p1, p2]): Resolves or rejects as soon as the first promise settles.
```

---

### Document: PostgreSQL Database Design
* **Material ID:** `d4e9dcd2-3b77-4e67-afa5-2d04001d09d0`
* **C0 Baseline Chunks:** 4
* **C1 Docling Chunks:** 4

#### C1 Docling Representative Chunks:
##### C1 Chunk 0 (Tokens: 167, Contextualized Tokens: 177)
* **Hierarchical Headings:** `['PostgreSQL Database Design', 'RELATIONAL DATABASE MODELING']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
A relational database organizes data into tables (relations) with rows (tuples) and columns (attributes).  
Relationship types:
- - One-to-One (1:1): e.g., Student to StudentProfile. Stored by placing a UNIQUE foreign key in one of the tables.
- - One-to-Many (1:N): e.g., Course to Batches. Foreign key is placed in the child table (batches table has course_id references courses(id)).
- - Many-to-Many (M:N): e.g., Students to Batches. Requires a junction (associative) table with composite primary key or foreign keys (student_batches table with student_id and batch_id).
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
PostgreSQL Database Design
RELATIONAL DATABASE MODELING
A relational database organizes data into tables (relations) with rows (tuples) and columns (attributes).  
Relationship types:
- - One-to-One (1:1): e.g., Student to StudentProfile. Stored by p...
```

##### C1 Chunk 1 (Tokens: 165, Contextualized Tokens: 176)
* **Hierarchical Headings:** `['PostgreSQL Database Design', 'DATABASE NORMALIZATION FORMS']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
Normalization eliminates data redundancy and prevents insertion, update, and deletion anomalies.
- 1. First Normal Form (1NF):
- - Each column contains atomic (indivisible) values.
- - Each record is uniquely identified by a primary key.
- - No repeating groups of columns.
- 2. Second Normal Form (2NF):
- - Meets 1NF.
- - All non-key attributes must be fully functionally dependent on the entire primary key (eliminates partial dependency in composite primary keys).
- 3. Third Normal Form (3NF):
- - Meets 2NF.
- - No transitive dependencies: non-key attributes must depend directly on the primary key, not on another non-key attribute.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
PostgreSQL Database Design
DATABASE NORMALIZATION FORMS
Normalization eliminates data redundancy and prevents insertion, update, and deletion anomalies.
- 1. First Normal Form (1NF):
- - Each column contains atomic (indivisible) values.
- - Each reco...
```

##### C1 Chunk 2 (Tokens: 247, Contextualized Tokens: 259)
* **Hierarchical Headings:** `['PostgreSQL Database Design', 'INDEXING STRATEGIES & PERFORMANCE']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
An index is a separate data structure (typically a B-tree in PostgreSQL) that allows fast lookups without scanning every row in a table.  
Types of indexes:
- - B-Tree Index: Default index. Excellent for equality (`=`), range queries (`<`, `<=`, `>`, `>=`), and sorting (`ORDER BY`).
- - Unique Index: Enforces uniqueness constraint while indexing (`CREATE UNIQUE INDEX ...`).
- - Composite Index: Indexes multiple columns together. Column order matters (Leftmost prefix rule: an index on (course_id, date) supports queries on course_id alone, but not date alone).
- - Inverted/GIN Index: Used for JSONB, full-text search, and array containment.
- - Vector Index (IVFFlat/HNSW): Used in pgvector for high-dimensional approximate nearest neighbor searches using cosine or L2 distance.
Index tradeoffs: Indexes speed up SELECT queries but add overhead to INSERT, UPDATE, and DELETE operations, and consume disk space.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
PostgreSQL Database Design
INDEXING STRATEGIES & PERFORMANCE
An index is a separate data structure (typically a B-tree in PostgreSQL) that allows fast lookups without scanning every row in a table.  
Types of indexes:
- - B-Tree Index: Default index....
```

##### C1 Chunk 3 (Tokens: 138, Contextualized Tokens: 147)
* **Hierarchical Headings:** `['PostgreSQL Database Design', 'ACID TRANSACTIONS']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
A transaction is a sequence of SQL statements executed as a single unit of work.
- - Atomicity: All operations succeed, or all are rolled back. No partial changes (`COMMIT` or `ROLLBACK`).
- - Consistency: Data transitions from one valid state to another, respecting all constraints, foreign keys, and triggers.
- - Isolation: Concurrent transactions do not interfere with each other. Isolation levels: Read Uncommitted, Read Committed (Postgres default), Repeatable Read, Serializable.
- - Durability: Once a transaction commits, its changes survive crashes and power failures (persisted via Write-Ahead Logging / WAL).
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
PostgreSQL Database Design
ACID TRANSACTIONS
A transaction is a sequence of SQL statements executed as a single unit of work.
- - Atomicity: All operations succeed, or all are rolled back. No partial changes (`COMMIT` or `ROLLBACK`).
- - Consistency:...
```

#### C0 Baseline Representative Chunks:
##### C0 Chunk 0 (Tokens: 168)
* **Raw Chunk Text:**
```text
RELATIONAL DATABASE MODELING:
A relational database organizes data into tables (relations) with rows (tuples) and columns (attributes).
Relationship types:
- One-to-One (1:1): e.g., Student to StudentProfile. Stored by placing a UNIQUE foreign key in one of the tables.
- One-to-Many (1:N): e.g., Course to Batches. Foreign key is placed in the child table (batches table has course_id references courses(id)).
- Many-to-Many (M:N): e.g., Students to Batches. Requires a junction (associative) table with composite primary key or foreign keys (student_batches table with student_id and batch_id).
```

##### C0 Chunk 1 (Tokens: 160)
* **Raw Chunk Text:**
```text
DATABASE NORMALIZATION FORMS:
Normalization eliminates data redundancy and prevents insertion, update, and deletion anomalies.
1. First Normal Form (1NF):
   - Each column contains atomic (indivisible) values.
   - Each record is uniquely identified by a primary key.
   - No repeating groups of columns.
2. Second Normal Form (2NF):
   - Meets 1NF.
   - All non-key attributes must be fully functionally dependent on the entire primary key (eliminates partial dependency in composite primary keys).
3. Third Normal Form (3NF):
   - Meets 2NF.
   - No transitive dependencies: non-key attributes must depend directly on the primary key, not on another non-key attribute.
```

##### C0 Chunk 2 (Tokens: 248)
* **Raw Chunk Text:**
```text
INDEXING STRATEGIES & PERFORMANCE:
An index is a separate data structure (typically a B-tree in PostgreSQL) that allows fast lookups without scanning every row in a table.
Types of indexes:
- B-Tree Index: Default index. Excellent for equality (`=`), range queries (`<`, `<=`, `>`, `>=`), and sorting (`ORDER BY`).
- Unique Index: Enforces uniqueness constraint while indexing (`CREATE UNIQUE INDEX ...`).
- Composite Index: Indexes multiple columns together. Column order matters (Leftmost prefix rule: an index on (course_id, date) supports queries on course_id alone, but not date alone).
- Inverted/GIN Index: Used for JSONB, full-text search, and array containment.
- Vector Index (IVFFlat/HNSW): Used in pgvector for high-dimensional approximate nearest neighbor searches using cosine or L2 distance.
Index tradeoffs: Indexes speed up SELECT queries but add overhead to INSERT, UPDATE, and DELETE operations, and consume disk space.
```

##### C0 Chunk 3 (Tokens: 137)
* **Raw Chunk Text:**
```text
ACID TRANSACTIONS:
A transaction is a sequence of SQL statements executed as a single unit of work.
- Atomicity: All operations succeed, or all are rolled back. No partial changes (`COMMIT` or `ROLLBACK`).
- Consistency: Data transitions from one valid state to another, respecting all constraints, foreign keys, and triggers.
- Isolation: Concurrent transactions do not interfere with each other. Isolation levels: Read Uncommitted, Read Committed (Postgres default), Repeatable Read, Serializable.
- Durability: Once a transaction commits, its changes survive crashes and power failures (persisted via Write-Ahead Logging / WAL).
```

---

### Document: HTML & CSS Fundamentals
* **Material ID:** `ea1f3b17-0657-4ee2-b155-c56b775dd25e`
* **C0 Baseline Chunks:** 4
* **C1 Docling Chunks:** 4

#### C1 Docling Representative Chunks:
##### C1 Chunk 0 (Tokens: 185, Contextualized Tokens: 195)
* **Hierarchical Headings:** `['HTML & CSS Fundamentals', 'HTML5 SEMANTIC ELEMENTS']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
Semantic HTML elements clearly describe their meaning to both the browser and the developer. Key structural elements include:
- - <header>: Represents introductory content or a set of navigational links.
- - <nav>: Defines a set of major navigation links.
- - <main>: Specifies the main, unique content of the document. There must not be more than one <main> element in a document.
- - <article>: Represents a self-contained composition (e.g., blog post, forum post, product card) that is independently distributable.
- - <section>: Represents a standalone section of functionality or thematic grouping of content.
- - <footer>: Contains author information, copyright, or footer links.
Using semantic tags improves SEO, screen-reader accessibility (A11y), and code maintainability over generic <div> tags.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
HTML & CSS Fundamentals
HTML5 SEMANTIC ELEMENTS
Semantic HTML elements clearly describe their meaning to both the browser and the developer. Key structural elements include:
- - <header>: Represents introductory content or a set of navigational links...
```

##### C1 Chunk 1 (Tokens: 181, Contextualized Tokens: 191)
* **Hierarchical Headings:** `['HTML & CSS Fundamentals', 'CSS BOX MODEL']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
Every HTML element in a document tree is formatted as a rectangular box. The CSS box model consists of four distinct layers from inside out:
- 1. Content: The actual text, image, or media content of the box. Controlled via width and height.
- 2. Padding: Transparent area clearing space around the content inside the border.
- 3. Border: A border surrounding the padding and content (e.g., border: 1px solid #ccc).
- 4. Margin: Transparent space outside the border separating the element from neighboring elements.
By default, box-sizing is content-box, meaning padding and border are added onto the specified width. Modern web development universally recommends:
- * { box-sizing: border-box; }
This ensures padding and borders are included within the element's total declared width and height.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
HTML & CSS Fundamentals
CSS BOX MODEL
Every HTML element in a document tree is formatted as a rectangular box. The CSS box model consists of four distinct layers from inside out:
- 1. Content: The actual text, image, or media content of the box. Cont...
```

##### C1 Chunk 2 (Tokens: 292, Contextualized Tokens: 304)
* **Hierarchical Headings:** `['HTML & CSS Fundamentals', 'CSS FLEXBOX LAYOUT GUIDE']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
Flexbox (Flexible Box Layout) is a 1-dimensional layout model designed for distributing space along a single axis (row or column).  
Core container properties:
- - display: flex (initiates the flex formatting context).
- - flex-direction: row (default, left to right) | column (top to bottom) | row-reverse | column-reverse.
- - justify-content: Controls alignment along the Main Axis: flex-start, flex-end, center, space-between (equal space between items), space-around, space-evenly.
- - align-items: Controls alignment along the Cross Axis: stretch (default), center, flex-start, flex-end, baseline.
- - flex-wrap: nowrap (default) | wrap | wrap-reverse. Allows items to break into multiple lines.
- - gap: Defines spacing between flex items without using margins (e.g., gap: 1rem).
Core child properties:
- - flex-grow: Defines the ability for a flex item to grow if necessary (default 0).
- - flex-shrink: Defines the ability for a flex item to shrink if necessary (default 1).
- - flex-basis: The default size of an element before the remaining space is distributed (e.g., flex-basis: 250px). Shorthand: flex: 1 1 auto.
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
HTML & CSS Fundamentals
CSS FLEXBOX LAYOUT GUIDE
Flexbox (Flexible Box Layout) is a 1-dimensional layout model designed for distributing space along a single axis (row or column).  
Core container properties:
- - display: flex (initiates the flex for...
```

##### C1 Chunk 3 (Tokens: 164, Contextualized Tokens: 174)
* **Hierarchical Headings:** `['HTML & CSS Fundamentals', 'CSS GRID SYSTEM']`
* **Originating Page:** `1`
* **Raw Evidence Text (`raw_text`):**
```text
CSS Grid is a 2-dimensional layout system designed for both columns and rows simultaneously.
- - display: grid: Activates grid container.
- - grid-template-columns: Defines track sizes for columns (e.g., repeat(3, 1fr) creates 3 equal columns; repeat(auto-fit, minmax(280px, 1fr)) creates responsive fluid columns without media queries).
- - grid-template-rows: Defines track sizes for rows.
- - gap: Sets spacing between grid cells (e.g., gap: 24px).
- - grid-column / grid-row: Specifies an item's start and end line positions (e.g., grid-column: span 2 spans across two columns).
```
* **Contextualized Embedding Text (`embedding_text`):**
```text
HTML & CSS Fundamentals
CSS GRID SYSTEM
CSS Grid is a 2-dimensional layout system designed for both columns and rows simultaneously.
- - display: grid: Activates grid container.
- - grid-template-columns: Defines track sizes for columns (e.g., repeat...
```

#### C0 Baseline Representative Chunks:
##### C0 Chunk 0 (Tokens: 184)
* **Raw Chunk Text:**
```text
HTML5 SEMANTIC ELEMENTS:
Semantic HTML elements clearly describe their meaning to both the browser and the developer. Key structural elements include:
- <header>: Represents introductory content or a set of navigational links.
- <nav>: Defines a set of major navigation links.
- <main>: Specifies the main, unique content of the document. There must not be more than one <main> element in a document.
- <article>: Represents a self-contained composition (e.g., blog post, forum post, product card) that is independently distributable.
- <section>: Represents a standalone section of functionality or thematic grouping of content.
- <footer>: Contains author information, copyright, or footer links.
Using semantic tags improves SEO, screen-reader accessibility (A11y), and code maintainability over generic <div> tags.
```

##### C0 Chunk 1 (Tokens: 181)
* **Raw Chunk Text:**
```text
CSS BOX MODEL:
Every HTML element in a document tree is formatted as a rectangular box. The CSS box model consists of four distinct layers from inside out:
1. Content: The actual text, image, or media content of the box. Controlled via width and height.
2. Padding: Transparent area clearing space around the content inside the border.
3. Border: A border surrounding the padding and content (e.g., border: 1px solid #ccc).
4. Margin: Transparent space outside the border separating the element from neighboring elements.
By default, box-sizing is content-box, meaning padding and border are added onto the specified width. Modern web development universally recommends:
* { box-sizing: border-box; }
This ensures padding and borders are included within the element's total declared width and height.
```

##### C0 Chunk 2 (Tokens: 290)
* **Raw Chunk Text:**
```text
CSS FLEXBOX LAYOUT GUIDE:
Flexbox (Flexible Box Layout) is a 1-dimensional layout model designed for distributing space along a single axis (row or column).
Core container properties:
- display: flex (initiates the flex formatting context).
- flex-direction: row (default, left to right) | column (top to bottom) | row-reverse | column-reverse.
- justify-content: Controls alignment along the Main Axis: flex-start, flex-end, center, space-between (equal space between items), space-around, space-evenly.
- align-items: Controls alignment along the Cross Axis: stretch (default), center, flex-start, flex-end, baseline.
- flex-wrap: nowrap (default) | wrap | wrap-reverse. Allows items to break into multiple lines.
- gap: Defines spacing between flex items without using margins (e.g., gap: 1rem).
Core child properties:
- flex-grow: Defines the ability for a flex item to grow if necessary (default 0).
- flex-shrink: Defines the ability for a flex item to shrink if necessary (default 1).
- flex-basis: The default size of an element before the remaining space is distributed (e.g., flex-basis: 250px). Shorthand: flex: 1 1 auto.
```

##### C0 Chunk 3 (Tokens: 164)
* **Raw Chunk Text:**
```text
CSS GRID SYSTEM:
CSS Grid is a 2-dimensional layout system designed for both columns and rows simultaneously.
- display: grid: Activates grid container.
- grid-template-columns: Defines track sizes for columns (e.g., repeat(3, 1fr) creates 3 equal columns; repeat(auto-fit, minmax(280px, 1fr)) creates responsive fluid columns without media queries).
- grid-template-rows: Defines track sizes for rows.
- gap: Sets spacing between grid cells (e.g., gap: 24px).
- grid-column / grid-row: Specifies an item's start and end line positions (e.g., grid-column: span 2 spans across two columns).
```

---
