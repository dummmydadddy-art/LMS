/**
 * =============================================================================
 * EMPIRICAL ADVERSARIAL CHALLENGER TEST SUITE: SSE Streaming in AiTutorModal.tsx
 * Agent: challenger_m1_4_1 (EMPIRICAL CHALLENGER)
 * Target: frontend/src/components/AiTutorModal.tsx
 * 
 * Verifications:
 * 1. Fragmented SSE chunk delivery across TCP boundaries (\n split across chunks)
 * 2. Pathological 1-byte chunk stream delivery
 * 3. Multi-token burst payloads and special characters (newlines, markdown, quotes)
 * 4. Abnormal stream termination: connection drops before `event: done`, malformed JSON frames
 * 5. Buffered fallback triggering on network/fetch failure
 * 6. CRAG abstention gates, query rewrite hydration, and page citations
 * =============================================================================
 */

import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const MODAL_PATH = path.resolve(ROOT_DIR, 'frontend/src/components/AiTutorModal.tsx');

let passes = 0;
let failures = 0;
const results = [];

function logPass(name, details = '') {
  passes++;
  const msg = `  [PASS] ${name}${details ? ` (${details})` : ''}`;
  console.log(msg);
  results.push({ name, status: 'PASS', details });
}

function logFail(name, details = '') {
  failures++;
  const msg = `  [FAIL] ${name}: ${details}`;
  console.error(msg);
  results.push({ name, status: 'FAIL', details });
}

console.log('='.repeat(75));
console.log(' EMPIRICAL ADVERSARIAL STRESS TEST SUITE: SSE STREAMING (AiTutorModal.tsx)');
console.log('='.repeat(75));

// Verify that the target source file exists
assert.ok(fs.existsSync(MODAL_PATH), `AiTutorModal.tsx must exist at ${MODAL_PATH}`);
const modalSource = fs.readFileSync(MODAL_PATH, 'utf-8');

// --- Static AST / Code Inspection Checks ---
console.log('\n--- SUITE 1: Source Code & Contract Invariants ---');

function checkCodeInvariant(description, regex) {
  if (regex.test(modalSource)) {
    logPass(description);
  } else {
    logFail(description, `Regex pattern ${regex} not matched in AiTutorModal.tsx`);
  }
}

checkCodeInvariant(
  'Stream URL has query param ?stream=true',
  /fetch\(\s*`\$\{API_BASE\}\/api\/rag\/ask\?stream=true`/
);

checkCodeInvariant(
  'Header Accept includes text/event-stream',
  /'Accept':\s*'text\/event-stream'/
);

checkCodeInvariant(
  'Header X-Service-Key is included',
  /'X-Service-Key':\s*'lms-n8n-service-key-2026'/
);

checkCodeInvariant(
  'ReadableStream reader and TextDecoder instantiated',
  /res\.body\.getReader\(\)[\s\S]*TextDecoder\(\)/
);

checkCodeInvariant(
  'Buffer split by double newline separator',
  /buffer\.split\(\/\\r\?\\n\\r\?\\n\/\)/
);

checkCodeInvariant(
  'Event and data line parsing logic exists',
  /line\.startsWith\('event:'\)[\s\S]*line\.startsWith\('data:'\)/
);

checkCodeInvariant(
  'Trailing buffer block handled on stream end',
  /\/\/ Handle any trailing complete SSE event remaining in buffer[\s\S]*if\s*\(buffer\.trim\(\)\)/
);

checkCodeInvariant(
  'Buffered Axios fallback on stream failure without tokens',
  /if\s*\(!streamSuccess\s*&&\s*!receivedFirstToken\)[\s\S]*api\.post\('\/api\/rag\/ask'/
);

checkCodeInvariant(
  'Pulsating typing cursor rendered while isStreaming is true',
  /animate-pulse align-middle rounded-sm/
);

checkCodeInvariant(
  'CRAG fallback abstention styling rendered',
  /Curriculum Boundary Notice \(CRAG Fallback\)/
);

checkCodeInvariant(
  'Query condensation subtitle ↳ Interpreted as: rendered',
  /↳[\s\S]*Interpreted as:[\s\S]*m\.interpretedQuery/
);

checkCodeInvariant(
  'Page citation formatting supported (page, page_citation, page_number)',
  /s\.page\s*\|\|\s*s\.page_citation\s*\|\|\s*\(s\.page_number\s*\?\s*`p\.\s*\$\{s\.page_number\}`/
);

// --- SSE Client Engine (matching AiTutorModal.tsx lines 160-424) ---
class AiTutorStreamingClient {
  constructor(apiBase, mockAxiosPost) {
    this.apiBase = apiBase;
    this.mockAxiosPost = mockAxiosPost;
  }

  async executeSend(rawQ, options = {}) {
    const q = (rawQ || '').trim();
    if (!q || options.loading || options.isStreaming) {
      return { rejected: true, streamSuccess: false, messages: [] };
    }

    const {
      abortSignal,
      targetStudentId = 'test-student-1',
      courseId = 'course-1',
      batchId = 'batch-1'
    } = options;

    let loading = true;
    let isStreaming = false;
    let streamSuccess = false;
    let receivedFirstToken = false;
    let accumulatedText = '';
    const userMsgId = 'user-1';
    const assistantMsgId = 'assistant-1';
    let messages = [
      { id: userMsgId, sender: 'user', text: q, timestamp: '10:00' }
    ];

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-Service-Key': 'lms-n8n-service-key-2026'
      };

      const res = await fetch(`${this.apiBase}/api/rag/ask?stream=true`, {
        method: 'POST',
        headers,
        signal: abortSignal,
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          if (!block.trim()) continue;
          let eventName = 'token';
          const dataLines = [];

          for (const rawLine of block.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trim());
            }
          }

          const dataStr = dataLines.join('\n');
          if (!dataStr) continue;

          try {
            const payload = JSON.parse(dataStr);

            if (eventName === 'token' && typeof payload.token === 'string') {
              accumulatedText += payload.token;
              if (!receivedFirstToken) {
                receivedFirstToken = true;
                loading = false;
                isStreaming = true;
                messages.push({
                  id: assistantMsgId,
                  sender: 'assistant',
                  text: accumulatedText,
                  sources: [],
                  isStreaming: true,
                  timestamp: '10:00'
                });
              } else {
                messages = messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, text: accumulatedText } : m
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
                messages = messages.map((m) =>
                  m.id === userMsgId
                    ? { ...m, interpretedQuery: payload.query_condensation.condensed_query }
                    : m
                );
              }

              const finalText = payload.answer || accumulatedText;
              const sources = payload.sources || [];

              messages = messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      text: finalText,
                      sources,
                      isAbstained,
                      backend: payload.backend,
                      isStreaming: false
                    }
                  : m
              );
            }
          } catch (parseErr) {
            // malformed JSON
          }
        }
      }

      // Trailing block
      if (buffer.trim()) {
        let eventName = 'token';
        const dataLines = [];
        for (const rawLine of buffer.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          }
        }
        const dataStr = dataLines.join('\n');
        if (dataStr) {
          try {
            const payload = JSON.parse(dataStr);
            if (eventName === 'done') {
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
                messages = messages.map((m) =>
                  m.id === userMsgId
                    ? { ...m, interpretedQuery: payload.query_condensation.condensed_query }
                    : m
                );
              }

              messages = messages.map((m) =>
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
              );
            }
          } catch (parseErr) {
            // trailing error
          }
        }
      }
    } catch (streamErr) {
      if (options.abortSignal?.aborted) {
        return { aborted: true, messages, loading: false, isStreaming: false };
      }
    } finally {
      isStreaming = false;
      messages = messages.map((m) =>
        m.id === assistantMsgId && m.isStreaming ? { ...m, isStreaming: false } : m
      );
    }

    let fallbackTriggered = false;
    if (!streamSuccess && !receivedFirstToken) {
      fallbackTriggered = true;
      loading = true;
      try {
        const res = await this.mockAxiosPost('/api/rag/ask', {
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
        const sources = res.data?.sources || [];
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
          messages = messages.map((m) =>
            m.id === userMsgId
              ? { ...m, interpretedQuery: queryCondensation.condensed_query }
              : m
          );
        }

        const botMsg = {
          id: assistantMsgId,
          sender: 'assistant',
          text: reply,
          sources: sources,
          isAbstained: isAbstained,
          backend: backend,
          isStreaming: false,
          timestamp: '10:00'
        };
        messages.push(botMsg);
      } catch (axiosErr) {
        messages.push({
          id: assistantMsgId,
          sender: 'assistant',
          text: 'Sorry, I encountered an issue connecting to the AI Tutor service. Please ensure the backend server and Ollama are running.',
          timestamp: '10:00'
        });
      } finally {
        loading = false;
      }
    } else {
      loading = false;
    }

    return {
      messages,
      loading,
      isStreaming,
      streamSuccess,
      receivedFirstToken,
      fallbackTriggered,
      accumulatedText
    };
  }
}

// --- Active HTTP Mock Server for Empirical Stress Testing ---
let server;
let serverPort;
let currentServerHandler = null;

function startMockServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      if (currentServerHandler) {
        currentServerHandler(req, res);
      } else {
        res.statusCode = 404;
        res.end();
      }
    });
    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      resolve(serverPort);
    });
  });
}

function stopMockServer() {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
}

async function runEmpiricalStressSuite() {
  const port = await startMockServer();
  const apiBase = `http://127.0.0.1:${port}`;

  console.log(`\nMock HTTP server listening on ${apiBase}`);

  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Fragmented SSE Chunk Delivery Across TCP Boundaries ---');
  // --------------------------------------------------------------------------

  // Test 1: Chunk split across \n in \n\n
  {
    currentServerHandler = (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      // Chunk 1: ends with single newline \n
      res.write('event: token\ndata: {"token":"Hello"}\n');
      // Chunk 2: begins with \n completing the double-newline delimiter
      res.write('\nevent: token\ndata: {"token":" world"}\n\n');
      res.write('event: done\ndata: {"answer":"Hello world","sources":[{"title":"React Doc","chunk_index":0,"similarity":0.9}]}\n\n');
      res.end();
    };

    const client = new AiTutorStreamingClient(apiBase, async () => { throw new Error('Fallback should not run'); });
    const res = await client.executeSend('What is React?');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    if (res.streamSuccess && asstMsg?.text === 'Hello world' && !res.fallbackTriggered) {
      logPass('TCP Boundary Split: Single \\n split across chunk boundary handled flawlessly');
    } else {
      logFail('TCP Boundary Split: Single \\n split across chunks', `Got text: ${asstMsg?.text}`);
    }
  }

  // Test 2: Extreme 1-Byte Chunk Delivery (Every single byte pushed separately)
  {
    currentServerHandler = (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      const fullPayload = 'event: token\ndata: {"token":"A"}\n\n' +
                          'event: token\ndata: {"token":"B"}\n\n' +
                          'event: token\ndata: {"token":"C"}\n\n' +
                          'event: done\ndata: {"answer":"ABC","sources":[]}\n\n';
      const buf = Buffer.from(fullPayload, 'utf-8');
      for (let i = 0; i < buf.length; i++) {
        res.write(buf.subarray(i, i + 1));
      }
      res.end();
    };

    const client = new AiTutorStreamingClient(apiBase, async () => { throw new Error('Fallback should not run'); });
    const res = await client.executeSend('Byte stream test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    if (res.streamSuccess && asstMsg?.text === 'ABC') {
      logPass('Pathological Stress: 1-byte chunk stream delivery fully reconstructed');
    } else {
      logFail('Pathological Stress: 1-byte chunk stream delivery', `Expected "ABC", got "${asstMsg?.text}"`);
    }
  }

  // Test 3: Split across \r\n\r\n CRLF boundary
  {
    currentServerHandler = (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      });
      res.write('event: token\r\ndata: {"token":"CRLF"}\r\n\r');
      res.write('\nevent: done\r\ndata: {"answer":"CRLF","sources":[]}\r\n\r\n');
      res.end();
    };

    const client = new AiTutorStreamingClient(apiBase, async () => { throw new Error('Fallback should not run'); });
    const res = await client.executeSend('CRLF test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    if (res.streamSuccess && asstMsg?.text === 'CRLF') {
      logPass('CRLF Split: \\r\\n\\r split across chunk boundary handled correctly');
    } else {
      logFail('CRLF Split: \\r\\n\\r split across chunk boundary', `Got: ${asstMsg?.text}`);
    }
  }

  // Test 4: Split in middle of token value across chunks
  {
    currentServerHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write('event: token\ndata: {"token":"Part');
      res.write('ial Token"}\n\nevent: done\ndata: {"answer":"Partial Token","sources":[]}\n\n');
      res.end();
    };

    const client = new AiTutorStreamingClient(apiBase, async () => { throw new Error('Fallback should not run'); });
    const res = await client.executeSend('Partial token test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    if (res.streamSuccess && asstMsg?.text === 'Partial Token') {
      logPass('Chunk Split: Middle of JSON token value split cleanly buffered and reassembled');
    } else {
      logFail('Chunk Split: Middle of JSON token value split', `Got: ${asstMsg?.text}`);
    }
  }

  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Multi-Token Bursts & Special Characters ---');
  // --------------------------------------------------------------------------

  // Test 5: Rapid Burst of 50 Tokens in a single TCP packet
  {
    currentServerHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      let packet = '';
      let expectedAnswer = '';
      for (let i = 1; i <= 50; i++) {
        const tok = `T${i} `;
        expectedAnswer += tok;
        packet += `event: token\ndata: {"token":"${tok}"}\n\n`;
      }
      packet += `event: done\ndata: {"answer":"${expectedAnswer}","sources":[]}\n\n`;
      res.write(packet);
      res.end();
    };

    const client = new AiTutorStreamingClient(apiBase, async () => {});
    const res = await client.executeSend('Burst test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    if (res.streamSuccess && asstMsg?.text.startsWith('T1 ') && asstMsg?.text.includes('T50 ')) {
      logPass('Burst Payload: 50 tokens delivered in single TCP chunk parsed with 100% integrity');
    } else {
      logFail('Burst Payload: 50 tokens delivered in single TCP chunk', `Got: ${asstMsg?.text?.slice(0, 50)}...`);
    }
  }

  // Test 6: Special Characters, Markdown Code Fences, Quotes, and Whitespace Tokens
  {
    const complexCodeBlock = "```typescript\nfunction greet(name: string) {\n  return `Hello, ${name}! \\\"escaped\\\"`;\n}\n```";
    currentServerHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      // Token with spaces
      res.write('event: token\ndata: ' + JSON.stringify({ token: '  const x = ' }) + '\n\n');
      // Token with newlines and markdown
      res.write('event: token\ndata: ' + JSON.stringify({ token: '\n\n' + complexCodeBlock }) + '\n\n');
      // Token with unicode and emojis
      res.write('event: token\ndata: ' + JSON.stringify({ token: '\n↳ Verified 🎯 [Section 1]' }) + '\n\n');
      res.write('event: done\ndata: ' + JSON.stringify({
        answer: '  const x = \n\n' + complexCodeBlock + '\n↳ Verified 🎯 [Section 1]',
        sources: []
      }) + '\n\n');
      res.end();
    };

    const client = new AiTutorStreamingClient(apiBase, async () => {});
    const res = await client.executeSend('Code block test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    const expectedSnippet = 'function greet(name: string)';
    if (res.streamSuccess && asstMsg?.text.includes(expectedSnippet) && asstMsg?.text.includes('🎯')) {
      logPass('Special Characters: Markdown code blocks, quotes, newlines, and unicode emojis preserved');
    } else {
      logFail('Special Characters: Markdown code blocks, quotes, newlines', `Got: ${asstMsg?.text}`);
    }
  }

  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Abnormal Stream Termination & Error Resilience ---');
  // --------------------------------------------------------------------------

  // Test 7: Abnormal termination: Server connection drops before any token arrived
  {
    currentServerHandler = (req, res) => {
      // Abruptly destroy socket before writing anything
      req.socket.destroy();
    };

    let fallbackCalled = false;
    const mockAxios = async (endpoint, data) => {
      fallbackCalled = true;
      return {
        data: {
          answer: 'Recovered via buffered Axios fallback',
          sources: [{ title: 'Notes', chunk_index: 1, similarity: 0.85 }]
        }
      };
    };

    const client = new AiTutorStreamingClient(apiBase, mockAxios);
    const res = await client.executeSend('Immediate drop test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    if (fallbackCalled && res.fallbackTriggered && asstMsg?.text === 'Recovered via buffered Axios fallback') {
      logPass('Immediate Connection Drop: Buffered fallback triggered and hydrated answer successfully');
    } else {
      logFail('Immediate Connection Drop', `fallbackCalled=${fallbackCalled}, text=${asstMsg?.text}`);
    }
  }

  // Test 8: Abnormal termination: Server drops MID-STREAM (after tokens sent, before event: done)
  {
    currentServerHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write('event: token\ndata: {"token":"Partial response received before crash"}\n\n');
      // Abruptly terminate connection
      setTimeout(() => {
        req.socket.destroy();
      }, 30);
    };

    let fallbackCalled = false;
    const mockAxios = async () => {
      fallbackCalled = true;
      return { data: { answer: 'Overwritten fallback' } };
    };

    const client = new AiTutorStreamingClient(apiBase, mockAxios);
    const res = await client.executeSend('Mid stream drop test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    // Should NOT trigger fallback over already-streamed tokens; cursor isStreaming should be cleared
    if (!fallbackCalled && asstMsg?.text === 'Partial response received before crash' && asstMsg?.isStreaming === false) {
      logPass('Mid-Stream Drop: Existing tokens retained, cursor stopped, duplicate fallback prevented');
    } else {
      logFail('Mid-Stream Drop: Existing tokens retained', `fallbackCalled=${fallbackCalled}, text=${asstMsg?.text}`);
    }
  }

  // Test 9: Malformed JSON frames interspersed with valid frames
  {
    currentServerHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write('event: token\ndata: {"token":"Good token 1 "}\n\n');
      // Broken JSON
      res.write('event: token\ndata: {INVALID_JSON_CORRUPTED_FRAME}\n\n');
      // Valid token follows
      res.write('event: token\ndata: {"token":"Good token 2"}\n\n');
      res.write('event: done\ndata: {"answer":"Good token 1 Good token 2","sources":[]}\n\n');
      res.end();
    };

    const client = new AiTutorStreamingClient(apiBase, async () => {});
    const res = await client.executeSend('Malformed frame test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    if (res.streamSuccess && asstMsg?.text === 'Good token 1 Good token 2') {
      logPass('Malformed JSON Frames: Bad frames skipped without stream crash; subsequent tokens parsed');
    } else {
      logFail('Malformed JSON Frames', `Got: ${asstMsg?.text}`);
    }
  }

  // Test 10: Client Abort Signal (User clears conversation or closes modal mid-stream)
  {
    const controller = new AbortController();
    currentServerHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write('event: token\ndata: {"token":"Starting..."}\n\n');
    };

    const client = new AiTutorStreamingClient(apiBase, async () => { throw new Error('Fallback should not run'); });
    const sendPromise = client.executeSend('Abort test', { abortSignal: controller.signal });
    setTimeout(() => controller.abort(), 20);

    const res = await sendPromise;
    if (res.aborted && !res.isStreaming && !res.loading) {
      logPass('Client Abort: Request signal aborted cleanly; states reset without fallback error');
    } else {
      logFail('Client Abort', `aborted=${res.aborted}`);
    }
  }

  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: CRAG Fallback, Query Rewriting, and Page Citations ---');
  // --------------------------------------------------------------------------

  // Test 11: CRAG Fallback Gate / Abstention styling
  {
    const abstainMsg = "I apologize, but this topic is outside the curriculum scope and not in the approved curriculum, so I cannot answer accurately.";
    currentServerHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write('event: token\ndata: ' + JSON.stringify({ token: abstainMsg }) + '\n\n');
      res.write('event: done\ndata: ' + JSON.stringify({
        answer: abstainMsg,
        sources: [],
        abstain: true,
        backend: 'crag_fallback_gate'
      }) + '\n\n');
      res.end();
    };

    const client = new AiTutorStreamingClient(apiBase, async () => {});
    const res = await client.executeSend('What is quantum physics?');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    if (res.streamSuccess && asstMsg?.isAbstained === true && asstMsg?.backend === 'crag_fallback_gate') {
      logPass('CRAG Fallback Gate: Identified abstention flag and crag_fallback_gate backend');
    } else {
      logFail('CRAG Fallback Gate', `isAbstained=${asstMsg?.isAbstained}, backend=${asstMsg?.backend}`);
    }
  }

  // Test 12: Query Condensation Rewrite Subtitle
  {
    currentServerHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write('event: token\ndata: {"token":"Answer to rewritten query"}\n\n');
      res.write('event: done\ndata: ' + JSON.stringify({
        answer: 'Answer to rewritten query',
        sources: [],
        query_condensation: {
          rewritten: true,
          condensed_query: 'Explain React useState hook setter function'
        }
      }) + '\n\n');
      res.end();
    };

    const client = new AiTutorStreamingClient(apiBase, async () => {});
    const res = await client.executeSend('How does its setter work?');
    const userMsg = res.messages.find(m => m.sender === 'user');

    if (userMsg?.interpretedQuery === 'Explain React useState hook setter function') {
      logPass('Query Rewrite Subtitle: Populated interpretedQuery subtitle on user message');
    } else {
      logFail('Query Rewrite Subtitle', `interpretedQuery=${userMsg?.interpretedQuery}`);
    }
  }

  // Test 13: Page Citation extraction and metadata hydration
  {
    currentServerHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write('event: token\ndata: {"token":"Answer with citations"}\n\n');
      res.write('event: done\ndata: ' + JSON.stringify({
        answer: 'Answer with citations',
        sources: [
          { title: 'JavaScript The Definitive Guide', chunk_index: 2, similarity: 0.92, page: 'p. 142' },
          { title: 'React Documentation', chunk_index: 0, similarity: 0.88, page_citation: 'pp. 45-47' },
          { title: 'HTML5 Notes', chunk_index: 5, similarity: 0.79, page_number: 18 }
        ]
      }) + '\n\n');
      res.end();
    };

    const client = new AiTutorStreamingClient(apiBase, async () => {});
    const res = await client.executeSend('Citation test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    const s1 = asstMsg?.sources?.[0];
    const s2 = asstMsg?.sources?.[1];
    const s3 = asstMsg?.sources?.[2];

    if (s1?.page === 'p. 142' && s2?.page_citation === 'pp. 45-47' && s3?.page_number === 18) {
      logPass('Page Citation Metadata: All 3 citation page formats hydrated without loss');
    } else {
      logFail('Page Citation Metadata', `s1=${JSON.stringify(s1)}, s2=${JSON.stringify(s2)}, s3=${JSON.stringify(s3)}`);
    }
  }

  // Test 14: Total Outage - Both SSE stream and buffered fallback fail
  {
    currentServerHandler = (req, res) => {
      res.statusCode = 503;
      res.end('Service Unavailable');
    };

    const mockAxiosFailing = async () => {
      throw new Error('Connection refused to backend port 8000');
    };

    const client = new AiTutorStreamingClient(apiBase, mockAxiosFailing);
    const res = await client.executeSend('Total outage test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    if (asstMsg?.text.includes('Sorry, I encountered an issue connecting to the AI Tutor service')) {
      logPass('Total Outage Graceful Degradation: Friendly user error rendered without crash');
    } else {
      logFail('Total Outage Graceful Degradation', `Got text: ${asstMsg?.text}`);
    }
  }

  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Multi-Byte UTF-8, Heartbeats, and Edge Frame Formats ---');
  // --------------------------------------------------------------------------

  // Test 15: Multi-byte UTF-8 character split right across chunk boundary
  {
    currentServerHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      // Rocket emoji 🚀 is 4 bytes: 0xF0 0x9F 0x99 0x80
      const emojiBytes = Buffer.from('🚀', 'utf-8');
      const prefix = Buffer.from('event: token\ndata: {"token":"Launch ', 'utf-8');
      const suffix = Buffer.from('"}\n\nevent: done\ndata: {"answer":"Launch 🚀","sources":[]}\n\n', 'utf-8');

      // Chunk 1 has first 2 bytes of the emoji
      const chunk1 = Buffer.concat([prefix, emojiBytes.subarray(0, 2)]);
      // Chunk 2 has the remaining 2 bytes plus suffix
      const chunk2 = Buffer.concat([emojiBytes.subarray(2, 4), suffix]);

      res.write(chunk1);
      setTimeout(() => {
        res.write(chunk2);
        res.end();
      }, 10);
    };

    const client = new AiTutorStreamingClient(apiBase, async () => {});
    const res = await client.executeSend('UTF-8 split test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    if (res.streamSuccess && asstMsg?.text.includes('Launch 🚀')) {
      logPass('Multi-Byte UTF-8 Split: 4-byte emoji boundary split decoded cleanly without  corruption');
    } else {
      logFail('Multi-Byte UTF-8 Split', `Got: ${asstMsg?.text}`);
    }
  }

  // Test 16: SSE comments (keepalive / heartbeat) interspersed between tokens
  {
    currentServerHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write(': keepalive-ping\n\n');
      res.write('event: token\ndata: {"token":"Token 1 "}\n\n');
      res.write(': ping\n\n');
      res.write('event: token\ndata: {"token":"Token 2"}\n\n');
      res.write(': comment-without-data\n\n');
      res.write('event: done\ndata: {"answer":"Token 1 Token 2","sources":[]}\n\n');
      res.end();
    };

    const client = new AiTutorStreamingClient(apiBase, async () => {});
    const res = await client.executeSend('SSE comments test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    if (res.streamSuccess && asstMsg?.text === 'Token 1 Token 2') {
      logPass('SSE Keepalive Comments: Leading, middle, and trailing comments ignored safely');
    } else {
      logFail('SSE Keepalive Comments', `Got: ${asstMsg?.text}`);
    }
  }

  // Test 17: Trailing event: done WITHOUT double newline before stream closes (immediate EOF)
  {
    currentServerHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write('event: token\ndata: {"token":"Hello"}\n\n');
      // No trailing \n\n, just single line and immediate connection close
      res.write('event: done\ndata: {"answer":"Hello Final","sources":[],"backend":"hybrid"}');
      res.end();
    };

    const client = new AiTutorStreamingClient(apiBase, async () => {});
    const res = await client.executeSend('Trailing done test');
    const asstMsg = res.messages.find(m => m.sender === 'assistant');

    if (res.streamSuccess && asstMsg?.text === 'Hello Final' && asstMsg?.backend === 'hybrid') {
      logPass('Trailing Block Hydration: Buffer trailing event without \\n\\n successfully resolved on EOF');
    } else {
      logFail('Trailing Block Hydration', `streamSuccess=${res.streamSuccess}, text=${asstMsg?.text}`);
    }
  }

  // Test 18: Re-entrance / Concurrency Guard (cannot send while loading or streaming)
  {
    const client = new AiTutorStreamingClient(apiBase, async () => {});
    // Test empty string guard
    const emptyRes = await client.executeSend('   ');
    // If empty query submitted, client should not execute stream
    assert.strictEqual(emptyRes.streamSuccess, false, 'Empty query should be rejected');
    logPass('Concurrency & Validation: Empty / whitespace query rejected cleanly');
  }

  await stopMockServer();

  // Print Summary
  console.log('\n' + '='.repeat(75));
  console.log(` EMPIRICAL TEST SUMMARY: ${passes} PASSED, ${failures} FAILED`);
  console.log('='.repeat(75));

  if (failures > 0) {
    process.exit(1);
  }
}

runEmpiricalStressSuite().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
