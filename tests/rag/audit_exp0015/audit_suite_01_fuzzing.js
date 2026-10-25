// EXP-0015 Audit Suite 01: Comprehensive Query Fuzzing
const fs = require('fs');
const path = require('path');
const { searchGateway, askGateway, computeStats } = require('./audit_harness_common');

const fuzzInputs = [
  // 1-word queries
  { category: '1_word', query: 'react' },
  { category: '1_word', query: 'hooks' },
  { category: '1_word', query: 'sql' },
  { category: '1_word', query: 'null' },
  { category: '1_word', query: 'undefined' },
  { category: '1_word', query: 'NaN' },
  { category: '1_word', query: '0' },
  { category: '1_word', query: 'function' },
  { category: '1_word', query: 'true' },

  // 2-word queries
  { category: '2_word', query: 'use effect' },
  { category: '2_word', query: 'post gres' },
  { category: '2_word', query: 'css grid' },
  { category: '2_word', query: 'error 500' },
  { category: '2_word', query: 'dead zone' },

  // Fragments
  { category: 'fragments', query: 'what if when' },
  { category: 'fragments', query: 'because of the' },
  { category: 'fragments', query: 'where is' },
  { category: 'fragments', query: 'is it' },
  { category: 'fragments', query: 'how to' },

  // Repeated words
  { category: 'repeated_words', query: 'react '.repeat(30).trim() },
  { category: 'repeated_words', query: 'useEffect '.repeat(50).trim() },
  { category: 'repeated_words', query: 'database '.repeat(40).trim() },

  // Punctuation-only
  { category: 'punctuation_only', query: '???' },
  { category: 'punctuation_only', query: '!!!' },
  { category: 'punctuation_only', query: '?!?!?;;;...' },
  { category: 'punctuation_only', query: '---***---' },
  { category: 'punctuation_only', query: '&&&&&&' },

  // Whitespace-only / empty
  { category: 'whitespace_only', query: ' ' },
  { category: 'whitespace_only', query: '    ' },
  { category: 'whitespace_only', query: '\t\t\n\n  ' },

  // Mixed case
  { category: 'mixed_case', query: 'rEaCt hOoKs' },
  { category: 'mixed_case', query: 'uSeEfFeCt cLeAnUp' },
  { category: 'mixed_case', query: 'pOsTgReSqL b-TrEe' },
  { category: 'mixed_case', query: 'nOdE jS lIbUv' },

  // Unicode & Non-Latin
  { category: 'unicode_non_latin', query: 'реакция хуки' },
  { category: 'unicode_non_latin', query: 'ریاکٹ ہکس' },
  { category: 'unicode_non_latin', query: '反应挂钩' },
  { category: 'unicode_non_latin', query: 'リアクトフック' },
  { category: 'unicode_non_latin', query: 'प्रतिक्रिया हुक' },
  { category: 'unicode_accents', query: 'Café au lait syntax façade' },
  { category: 'unicode_accents', query: 'über naïve résumé' },

  // Emojis
  { category: 'emojis', query: '🔥 React 🚀 hooks' },
  { category: 'emojis', query: '⚛️ useState 💻 update' },
  { category: 'emojis', query: '🐛 bug ❓ in node event loop' },
  { category: 'emojis', query: '🔍 search ⚡ postgres index' },
  { category: 'emojis', query: '😀😁😂🤣😃😄' },

  // Code snippets
  { category: 'code_valid', query: 'const [count, setCount] = useState(0);' },
  { category: 'code_valid', query: 'SELECT * FROM users WHERE id = 1;' },
  { category: 'code_valid', query: 'app.use((req, res, next) => next());' },
  { category: 'code_valid', query: 'display: flex; justify-content: center;' },

  // Malformed code
  { category: 'code_malformed', query: 'function() {{ return [; }' },
  { category: 'code_malformed', query: 'SELECT FROM WHERE ;;;' },
  { category: 'code_malformed', query: 'div { display: flex; color: }' },
  { category: 'code_malformed', query: 'useEffect((() =>> {{' },

  // HTML fragments
  { category: 'html_injection_fuzz', query: '<script>alert("xss")</script>' },
  { category: 'html_injection_fuzz', query: '<img src=x onerror=alert(1)>' },
  { category: 'html_injection_fuzz', query: '<div class="test">Hello React</div>' },
  { category: 'html_injection_fuzz', query: '<!-- comment --> what is TDZ' },

  // SQL fragments
  { category: 'sql_injection_fuzz', query: "' OR 1=1 --" },
  { category: 'sql_injection_fuzz', query: "'; DROP TABLE material_chunks; --" },
  { category: 'sql_injection_fuzz', query: "UNION SELECT null, null, null FROM sqlite_master--" },
  { category: 'sql_injection_fuzz', query: "1' ORDER BY 1,2,3--" },

  // JSON fragments
  { category: 'json_fragments', query: '{"query": "useEffect", "limit": 5}' },
  { category: 'json_fragments', query: '{"unclosed": "brace", "data": [1,2,' },
  { category: 'json_fragments', query: '{"__proto__": {"polluted": true}}' },

  // Extremely long queries
  { category: 'extreme_length', query: 'what is the exact behavior of react usestate hook when '.repeat(15) }, // ~900 chars
  { category: 'extreme_length', query: 'explain postgres indexing and btree performance factors '.repeat(35) }, // ~2000 chars
  { category: 'extreme_length', query: 'A'.repeat(4000) }, // 4000 single chars

  // Nested / Contradictory / Unrelated queries
  { category: 'nested_complex', query: 'If React re-renders when state changes, why does useRef not trigger a re-render when .current changes, and what happens to useEffect?' },
  { category: 'contradictory_premise', query: 'How do I reassign a const variable in JavaScript without getting a TypeError?' },
  { category: 'unrelated_composite', query: 'What is CSS Flexbox and how does PostgreSQL vacuuming work and what is Node libuv thread pool?' }
];

async function runFuzzingAudit() {
  console.log('================================================================');
  console.log(`  RUNNING EXP-0015 SUITE 01: COMPREHENSIVE QUERY FUZZING (${fuzzInputs.length} Inputs)`);
  console.log('================================================================\n');

  const results = [];
  const failures = [];
  let successCount = 0;
  let crashCount = 0;
  let timeoutCount = 0;
  let abstentionCount = 0;
  const latencies = [];

  for (let i = 0; i < fuzzInputs.length; i++) {
    const item = fuzzInputs[i];
    const preview = item.query.length > 40 ? item.query.substring(0, 37) + '...' : item.query;
    process.stdout.write(`[${i + 1}/${fuzzInputs.length}] [${item.category}] "${preview.replace(/[\n\r]/g, ' ')}" ... `);

    const res = await searchGateway(item.query, { limit: 5 });
    latencies.push(res.latency);

    let status = 'PASSED';
    let failureDetail = null;

    if (!res.success) {
      if (res.statusCode === 408 || res.error === 'Request Timeout') {
        status = 'TIMEOUT';
        timeoutCount++;
        failureDetail = { type: 'TIMEOUT', error: res.error, latency: res.latency };
      } else {
        status = 'ERROR';
        crashCount++;
        failureDetail = { type: 'ERROR', statusCode: res.statusCode, error: res.error };
      }
    } else {
      successCount++;
      if (res.abstain || res.results.length === 0) {
        abstentionCount++;
      }

      // Check for anomalous behavior
      if (item.category === 'punctuation_only' && res.results.length > 0 && !res.abstain) {
        // Punctuation-only should abstain!
        status = 'ANOMALOUS_RETRIEVAL';
        failureDetail = {
          type: 'FALSE_ACCEPTANCE',
          note: 'Punctuation-only query returned non-abstaining results',
          topDoc: res.results[0].title,
          confidence: res.confidence
        };
      } else if (item.category === 'whitespace_only' && res.results.length > 0 && !res.abstain) {
        status = 'ANOMALOUS_RETRIEVAL';
        failureDetail = {
          type: 'FALSE_ACCEPTANCE',
          note: 'Whitespace-only query returned non-abstaining results',
          topDoc: res.results[0].title,
          confidence: res.confidence
        };
      }
    }

    console.log(`${status} (${res.latency}ms, status: ${res.statusCode}, chunks: ${res.results.length}, abstain: ${res.abstain})`);

    const record = {
      index: i + 1,
      category: item.category,
      query: item.query,
      statusCode: res.statusCode,
      latency: res.latency,
      abstain: res.abstain,
      confidence: res.confidence,
      chunksReturned: res.results.length,
      topChunk: res.results[0] ? { title: res.results[0].title, score: res.results[0].score } : null,
      status,
      failureDetail
    };

    results.push(record);
    if (failureDetail) {
      failures.push(record);
    }
  }

  const stats = computeStats(latencies);
  const summary = {
    total_fuzz_inputs: fuzzInputs.length,
    success_count: successCount,
    crash_count: crashCount,
    timeout_count: timeoutCount,
    abstention_count: abstentionCount,
    anomalous_retrievals: failures.filter(f => f.failureDetail.type === 'FALSE_ACCEPTANCE').length,
    latencies: stats,
    failure_cases: failures
  };

  const outPath = path.resolve('D:/Collage project/EduConnect-LMS-Experimental/tests/rag/audit_exp0015/results_suite_01_fuzzing.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log('\n----------------------------------------------------------------');
  console.log(`Suite 01 Fuzzing Complete:`);
  console.log(`  Total Tested: ${fuzzInputs.length}`);
  console.log(`  Crashes: ${crashCount}, Timeouts: ${timeoutCount}`);
  console.log(`  Anomalous Retrievals: ${summary.anomalous_retrievals}`);
  console.log(`  Latency: p50 = ${stats.p50}ms, p95 = ${stats.p95}ms, max = ${stats.max}ms`);
  console.log(`  Results written to: ${outPath}`);
  console.log('----------------------------------------------------------------\n');
}

runFuzzingAudit().catch(console.error);
