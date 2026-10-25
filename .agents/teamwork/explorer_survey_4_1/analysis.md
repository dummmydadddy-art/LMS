# Requirement 1 Investigation: Real-Time Token Streaming in AI Tutor Modal

## 1. Executive Summary

This investigation explores the implementation of real-time Server-Sent Events (SSE) token streaming in `frontend/src/components/AiTutorModal.tsx` connecting to the existing SSE streaming pipeline in `backend/rag_service.php` (`RagService::askStream`) and `backend/index.php`.

Key findings:
1. **Backend Readiness**: The backend already fully implements SSE streaming in `backend/rag_service.php` (method `askStream`, lines 2329–2534) and routes requests to it via `backend/index.php` (lines 1233–1235) whenever `"stream": true` is passed in the JSON payload, `?stream=true` is in the query params, or `Accept: text/event-stream` is requested.
2. **Wire Protocol**: The backend emits exactly two SSE event types:
   - `event: token` with JSON `{"token": string}` for incremental tokens (and abstention messages).
   - `event: done` with JSON containing full answer, sources array (with `page` citations), confidence score, backend identifier (such as `crag_fallback_gate`), and `query_condensation` rewrite metadata.
3. **Frontend Gap**: `AiTutorModal.tsx` currently uses axios `api.post('/api/rag/ask')` in buffered mode, waiting up to 10–15 seconds for Ollama generation to complete before rendering anything.
4. **Seamless Integration Path**: By utilizing browser-native `fetch()` with `ReadableStream` (`getReader()`), `AiTutorModal.tsx` can progressively render incoming tokens in real-time, show a live typing cursor, preserve all metadata (page citations, query rewrite subtitles, CRAG amber cards) upon stream completion, and automatically fall back to buffered mode if the streaming connection encounters network or server errors.

---

## 2. Current State Analysis (`frontend/src/components/AiTutorModal.tsx`)

### 2.1 Implementation Details
`AiTutorModal.tsx` (358 lines) manages chat state with:
- `messages: ChatMessage[]`: local array of chat messages.
- `ChatMessage` interface:
  ```typescript
  interface ChatMessage {
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    sources?: SourceCitation[];
    timestamp: string;
    interpretedQuery?: string;
    isAbstained?: boolean;
    backend?: string;
  }
  ```
- `loading: boolean`: tracks whether an API request is in progress.
- `isClearing: boolean`: tracks whether conversation history is being reset.

### 2.2 Current Request Flow (Lines 113–189)
When the user sends a message:
1. A user `ChatMessage` is created and appended to `messages`.
2. `loading` is set to `true`, displaying the loading spinner card:
   ```tsx
   <div className="bg-white border border-slate-200 text-slate-600 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2.5 shadow-sm">
     <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
     <span>Searching course knowledge base & synthesizing answer...</span>
   </div>
   ```
3. Axios buffered call `api.post('/api/rag/ask', { question, student_id, course_id, batch_id }, { headers: { 'X-Service-Key': 'lms-n8n-service-key-2026' } })` is executed.
4. When axios resolves:
   - `res.data.query_condensation` is inspected: if `rewritten === true`, the user message is updated with `interpretedQuery: queryCondensation.condensed_query`.
   - `isAbstained` is computed:
     ```typescript
     const isAbstained = Boolean(
       res.data?.abstain ||
       res.data?.abstained ||
       backend === 'crag_fallback_gate' ||
       backend === 'safety_boundary_gate' ||
       backend === 'safety_trap_gate' ||
       backend === 'calibrated_abstention_gate' ||
       backend === 'unverified_premise_gate'
     );
     ```
   - An assistant `ChatMessage` is created with the full text, `sources`, `isAbstained`, and `backend`.
   - `loading` is set to `false`.

### 2.3 Visual States Already Supported in UI
The component already contains polished styling for:
- **User messages**: Blue bubble with optional `↳ Interpreted as: "{m.interpretedQuery}"` yellow/white subtitle.
- **CRAG Fallback / Out-of-Domain Abstention Cards**: Amber warning card (`bg-amber-50 border-amber-300 text-amber-900`) with `<AlertCircle>` icon and header `Curriculum Boundary Notice (CRAG Fallback)`.
- **Standard Assistant Message**: White card with markdown/text layout, plus Verified Course Sources badges showing:
  `{s.title} (Sec {s.chunk_index + 1}{pageDisplay ? ` • ${pageDisplay}` : ''}) • {Math.round(s.similarity * 100)}%`.

---

## 3. Backend SSE Streaming Architecture

### 3.1 Route Activation (`backend/index.php`)
At line 1233 of `backend/index.php`:
```php
$stream = !empty($input['stream']) 
       || (isset($_GET['stream']) && $_GET['stream'] === 'true') 
       || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'text/event-stream') !== false);

if ($stream) {
    RagService::askStream($question, $courseId, $batchId, $studentName, $limit, $history, $precomputedEmbedding, $studentId);
} else {
    $askRes = RagService::ask($question, $courseId, $batchId, $studentName, $limit, $history, $studentId);
    echo json_encode($askRes);
}
```
**Triggering SSE**: Passing `"stream": true` in the POST JSON body, or adding `?stream=true` to the URL, or sending header `Accept: text/event-stream` will automatically invoke `RagService::askStream()`.

### 3.2 Streaming Pipeline (`backend/rag_service.php` Lines 2329–2534)
`RagService::askStream()` handles the request as follows:

1. **Headers Emitted (Lines 2339–2342)**:
   ```php
   header('Content-Type: text/event-stream');
   header('Cache-Control: no-cache');
   header('Connection: keep-alive');
   header('X-Accel-Buffering: no');
   ```

2. **Conversational Query Condensation (Lines 2346–2352)**:
   Fetches the student's last 3 turns from `StudentSessionStore` (keyed by `student_id`). If history exists, calls `RagQueryCondenser::condense($question, $history)`.
   Produces `$condResult` with:
   - `rewritten` (bool)
   - `condensed_query` (string)
   - `original_query` (string)

3. **Curriculum Safety Boundary & Adversarial Trap Evaluation (Lines 2354–2374)**:
   If out-of-domain or adversarial:
   Emits immediate token event with the abstention message, followed by `event: done` with `abstain: true`.

4. **Hybrid Search & Neural Cross-Encoder Reranking (Line 2383)**:
   Searches BM25 and vector chunks with RRF fusion and ms-marco-MiniLM cross-encoder reranking.

5. **CRAG Confidence Fallback Gate (Lines 2387–2409)**:
   Checks top rerank score against `CRAG_CONFIDENCE_THRESHOLD` (default 0.35).
   If below threshold:
   ```php
   $msg = "I apologize, but this topic is outside the curriculum scope and not in the approved curriculum, so I cannot answer accurately. The EduConnect AI Tutor is configured to answer questions strictly related to your curriculum (HTML & CSS, JavaScript ES6+, React, Node.js/Express, and PostgreSQL).";
   echo "event: token\ndata: " . json_encode(['token' => $msg]) . "\n\n";
   echo "event: done\ndata: " . json_encode([
       'answer' => $msg,
       'sources' => [],
       'abstain' => true,
       'confidence' => round($topRerankScore ?? 0.0, 4),
       'query_condensation' => $condResult,
       'backend' => 'crag_fallback_gate'
   ]) . "\n\n";
   @ob_flush();
   flush();
   ```

6. **Parent-Child Hierarchical Context Assembly (Lines 2423–2444)**:
   Fetches rich parent chunks from `parent_chunks` table for verified child chunk IDs.

7. **Source & Page Citation Assembly (Lines 2468–2480)**:
   Extracts page citations via `self::extractPageCitation($c)` (e.g., `"p. 14"`, `"pp. 14-16"`).

8. **Streaming Ollama Inference (Lines 2457–2507)**:
   Connects to Ollama `/api/chat` with `'stream' => true`.
   In `CURLOPT_WRITEFUNCTION`:
   ```php
   $chunkObj = json_decode($trimmed, true);
   if ($chunkObj && isset($chunkObj['message']['content'])) {
       $token = $chunkObj['message']['content'];
       $fullAnswer .= $token;
       echo "event: token\ndata: " . json_encode(['token' => $token]) . "\n\n";
       @ob_flush();
       flush();
   }
   ```

9. **Stream Completion Event (Lines 2516–2527)**:
   ```php
   echo "event: done\ndata: " . json_encode([
       'success' => true,
       'answer' => $fullAnswer,
       'sources' => $sources,
       'confidence' => $confEval['confidence'],
       'answer_profile' => $profile['type'],
       'is_partial' => $isPartial,
       'query_condensation' => $condResult,
       'backend' => 'hybrid_rrf_llama3_streaming_exp0009'
   ]) . "\n\n";
   @ob_flush();
   flush();
   ```

10. **Multi-Turn Session Persistence (Lines 2530–2533)**:
    Saves the user question and the full answer into `StudentSessionStore` for `student_id`.

---

## 4. Exact SSE Wire Protocol Specification

### 4.1 Event Framing
SSE events are transmitted as UTF-8 plaintext blocks separated by `\n\n`:
```http
event: <eventType>
data: <jsonData>

```

### 4.2 Event 1: `event: token`
Emitted for every token piece generated by the LLM (or the full abstention text on immediate boundary trip).
- **Format**:
  ```http
  event: token
  data: {"token":" useState"}

  ```
- **Payload Schema**:
  ```typescript
  interface SseTokenPayload {
    token: string;
  }
  ```

### 4.3 Event 2: `event: done`
Emitted exactly once when generation or abstention completes.
- **Normal Generation Payload**:
  ```json
  {
    "success": true,
    "answer": "React's useState hook allows functional components to manage local state...",
    "sources": [
      {
        "title": "React Documentation (Official)",
        "chunk_index": 3,
        "similarity": 0.88,
        "content": "...",
        "page": "p. 42"
      }
    ],
    "confidence": 0.91,
    "answer_profile": "CONCISE",
    "is_partial": false,
    "query_condensation": {
      "rewritten": true,
      "condensed_query": "How does React useState hook manage local component state?",
      "original_query": "How does it manage state?"
    },
    "backend": "hybrid_rrf_llama3_streaming_exp0009"
  }
  ```
- **CRAG Fallback Abstention Payload**:
  ```json
  {
    "answer": "I apologize, but this topic is outside the curriculum scope and not in the approved curriculum...",
    "sources": [],
    "abstain": true,
    "confidence": 0.142,
    "query_condensation": null,
    "backend": "crag_fallback_gate"
  }
  ```
- **Payload Schema**:
  ```typescript
  interface SseDonePayload {
    success?: boolean;
    answer: string;
    sources: Array<{
      title: string;
      chunk_index: number;
      similarity: number;
      content?: string;
      page?: string | number;
    }>;
    confidence?: number;
    abstain?: boolean;
    abstained?: boolean;
    reason?: string;
    backend?: string;
    is_partial?: boolean;
    query_condensation?: {
      rewritten: boolean;
      condensed_query: string;
      original_query: string;
    } | null;
  }
  ```

---

## 5. Client-Side Implementation Blueprint

### 5.1 Architecture: `fetch` + `ReadableStream`
Standard `EventSource` in web browsers only supports `GET` requests and cannot supply a request body or custom authentication headers.
The standard, robust solution in React is `window.fetch()` with `response.body.getReader()`.

```typescript
const response = await fetch(`${API_BASE}/api/rag/ask?stream=true`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'X-Service-Key': 'lms-n8n-service-key-2026',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  },
  body: JSON.stringify({
    question: q,
    stream: true,
    student_id: targetStudentId || undefined,
    course_id: courseId,
    batch_id: batchId
  })
});
```

### 5.2 Robust Chunk & Event Parsing
Network chunks can split mid-line or mid-JSON. The reader must maintain an internal buffer and split on double-newlines (`\r?\n\r?\n`):
```typescript
let buffer = '';
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  const eventBlocks = buffer.split(/\r?\n\r?\n/);
  // Keep the last, potentially incomplete block in the buffer
  buffer = eventBlocks.pop() || '';

  for (const block of eventBlocks) {
    if (!block.trim()) continue;
    let eventName = 'token';
    let dataStr = '';

    const lines = block.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        const d = line.slice(5).trim();
        dataStr = dataStr ? `${dataStr}\n${d}` : d;
      }
    }

    if (dataStr) {
      try {
        const payload = JSON.parse(dataStr);
        if (eventName === 'token') {
          handleIncomingToken(payload.token);
        } else if (eventName === 'done') {
          handleStreamDone(payload);
        }
      } catch (e) {
        console.warn('[SSE Parse Warning]', e, dataStr);
      }
    }
  }
}
```

### 5.3 UI Lifecycle: Retrieval vs Streaming vs Done
1. **Initial Search & Retrieval Phase (TTFT)**:
   - When the user sends a message, `loading` is set to `true`.
   - The UI displays the existing animated spinner:
     `"Searching course knowledge base & synthesizing answer..."`.
   - No empty assistant bubble is shown yet.
2. **First Token Arrival (`event: token`)**:
   - `loading` is set to `false` (spinner removed).
   - An assistant message is created in `messages` with:
     ```typescript
     {
       id: assistantMsgId,
       sender: 'assistant',
       text: token,
       sources: [],
       isStreaming: true,
       timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
     }
     ```
3. **Progressive Tokens**:
   - For every subsequent token, update `text: (prevText) => prevText + token`.
   - Smoothly auto-scroll to the bottom.
   - Display the live typing cursor at the end of the text.
4. **Stream Completion (`event: done`)**:
   - Parse `doneData`:
     - Update user message if query was rewritten: `interpretedQuery = doneData.query_condensation?.condensed_query`.
     - Update assistant message:
       - `text: doneData.answer || accumulatedText`
       - `sources: doneData.sources || []`
       - `isAbstained: Boolean(doneData.abstain || doneData.abstained || doneData.backend === 'crag_fallback_gate' || ...)`
       - `backend: doneData.backend`
       - `isStreaming: false` (turns off the typing cursor)
   - If `isAbstained` is `true`, the card styling immediately switches to the amber warning card.
   - Verified source citation badges appear with page numbers (e.g., `React Docs (Sec 1 • p. 14) • 88%`).

### 5.4 Live Typing Cursor Specification
Add `isStreaming?: boolean` to `ChatMessage`.
In JSX:
```tsx
{m.isStreaming && (
  <span
    aria-hidden="true"
    className="inline-block w-1.5 h-4 ml-1 bg-indigo-600 animate-pulse align-middle rounded-sm"
  />
)}
```
For CRAG fallback cards if rendered while streaming:
```tsx
{m.isStreaming && (
  <span
    aria-hidden="true"
    className="inline-block w-1.5 h-4 ml-1 bg-amber-600 animate-pulse align-middle rounded-sm"
  />
)}
```
The Tailwind `animate-pulse` utility produces a clean, standard pulsing cursor that does not require additional CSS libraries.

---

## 6. Automatic Fallback Mechanism

### 6.1 Trigger Scenarios
Streaming should automatically fall back to buffered mode under any of the following conditions:
1. `window.fetch()` throws a `TypeError` (e.g., network disconnected, CORS issue, server down).
2. HTTP response is not ok (`!response.ok`, e.g., 500, 502, 503).
3. `response.body` is null or does not support `getReader()`.
4. The stream disconnects abruptly before any token is received (`!hasEmittedToken`).

### 6.2 Fallback Strategy
```typescript
let streamSucceeded = false;
let hasEmittedFirstToken = false;

try {
  streamSucceeded = await streamAsk(q, userMsgId, (token) => {
    hasEmittedFirstToken = true;
  });
} catch (streamErr) {
  console.warn('[AiTutorModal] SSE streaming failed, falling back to buffered mode:', streamErr);
  streamSucceeded = false;
}

// If streaming failed and no tokens were partially displayed, execute buffered fallback
if (!streamSucceeded && !hasEmittedFirstToken) {
  try {
    await bufferedAsk(q, userMsgId);
  } catch (bufferedErr) {
    // Both streaming and buffered failed
    showConnectionErrorMessage();
  }
}
```

This guarantees:
- Zero degradation in user experience if the SSE connection drops or if a reverse proxy buffers chunked responses.
- Users receive the complete answer seamlessly via buffered mode.
- Complete backward compatibility with the existing test suites and API surface.

---

## 7. Concrete Implementation Design for Implementer

Below is the complete structural blueprint for `AiTutorModal.tsx`:

```typescript
// 1. Updated ChatMessage interface
interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: SourceCitation[];
  timestamp: string;
  interpretedQuery?: string;
  isAbstained?: boolean;
  backend?: string;
  isStreaming?: boolean;
}

// 2. Base URL extraction
const API_BASE = (api.defaults.baseURL || 'http://localhost:8000').replace(/\/$/, '');

// 3. handleSend logic
const handleSend = async (questionText?: string) => {
  const q = (questionText || input).trim();
  if (!q || loading) return;

  const userMsgId = String(Date.now());
  const userMsg: ChatMessage = {
    id: userMsgId,
    sender: 'user',
    text: q,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  setMessages((prev) => [...prev, userMsg]);
  if (!questionText) setInput('');
  setLoading(true);

  const targetStudentId = effectiveStudentId || studentId;

  // Attempt SSE Streaming first
  let streamSuccess = false;
  let receivedFirstToken = false;
  const assistantMsgId = String(Date.now() + 1);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'X-Service-Key': 'lms-n8n-service-key-2026'
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(`${API_BASE}/api/rag/ask?stream=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question: q,
        stream: true,
        student_id: targetStudentId || undefined,
        course_id: courseId,
        batch_id: batchId
      })
    });

    if (!res.ok || !res.body) {
      throw new Error(`HTTP stream error: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim()) continue;
        let eventName = 'token';
        let dataStr = '';

        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const d = line.slice(5).trim();
            dataStr = dataStr ? `${dataStr}\n${d}` : d;
          }
        }

        if (!dataStr) continue;
        const payload = JSON.parse(dataStr);

        if (eventName === 'token' && payload.token) {
          accumulatedText += payload.token;
          if (!receivedFirstToken) {
            receivedFirstToken = true;
            setLoading(false);
            setMessages((prev) => [
              ...prev,
              {
                id: assistantMsgId,
                sender: 'assistant',
                text: accumulatedText,
                sources: [],
                isStreaming: true,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, text: accumulatedText }
                  : m
              )
            );
          }
        } else if (eventName === 'done') {
          streamSuccess = true;
          const isAbstained = Boolean(
            payload.abstain ||
            payload.abstained ||
            payload.backend === 'crag_fallback_gate' ||
            payload.backend === 'safety_boundary_gate' ||
            payload.backend === 'safety_trap_gate' ||
            payload.backend === 'calibrated_abstention_gate' ||
            payload.backend === 'unverified_premise_gate'
          );

          if (payload.query_condensation?.rewritten && payload.query_condensation?.condensed_query) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === userMsgId
                  ? { ...m, interpretedQuery: payload.query_condensation.condensed_query }
                  : m
              )
            );
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    text: payload.answer || accumulatedText,
                    sources: payload.sources || [],
                    isAbstained,
                    backend: payload.backend,
                    isStreaming: false
                  }
                : m
            )
          );
        }
      }
    }
  } catch (streamErr) {
    console.warn('[AiTutorModal] Streaming failed, falling back to buffered request:', streamErr);
  }

  // Automatic Fallback to Buffered Mode
  if (!streamSuccess && !receivedFirstToken) {
    try {
      const res = await api.post('/api/rag/ask', {
        question: q,
        stream: false,
        student_id: targetStudentId || undefined,
        course_id: courseId,
        batch_id: batchId
      }, {
        headers: {
          'X-Service-Key': 'lms-n8n-service-key-2026'
        }
      });

      const reply = res.data?.answer || 'I could not generate an answer at this time.';
      const sources: SourceCitation[] = res.data?.sources || [];
      const backend = res.data?.backend;

      const isAbstained = Boolean(
        res.data?.abstain ||
        res.data?.abstained ||
        backend === 'crag_fallback_gate' ||
        backend === 'safety_boundary_gate' ||
        backend === 'safety_trap_gate' ||
        backend === 'calibrated_abstention_gate' ||
        backend === 'unverified_premise_gate'
      );

      const queryCondensation = res.data?.query_condensation;
      if (queryCondensation?.rewritten === true && queryCondensation?.condensed_query) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsgId
              ? { ...m, interpretedQuery: queryCondensation.condensed_query }
              : m
          )
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          sender: 'assistant',
          text: reply,
          sources,
          isAbstained,
          backend,
          isStreaming: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          sender: 'assistant',
          text: 'Sorry, I encountered an issue connecting to the AI Tutor service. Please ensure the backend server and Ollama are running.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  } else {
    setLoading(false);
  }
};
```

---

## 8. Verification Strategy

1. **Build Verification**:
   Execute `cd frontend && npm run build` to verify that TypeScript compilation and Vite bundling pass with 0 errors.
2. **Streaming & Cursor Verification**:
   Trigger a query in `AiTutorModal.tsx` while FrankenPHP, Cross-Encoder, and Ollama are running.
   Confirm that:
   - Initial spinner displays during retrieval (~200–400ms).
   - Once generation begins, tokens appear progressively on screen.
   - A blinking typing cursor is visible at the end of the streaming text.
3. **Metadata & Formatting Verification**:
   - Out-of-domain query (e.g., "What is quantum mechanics?"): Verify that stream completion immediately formats the message into an amber warning card with the `<AlertCircle>` icon.
   - Follow-up query in a conversation (e.g., "What about its return value?"): Verify that `↳ Interpreted as: "..."` subtitle appears below the user's message.
   - In-domain query (e.g., "Explain useEffect cleanup"): Verify that verified course source badges with page numbers (e.g., `• p. 42`) appear at the bottom of the assistant card.
4. **Fallback Verification**:
   Simulate stream failure (e.g., provide an invalid streaming endpoint or test with stream aborted) and verify that the component automatically falls back to buffered `api.post('/api/rag/ask')` and renders the complete answer without error.
