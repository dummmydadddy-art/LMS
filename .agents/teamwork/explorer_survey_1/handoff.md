# Handoff Report: R1 AI Tutor Chat Modal & StudentDashboard Survey

**Investigator**: `explorer_survey_1`  
**Date**: 2026-10-03  
**Target Milestone**: R1 — Upgrade AI Tutor Chat Modal & StudentDashboard Integration

---

## 1. Observation

### 1.1 `frontend/src/components/AiTutorModal.tsx`
- **Props interface (lines 19–25)**:
  ```typescript
  interface AiTutorModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId?: string;
    batchId?: string;
    courseName?: string;
  }
  ```
  `studentId` is **missing** from `AiTutorModalProps`.
- **SourceCitation & ChatMessage interfaces (lines 5–17)**:
  ```typescript
  interface SourceCitation {
    title: string;
    chunk_index: number;
    similarity: number;
  }

  interface ChatMessage {
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    sources?: SourceCitation[];
    timestamp: string;
  }
  ```
  Neither `page`, `page_citation`, `page_number`, `interpretedQuery`, `isAbstained`, nor `backend` are tracked in the state model.
- **API Call (lines 76–85)**:
  ```typescript
  const res = await api.post('/api/rag/ask', {
    question: q,
    course_id: courseId,
    batch_id: batchId
  });
  ```
  The request currently does **not** send `student_id` in the request body, and does **not** include the required header `X-Service-Key: lms-n8n-service-key-2026`.
- **Source Citation Rendering (lines 150–166)**:
  ```tsx
  {m.sources.map((s, idx) => (
    <span
      key={idx}
      className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100"
    >
      {s.title} (Sec {s.chunk_index + 1}) • {Math.round(s.similarity * 100)}%
    </span>
  ))}
  ```
  No page numbers or page citations are rendered.
- **Header (lines 112–131)**:
  Contains only the title, RAG badge, and the close button (`X`). It has **no** "New Conversation" button.
- **Out-of-domain and CRAG responses**:
  Rendered identically to standard assistant messages in a white bubble without distinction.
- **Query rewriting indicator**:
  Completely unhandled; `res.data?.query_condensation` is ignored.

---

### 1.2 `frontend/src/pages/student/StudentDashboard.tsx`
- **Student ID state (lines 52–60)**:
  ```typescript
  const [studentId, setStudentId] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setStudentId(user.id);
      }
    });
  }, []);
  ```
  `studentId` is successfully retrieved from Supabase auth and stored in component state.
- **Active course state (lines 254, 330, 713)**:
  `activeCourse` holds the student's selected course object (e.g., `id`, `course_name`, `batch_id`).
- **AI Tutor trigger button (lines 736–742)**:
  ```tsx
  <button
    onClick={() => window.dispatchEvent(new CustomEvent('open-ai-tutor'))}
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-sm"
  >
    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
    AI Course Tutor (RAG)
  </button>
  ```
  This triggers a decoupled global `window` event (`open-ai-tutor`) that is caught by `frontend/src/components/Layout.tsx` (line 136).
- **AiTutorModal mounting in `Layout.tsx` (lines 648–652)**:
  ```tsx
  {/* Global AI Course Tutor Modal */}
  <AiTutorModal
    isOpen={showAiTutor}
    onClose={() => setShowAiTutor(false)}
  />
  ```
  In `Layout.tsx`, `AiTutorModal` is mounted with zero course context (`courseId`, `batchId`, `courseName`) and without `studentId`.

---

### 1.3 `frontend/src/services/api.ts`
- **Configuration (lines 1–21)**:
  ```typescript
  import axios from 'axios';
  import { supabase } from '../supabaseClient';

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const api = axios.create({
    baseURL: API_URL,
  });

  api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  }, (error) => {
    return Promise.reject(error);
  });

  export default api;
  ```
  The interceptor attaches `Authorization: Bearer <token>`, but currently does not automatically attach `X-Service-Key: lms-n8n-service-key-2026` for RAG endpoints.

---

### 1.4 `backend/index.php` and `backend/rag_service.php`
- **Route `/api/rag/ask` in `backend/index.php` (lines 1193–1239)**:
  ```php
  case ($route === '/api/rag/ask' && $method === 'POST'):
      RagFlags::initFromRequest();
      @set_time_limit(180);
      $user = verifyTokenOrApiKey();
      ...
      $courseId = $input['course_id'] ?? null;
      $batchId = $input['batch_id'] ?? null;
      $studentId = $input['student_id'] ?? ($user['role'] === 'STUDENT' ? $user['id'] : null);
      ...
      $askRes = RagService::ask($question, $courseId, $batchId, $studentName, $limit, $history, $studentId);
      echo json_encode($askRes);
      break;
  ```
  - **Auth**: `verifyTokenOrApiKey()` (defined in `backend/auth_middleware.php` line 253) checks `verifyServiceApiKey()` first. If header `X-Service-Key` matches `'lms-n8n-service-key-2026'`, the caller is authenticated as the synthetic user `'role' => 'SERVICE'`.
  - **`student_id` resolution**: If `X-Service-Key` is used, `$user['role']` is `'SERVICE'`, so fallback `$user['role'] === 'STUDENT'` evaluates to `false`. Therefore, passing `$input['student_id']` explicitly in the request body is **strictly required** for `$studentId` to be populated.
- **Conversational Memory in `backend/rag_service.php` (lines 1666–1672, 2005–2008)**:
  ```php
  // Step 0: Conversational Query Condensation & Session Retrieval (R3)
  $condResult = null;
  $activeQuestion = $question;
  if (empty($history) && !empty($studentId) && $studentId !== 'system_audit_bot' && class_exists('StudentSessionStore')) {
      $history = StudentSessionStore::getRecentHistory($studentId, 3);
  }
  if (!empty($history)) {
      $condResult = RagQueryCondenser::condense($question, $history);
      $activeQuestion = $condResult['condensed_query'];
  }
  ...
  // Milestone 3 (R3): Persist turn into student session store
  if (!empty($studentId) && $studentId !== 'system_audit_bot' && class_exists('StudentSessionStore')) {
      StudentSessionStore::addMessage($studentId, 'user', $question);
      StudentSessionStore::addMessage($studentId, 'assistant', $answer);
  }
  ```
- **Live Empirical Verification on FrankenPHP (:8000)**:
  1. **Turn 1**: Query `"What is useState?"` with `student_id: "test_student_abc"`:
     - Returns HTTP 200.
     - `query_condensation`: `null`.
     - Saved 1 user message and 1 assistant message to `backend/storage/student_sessions.sqlite`.
  2. **Turn 2**: Query `"How does its setter work?"` with `student_id: "test_student_abc"`:
     - Returns HTTP 200 in 612.9ms.
     - `query_condensation`:
       ```json
       {
         "condensed_query": "What is the setter function in React's useState Hook?",
         "original_query": "How does its setter work?",
         "rewritten": true,
         "strategy": "llm_rewrite",
         "latency_ms": 612.9
       }
       ```
     - Answer: `"The setter function in React's useState Hook is the second element of the returned array, denoted as setState..."`.
  3. **Out-of-Domain Query**: `"What is quantum physics?"`:
     - Returns HTTP 200.
     - `backend`: `"safety_boundary_gate"`.
     - `abstain`: `true`.
     - `answer`: `"I apologize, but I do not have enough information in the approved course materials to answer your question accurately. The EduConnect AI Tutor is configured to answer questions strictly related to your curriculum..."`.
  4. **CRAG Fallback Gate**:
     - When retrieval fails or top rerank score < 0.35:
     - `backend`: `"crag_fallback_gate"`.
     - `abstain`: `true`.
  5. **Session Clear Verification**:
     - `StudentSessionStore::clearSession('test_student_abc')` successfully wiped all turns from `student_sessions.sqlite`.
  6. **Page Metadata in Knowledge Base**:
     - In `backend/storage/vectors.sqlite`, table `material_chunks`:
       `book_ejs_chunk_0`: `{"source": "Eloquent JavaScript (4th Ed)", ..., "page_start": 26, "page_end": 26, "pages": [26]}`.
     - Formatted page string: `"p. 26"`.
     - In `backend/rag_service.php` lines 1890–1898: `$sources[]` currently does not map `$chunkMeta['page_citation']` or `$chunkMeta['page_start']` into the returned item. Adding 8 lines to `RagService::ask` immediately exposes `'page' => 'p. 26'` to the API response.

---

## 2. Logic Chain

```
[StudentDashboard line 52: studentId]
       │
       ▼
[Pass studentId as prop to <AiTutorModal studentId={studentId} ... />]
       │
       ▼
[AiTutorModal sends POST /api/rag/ask with { question, student_id, course_id, batch_id } and 'X-Service-Key']
       │
       ├───────────────────────────────────────┬───────────────────────────────────────┐
       ▼                                       ▼                                       ▼
[Backend: StudentSessionStore]     [Backend: Safety / CRAG Gate]          [Backend: Page Metadata]
Multi-turn history loaded          If out-of-domain:                      material_chunks has page_start
RagQueryCondenser rewrites query   abstain === true                       RagService includes 'page' in sources
condensed_query + rewritten: true  backend === 'crag_fallback_gate'       Frontend displays (Sec X • p. Y)
       │                                       │                                       │
       ▼                                       ▼                                       ▼
[Frontend: User Bubble]            [Frontend: Amber Warning Card]          [Frontend: Source Badge]
Shows "↳ Interpreted as: ..."      Visually distinct warning card          Displays page citation tag
```

1. **Prop Wiring**:
   - In `StudentDashboard.tsx`, replace `window.dispatchEvent(new CustomEvent('open-ai-tutor'))` with `setIsAiTutorOpen(true)`.
   - Mount `<AiTutorModal isOpen={isAiTutorOpen} onClose={() => setIsAiTutorOpen(false)} studentId={studentId} courseId={activeCourse?.id} batchId={activeCourse?.batch_id} courseName={activeCourse?.course_name || 'Full Stack Web Development'} />`.
   - In `Layout.tsx`, also pass `studentId={user?.role === 'STUDENT' ? user.id : undefined}` to its floating button modal so the floating button also activates conversational memory.

2. **Request Headers & Payload**:
   - In `AiTutorModal.tsx`:
     ```typescript
     const res = await api.post('/api/rag/ask', {
       question: q,
       student_id: studentId,
       course_id: courseId,
       batch_id: batchId
     }, {
       headers: {
         'X-Service-Key': 'lms-n8n-service-key-2026'
       }
     });
     ```
   - In `frontend/src/services/api.ts`: Add an interceptor rule so that any request containing `/api/rag/` automatically includes `X-Service-Key: lms-n8n-service-key-2026`. This guarantees defense-in-depth across all RAG calls (including R2 metrics).

3. **Query Rewriting Indicator**:
   - Extract `res.data?.query_condensation`.
   - If `query_condensation?.rewritten === true && query_condensation?.condensed_query`, update the corresponding user message with `interpretedQuery: query_condensation.condensed_query`.
   - In the message list below the user's question, render:
     ```tsx
     {m.interpretedQuery && (
       <div className="mt-1 pt-1 border-t border-blue-500/30 text-[11px] text-blue-100 flex items-center gap-1 font-medium">
         <span className="text-yellow-300 font-bold">↳</span>
         <span>Interpreted as: <span className="italic font-normal text-white">"{m.interpretedQuery}"</span></span>
       </div>
     )}
     ```

4. **CRAG Fallback & Abstention Styling**:
   - Check if response abstained:
     ```typescript
     const isAbstained = Boolean(
       res.data?.abstain ||
       res.data?.abstained ||
       res.data?.backend === 'crag_fallback_gate' ||
       res.data?.backend === 'safety_boundary_gate' ||
       res.data?.backend === 'safety_trap_gate' ||
       res.data?.backend === 'calibrated_abstention_gate' ||
       res.data?.backend === 'unverified_premise_gate'
     );
     ```
   - If `isAbstained === true`, render an amber warning card:
     ```tsx
     <div className="max-w-[85%] rounded-2xl rounded-tl-none p-4 text-sm shadow-sm bg-amber-50 border border-amber-300 text-amber-900">
       <div className="flex items-center gap-1.5 mb-2 text-amber-800 font-semibold text-xs">
         <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
         <span>Curriculum Boundary Notice (CRAG Fallback)</span>
       </div>
       <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
       <span className="block text-[10px] mt-2 text-right text-amber-600/70">{m.timestamp}</span>
     </div>
     ```

5. **Page Numbers in Citations**:
   - In `AiTutorModal.tsx`, update `SourceCitation`:
     ```typescript
     interface SourceCitation {
       title: string;
       chunk_index: number;
       similarity: number;
       page?: string | number;
       page_number?: number;
       page_citation?: string;
       content?: string;
     }
     ```
   - In rendering:
     ```tsx
     {m.sources.map((s, idx) => {
       const pageDisplay = s.page || s.page_citation || (s.page_number ? `p. ${s.page_number}` : null);
       return (
         <span
           key={idx}
           className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100"
         >
           {s.title} (Sec {s.chunk_index + 1}{pageDisplay ? ` • ${pageDisplay}` : ''}) • {Math.round(s.similarity * 100)}%
         </span>
       );
     })}
     ```
   - In `backend/rag_service.php` lines 1890–1898:
     Unpack `$chunk['metadata']` and add `'page' => $pageCitation` into `$sources[]`.

6. **"New Conversation" Button**:
   - Add button to modal header next to the close button:
     ```tsx
     <button
       onClick={handleNewConversation}
       title="Clear chat and start fresh"
       className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
     >
       <RotateCcw className="w-3.5 h-3.5" />
       <span>New Conversation</span>
     </button>
     ```
   - When clicked:
     - Resets local `messages` state to the initial welcome message.
     - Resets `input` to empty.
     - Calls backend clear endpoint `api.post('/api/rag/clear', { student_id: studentId })` (with graceful fallback).
   - In `backend/index.php`:
     Add endpoint `POST /api/rag/clear` that invokes `StudentSessionStore::clearSession($studentId)`.

---

## 3. Caveats

1. **Backend Sources Modification**:
   While `AiTutorModal.tsx` handles `page`, `page_citation`, or `page_number` if present, the current production `RagService::ask` (lines 1890–1898) maps `$sources` without reading `$chunk['metadata']`. To make page numbers appear for production textbooks (like Eloquent JavaScript), `backend/rag_service.php` must also be updated to attach `'page' => $pageCitation` to each item in `$sources`.
2. **Student Session Scope**:
   `StudentSessionStore` persists turns by `student_id`. If `clearSession` is not called when the user clicks "New Conversation", the backend memory will retain the last 3 turns until overwritten by new turns. Adding `POST /api/rag/clear` ensures full synchronization between the frontend and backend conversation state.
3. **Gateway Trust Token**:
   `verifyGatewayTrust()` in `backend/auth_middleware.php` allows `127.0.0.1` directly when `LMS_GATEWAY_TRUST_TOKEN` is unset in development. In production environments where the gateway token is configured, the gateway forwards `X-Gateway-Trust`.

---

## 4. Conclusion & Actionable Proposals

### 4.1 Proposed Changes to `frontend/src/components/AiTutorModal.tsx`
1. Add `studentId?: string` to `AiTutorModalProps`.
2. Expand `ChatMessage` and `SourceCitation` types to support `interpretedQuery`, `isAbstained`, `backend`, and `page` / `page_citation`.
3. In `handleSend`:
   - Send `student_id: studentId` in POST body.
   - Attach header `X-Service-Key: lms-n8n-service-key-2026`.
   - Update user message with `interpretedQuery` when `query_condensation.rewritten === true`.
   - Mark assistant message with `isAbstained` when `backend === 'crag_fallback_gate'` or `abstained === true`.
4. In modal header:
   - Add `<RotateCcw className="w-3.5 h-3.5" /> New Conversation` button.
5. In message rendering:
   - User message: render `"↳ Interpreted as: {condensed_query}"`.
   - Assistant message: render amber warning card if `isAbstained`.
   - Source citations: render page number if present (`(Sec X • p. Y) • Z%`).

### 4.2 Proposed Changes to `frontend/src/pages/student/StudentDashboard.tsx`
1. Import `AiTutorModal` from `../../components/AiTutorModal`.
2. Add state `const [isAiTutorOpen, setIsAiTutorOpen] = useState(false);`.
3. At line 737, replace:
   ```tsx
   onClick={() => window.dispatchEvent(new CustomEvent('open-ai-tutor'))}
   ```
   with:
   ```tsx
   onClick={() => setIsAiTutorOpen(true)}
   ```
4. At bottom of JSX, render:
   ```tsx
   <AiTutorModal
     isOpen={isAiTutorOpen}
     onClose={() => setIsAiTutorOpen(false)}
     studentId={studentId}
     courseId={activeCourse?.id}
     batchId={activeCourse?.batch_id}
     courseName={activeCourse?.course_name || 'Full Stack Web Development'}
   />
   ```

### 4.3 Proposed Changes to `frontend/src/services/api.ts`
Attach `X-Service-Key: lms-n8n-service-key-2026` in interceptor for any `/api/rag/` URL:
```typescript
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  if (config.url?.includes('/api/rag/')) {
    config.headers['X-Service-Key'] = 'lms-n8n-service-key-2026';
  }
  return config;
}, ...);
```

### 4.4 Proposed Changes to `backend/rag_service.php` & `backend/index.php`
1. In `backend/rag_service.php` lines 1890–1898 and lines 2424–2429:
   Extract page metadata from `$chunk['metadata']` and add `'page' => $pageCitation` to `$sources[]`.
2. In `backend/index.php`:
   Add route `case ($route === '/api/rag/clear' && $method === 'POST'):` to clear `StudentSessionStore::clearSession($studentId)`.

---

## 5. Verification Method

1. **TypeScript Build Verification**:
   ```powershell
   cd "d:\Collage project\EduConnect-LMS-Experimental\frontend"
   npm run build
   ```
   Must compile with 0 errors and output clean Vite bundles.

2. **System Audit Verification**:
   ```powershell
   cd "d:\Collage project\EduConnect-LMS-Experimental"
   php tests/rag/system_audit.php
   ```
   Must pass 100% across all 6 subsystems.

3. **Multi-Turn Follow-Up Verification**:
   ```powershell
   php ".agents/teamwork/explorer_survey_1/test_ask_endpoint.php"
   ```
   Verify query rewriting produces `rewritten === true` and answers with context of previous turn.

4. **Out-of-Domain / CRAG Fallback Verification**:
   Send query `"What is quantum physics?"` or `"How to bake a cake?"` and verify response produces `abstain === true`, triggering amber warning card rendering in UI.

5. **Page Number Citation Verification**:
   Send query `"How does JavaScript Object.freeze work?"` and verify citations include `(Sec X • p. Y)`.
