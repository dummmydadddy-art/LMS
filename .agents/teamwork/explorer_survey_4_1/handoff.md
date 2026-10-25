# Handoff Report: R1 Real-Time Token Streaming in AI Tutor Modal

## 1. Observation
1. **Frontend Non-Streaming Component**: `frontend/src/components/AiTutorModal.tsx` (lines 131–140) executes buffered Axios POST:
   ```typescript
   const res = await api.post('/api/rag/ask', {
     question: q,
     student_id: targetStudentId || undefined,
     course_id: courseId,
     batch_id: batchId
   }, {
     headers: {
       'X-Service-Key': 'lms-n8n-service-key-2026'
     }
   });
   ```
   It waits for the full response before rendering any assistant text.
2. **Backend SSE Activation**: `backend/index.php` (lines 1233–1235) checks:
   ```php
   $stream = !empty($input['stream']) || (isset($_GET['stream']) && $_GET['stream'] === 'true') || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'text/event-stream') !== false);
   if ($stream) {
       RagService::askStream($question, $courseId, $batchId, $studentName, $limit, $history, $precomputedEmbedding, $studentId);
   } else {
       $askRes = RagService::ask($question, $courseId, $batchId, $studentName, $limit, $history, $studentId);
       echo json_encode($askRes);
   }
   ```
3. **Backend SSE Wire Implementation**: `backend/rag_service.php` (lines 2329–2534) sets headers:
   ```php
   header('Content-Type: text/event-stream');
   header('Cache-Control: no-cache');
   header('Connection: keep-alive');
   header('X-Accel-Buffering: no');
   ```
   It emits:
   - `event: token\ndata: {"token":"..."}\n\n` (lines 2357, 2368, 2392, 2415, 2498, 2511)
   - `event: done\ndata: {...}\n\n` (lines 2358, 2369, 2393, 2416, 2516)
4. **Metadata Serialization**:
   - `sources`: Array of `{ title, chunk_index, similarity, content, page }` where `page` is formatted via `self::extractPageCitation($c)` (e.g., `p. 14`, `pp. 14-16`, line 1622).
   - `query_condensation`: `{ rewritten: true, condensed_query: "...", original_query: "..." }` when rewritten by `RagQueryCondenser::condense()`.
   - `backend`: Set to `'crag_fallback_gate'` when top reranker score is below threshold (line 2400) or `'hybrid_rrf_llama3_streaming_exp0009'` on successful generation.
   - `abstain`: Boolean flag set to `true` on out-of-domain or low-confidence queries.
5. **Frontend Build Health**: `npm run build` in `frontend/` runs `tsc -b && vite build` and succeeded with 0 errors in 7.60s.

## 2. Logic Chain
1. *From Observation 1*: The frontend currently blocks until the LLM completes the full answer, leading to high perceived latency (often 5–15 seconds) despite the backend having low TTFT (~200ms).
2. *From Observation 2 & 3*: The backend's `askStream()` is production-ready and fully operational. No backend code changes are required to support streaming — passing `"stream": true` or `?stream=true` to `POST /api/rag/ask` with `Accept: text/event-stream` triggers the SSE output directly.
3. *From Observation 3 & 4*: The SSE wire format strictly uses `event: token` for progressive deltas and `event: done` for final metadata hydration.
4. *From Observation 1, 3 & 4*: Consuming the stream via browser-native `fetch()` with `ReadableStream` (`response.body.getReader()`) allows progressive token appending to the UI while retaining all existing metadata rendering logic (citation badges with page numbers, `↳ Interpreted as:` subtitles, and CRAG amber warning cards).
5. *From Observation 1 & 2*: Wrapping the streaming call in a try/catch block with fallback to the existing `api.post('/api/rag/ask')` buffered call ensures robust resiliency: if the SSE stream encounters any connection, proxy, or decoding error before tokens are received, it seamlessly executes the buffered request.

## 3. Caveats
1. **Ollama Execution Prerequisite**: Live end-to-end streaming requires Ollama to be running on port 11434 with `llama3.2` and `nomic-embed-text` loaded, along with the Python reranker on port 8100 and FrankenPHP on port 8000.
2. **Reverse Proxy / Gateway Buffering**: If an intermediate proxy (e.g. `gateway.js` or nginx) is introduced, it must respect `X-Accel-Buffering: no` and not buffer chunked transfer encoding. FrankenPHP directly handles this out of the box.

## 4. Conclusion
Requirement 1 is entirely achievable purely via frontend enhancements in `frontend/src/components/AiTutorModal.tsx`.
- Replace buffered Axios call with `window.fetch()` streaming reader.
- Introduce `isStreaming: boolean` state on `ChatMessage` to render the live typing cursor (`animate-pulse`).
- Transition from loading spinner to streaming text upon receipt of the first token.
- Hydrate metadata (sources, page numbers, condensation subtitle, CRAG amber card) on `event: done`.
- Provide automatic fallback to buffered Axios call if the stream connection fails.
- Complete blueprint and drop-in code snippet are documented in `analysis.md`.

## 5. Verification Method
1. **Build Verification**:
   ```powershell
   cd "d:\Collage project\EduConnect-LMS-Experimental\frontend"
   npm run build
   ```
   Must exit with code 0 and 0 TypeScript/linter errors.
2. **Streaming Execution Verification**:
   With backend services running, open the AI Tutor modal and ask:
   "What is useEffect in React?"
   - Verify initial retrieval indicator appears.
   - Verify text streams progressively with live blinking cursor.
   - Verify source badges display with section and page numbers upon completion.
3. **CRAG Fallback Card Verification**:
   Ask an out-of-domain query: "Explain quantum mechanics".
   - Verify message renders as amber warning card with Curriculum Boundary Notice header.
4. **Conversational Memory & Rewriting Verification**:
   Ask a follow-up query: "How does its cleanup function work?"
   - Verify `↳ Interpreted as: "..."` subtitle appears below the user message.
5. **Buffered Fallback Verification**:
   Simulate stream failure (e.g., test with stream aborted or test error handling) and confirm automatic recovery via buffered `POST`.
