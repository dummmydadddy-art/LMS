// Section 12: Deterministic Retrieval Integrity Test
// Runs independently of any LLM; directly verifies that every Golden query retrieves its ground-truth source material.

const fs = require('fs');
const path = require('path');
const { calculateIRMetrics } = require('./ir_metrics');

const API_BASE = process.env.RAG_API_BASE || 'http://127.0.0.1:8000';
const SERVICE_KEY = process.env.SERVICE_KEY || 'lms-n8n-service-key-2026';

async function runIntegrityTest() {
  console.log("================================================================================");
  console.log("  SECTION 12: DETERMINISTIC RETRIEVAL INTEGRITY TEST (LLM-INDEPENDENT)");
  console.log("================================================================================\n");

  const goldenPath = path.join(__dirname, '..', 'datasets', 'golden', 'lms_golden_v1.json');
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

  let passCount = 0;
  let failCount = 0;
  const failures = [];

  for (const tc of golden) {
    const res = await fetch(`${API_BASE}/api/rag/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': SERVICE_KEY
      },
      body: JSON.stringify({ query: tc.query, limit: 3, threshold: 0.20 })
    });

    if (!res.ok) {
      failCount++;
      failures.push({ id: tc.id, reason: `HTTP ${res.status}` });
      continue;
    }

    const data = await res.json();
    const retrieved = data.results || [];
    const metrics = calculateIRMetrics(tc, retrieved, [1, 3]);

    if (metrics.hitRate['hit@3'] === 1.0) {
      passCount++;
    } else {
      failCount++;
      const topTitle = retrieved[0] ? retrieved[0].title : 'NONE';
      failures.push({
        id: tc.id,
        query: tc.query,
        expected: tc.expected_doc,
        got: topTitle,
        count: retrieved.length
      });
    }
  }

  console.log(`Integrity Test Summary: ${passCount} / ${golden.length} PASSED (${((passCount / golden.length) * 100).toFixed(1)}%)`);

  if (failCount > 0) {
    console.error(`\nFAILED CASES (${failCount}):`);
    failures.forEach(f => {
      console.error(`  - [${f.id}] Expected '${f.expected}', Got '${f.got}' (Retrieved: ${f.count})`);
    });
    return false;
  } else {
    console.log("\n>>> ALL 40 GOLDEN TEST CASES PASSED WITH 100% RETRIEVAL INTEGRITY <<<\n");
    return true;
  }
}

if (require.main === module) {
  runIntegrityTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runIntegrityTest };
