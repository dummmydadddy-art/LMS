// Autonomous RAG Evolution Lab - Automated Benchmark Runner
// Runs retrieval and generation benchmarks against the live RAG backend

const fs = require('fs');
const path = require('path');
const { calculateIRMetrics } = require('../evaluators/ir_metrics');
const { evaluateGeneration } = require('../evaluators/generation_metrics');

const API_BASE = process.env.RAG_API_BASE || 'http://127.0.0.1:8000';
const SERVICE_KEY = process.env.SERVICE_KEY || 'lms-n8n-service-key-2026';

const ROOT_DIR = path.resolve(__dirname, '..');
const DATASETS_DIR = path.join(ROOT_DIR, 'datasets');
const EXPERIMENTS_DIR = path.join(ROOT_DIR, 'experiments');

async function callApi(endpoint, body) {
  const start = Date.now();
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': SERVICE_KEY
      },
      body: JSON.stringify(body)
    });
    const latency = Date.now() - start;
    if (!res.ok) {
      const txt = await res.text();
      return { success: false, latency, error: `HTTP ${res.status}: ${txt}` };
    }
    const data = await res.json();
    return { success: true, latency, data };
  } catch (err) {
    return { success: false, latency: Date.now() - start, error: err.message };
  }
}

async function callApiStream(endpoint, body) {
  const start = Date.now();
  let ttft = null;
  let fullAnswer = '';
  let sources = [];
  let abstain = false;
  let confidence = 0.8;
  try {
    const res = await fetch(`${API_BASE}${endpoint}?stream=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-Service-Key': SERVICE_KEY
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const txt = await res.text();
      return { success: false, latency: Date.now() - start, ttft: null, error: `HTTP ${res.status}: ${txt}` };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const d = JSON.parse(line.substring(6));
            if (d.ttftMs && !ttft) ttft = d.ttftMs;
            if (d.token) {
              if (!ttft) ttft = Date.now() - start;
              fullAnswer += d.token;
            }
            if (d.answer) fullAnswer = d.answer;
            if (d.sources) sources = d.sources;
            if (d.abstain !== undefined) abstain = d.abstain;
            if (d.confidence !== undefined) confidence = d.confidence;
          } catch (e) {}
        }
      }
    }
    const latency = Date.now() - start;
    if (!ttft) ttft = latency;
    return {
      success: true,
      latency,
      ttft,
      data: {
        success: true,
        answer: fullAnswer,
        sources,
        abstain,
        confidence,
        streaming: true
      }
    };
  } catch (err) {
    return { success: false, latency: Date.now() - start, ttft: null, error: err.message };
  }
}

async function runBenchmark(options = {}) {
  const {
    experimentId = 'EXP-0001',
    description = 'Baseline Dense Vector Search',
    hypothesis = 'Baseline nomic-embed-text dense retrieval with cosine similarity and SQLite vector table',
    suite = 'all', // 'golden', 'adversarial', 'unanswerable', 'cross_module', 'all'
    runGeneration = true,
    generationSampleLimit = 15, // Limit generation calls if desired, or null for all
    useStreaming = true
  } = options;

  console.log('\n======================================================');
  console.log(`  RUNNING RAG BENCHMARK: ${experimentId}`);
  console.log(`  ${description}`);
  console.log(`  Target: ${API_BASE} | Suite: ${suite}`);
  console.log('======================================================\n');

  const goldenData = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, 'golden', 'lms_golden_v1.json'), 'utf8'));
  const advData = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, 'adversarial', 'lms_adversarial_v1.json'), 'utf8'));
  const unansData = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, 'unanswerable', 'lms_unanswerable_v1.json'), 'utf8'));
  const crossPath = path.join(DATASETS_DIR, 'cross_module', 'lms_cross_module_v1.json');
  const crossData = fs.existsSync(crossPath) ? JSON.parse(fs.readFileSync(crossPath, 'utf8')) : [];

  const testSuites = [];
  if (suite === 'golden' || suite === 'all') testSuites.push({ name: 'Golden (40)', data: goldenData, isUnans: false });
  if (suite === 'adversarial' || suite === 'all') testSuites.push({ name: 'Adversarial (20)', data: advData, isUnans: false });
  if (suite === 'unanswerable' || suite === 'all') testSuites.push({ name: 'Unanswerable (15)', data: unansData, isUnans: true });
  if ((suite === 'cross_module' || suite === 'all') && crossData.length > 0) testSuites.push({ name: 'Cross-Module (22)', data: crossData, isUnans: false, isCross: true });

  const results = {
    experimentId,
    description,
    hypothesis,
    timestamp: new Date().toISOString(),
    suites: {},
    overall: {}
  };

  let totalQueries = 0;
  let allSearchLatencies = [];
  let allGenLatencies = [];
  let allTtftLatencies = [];
  let allHit1 = [];
  let allHit3 = [];
  let allHit5 = [];
  let allMrr = [];
  let allKwRecall = [];
  let allNdcg = [];
  let allClaimSupport = [];
  let allCitationPrecision = [];
  let allCitationCompleteness = [];
  let allAbstentionAcc = [];
  let allHallucination = [];
  let allCoverage3 = [];
  let allCoverage5 = [];

  for (const s of testSuites) {
    console.log(`\n--> Evaluating Suite: ${s.name}...`);
    const suiteResults = [];

    for (let i = 0; i < s.data.length; i++) {
      const tc = s.data[i];
      process.stdout.write(`   [${tc.id}] ${tc.query.substring(0, 45).padEnd(48)} ... `);

      // 1. Evaluate Retrieval (/api/rag/search)
      const searchRes = await callApi('/api/rag/search', {
        query: tc.query,
        limit: 5,
        threshold: 0.20
      });

      const retrieved = searchRes.success ? (searchRes.data.results || []) : [];
      const searchLat = searchRes.latency;
      allSearchLatencies.push(searchLat);

      const ir = calculateIRMetrics(tc, retrieved, [1, 3, 5]);

      if (!s.isUnans) {
        allHit1.push(ir.hitRate['hit@1']);
        allHit3.push(ir.hitRate['hit@3']);
        allHit5.push(ir.hitRate['hit@5']);
        allMrr.push(ir.mrr);
        allKwRecall.push(ir.keywordRecall);
        allNdcg.push(ir.ndcg5);
        if (s.isCross && ir.moduleCoverage) {
          if (ir.moduleCoverage['coverage@3'] !== undefined) allCoverage3.push(ir.moduleCoverage['coverage@3']);
          if (ir.moduleCoverage['coverage@5'] !== undefined) allCoverage5.push(ir.moduleCoverage['coverage@5']);
        }
      }

      // 2. Evaluate Generation (/api/rag/ask) if enabled
      let genEval = null;
      let askLat = 0;
      let ttftLat = null;
      const shouldGen = runGeneration && (generationSampleLimit === null || i < generationSampleLimit || s.isUnans);

      if (shouldGen) {
        const askRes = useStreaming 
          ? await callApiStream('/api/rag/ask', { question: tc.query, limit: 4 })
          : await callApi('/api/rag/ask', { question: tc.query, limit: 4 });

        askLat = askRes.latency;
        allGenLatencies.push(askLat);
        if (askRes.ttft) {
          ttftLat = askRes.ttft;
          allTtftLatencies.push(ttftLat);
        }

        if (askRes.success) {
          genEval = evaluateGeneration(tc, askRes.data, s.isUnans);
          if (s.isUnans) {
            allAbstentionAcc.push(genEval.abstentionAccuracy);
            allHallucination.push(genEval.hallucinationScore);
          } else {
            allClaimSupport.push(genEval.claimSupportScore);
            allCitationPrecision.push(genEval.citationPrecision);
            allCitationCompleteness.push(genEval.citationCompleteness);
            allHallucination.push(genEval.hallucinationScore);
          }
        } else {
          genEval = { error: askRes.error, abstentionAccuracy: 0, claimSupportScore: 0, hallucinationScore: 1, citationPrecision: 0, citationCompleteness: 0 };
          if (s.isUnans) {
            allAbstentionAcc.push(0);
            allHallucination.push(1);
          } else {
            allClaimSupport.push(0);
            allCitationPrecision.push(0);
            allCitationCompleteness.push(0);
            allHallucination.push(1);
          }
        }
      }

      suiteResults.push({
        id: tc.id,
        query: tc.query,
        retrievalLatencyMs: searchLat,
        generationLatencyMs: askLat,
        ttftMs: ttftLat,
        retrievedCount: retrieved.length,
        irMetrics: ir,
        generationMetrics: genEval
      });

      const statusMarker = s.isUnans 
        ? (genEval && genEval.abstentionAccuracy === 1.0 ? 'ABSTAIN_OK' : 'HALLUCINATED')
        : (ir.hitRate['hit@3'] === 1.0 ? 'HIT@3' : 'MISS');
      console.log(`${statusMarker} (search: ${searchLat}ms${askLat ? ', gen: ' + askLat + 'ms' : ''})`);
      totalQueries++;
    }

    results.suites[s.name] = suiteResults;
  }

  // Calculate percentiles and averages
  const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const pTile = (arr, p) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p);
    return sorted[Math.min(idx, sorted.length - 1)];
  };

  results.overall = {
    totalQueries,
    retrieval: {
      hitRate1: parseFloat(avg(allHit1).toFixed(4)),
      hitRate3: parseFloat(avg(allHit3).toFixed(4)),
      hitRate5: parseFloat(avg(allHit5).toFixed(4)),
      mrr: parseFloat(avg(allMrr).toFixed(4)),
      keywordRecall: parseFloat(avg(allKwRecall).toFixed(4)),
      ndcg5: parseFloat(avg(allNdcg).toFixed(4)),
      latencyMs: {
        avg: Math.round(avg(allSearchLatencies)),
        p50: pTile(allSearchLatencies, 0.50),
        p95: pTile(allSearchLatencies, 0.95)
      }
    },
    crossModule: {
      evaluatedCount: allCoverage3.length,
      coverage3: parseFloat(avg(allCoverage3).toFixed(4)),
      coverage5: parseFloat(avg(allCoverage5).toFixed(4))
    },
    generation: {
      evaluatedCount: allClaimSupport.length + allAbstentionAcc.length,
      answerableEvaluated: allClaimSupport.length,
      unanswerableEvaluated: allAbstentionAcc.length,
      claimSupportAvg: parseFloat(avg(allClaimSupport).toFixed(4)),
      citationPrecision: parseFloat(avg(allCitationPrecision).toFixed(4)),
      citationCompleteness: parseFloat(avg(allCitationCompleteness).toFixed(4)),
      abstentionAccuracy: parseFloat(avg(allAbstentionAcc).toFixed(4)),
      hallucinationRate: parseFloat(avg(allHallucination).toFixed(4)),
      latencyMs: {
        avg: Math.round(avg(allGenLatencies)),
        p50: pTile(allGenLatencies, 0.50),
        p95: pTile(allGenLatencies, 0.95),
        ttft_avg: Math.round(avg(allTtftLatencies)),
        ttft_p50: pTile(allTtftLatencies, 0.50),
        ttft_p95: pTile(allTtftLatencies, 0.95)
      }
    }
  };

  // Ensure experiments directory exists
  if (!fs.existsSync(EXPERIMENTS_DIR)) {
    fs.mkdirSync(EXPERIMENTS_DIR, { recursive: true });
  }

  const outFilePath = path.join(EXPERIMENTS_DIR, `${experimentId}.json`);
  fs.writeFileSync(outFilePath, JSON.stringify(results, null, 2), 'utf8');

  // Print Formatted Scorecard
  console.log('\n======================================================');
  console.log(`  SCORECARD: ${experimentId} (${description})`);
  console.log('======================================================');
  console.log(`  Total Test Cases:    ${totalQueries}`);
  console.log('  --- RETRIEVAL METRICS ---');
  console.log(`  HitRate@1:           ${(results.overall.retrieval.hitRate1 * 100).toFixed(1)}%`);
  console.log(`  HitRate@3:           ${(results.overall.retrieval.hitRate3 * 100).toFixed(1)}%`);
  console.log(`  HitRate@5:           ${(results.overall.retrieval.hitRate5 * 100).toFixed(1)}%`);
  console.log(`  Mean Recip. Rank:    ${results.overall.retrieval.mrr.toFixed(4)}`);
  console.log(`  Keyword Recall:      ${(results.overall.retrieval.keywordRecall * 100).toFixed(1)}%`);
  console.log(`  nDCG@5:              ${results.overall.retrieval.ndcg5.toFixed(4)}`);
  console.log(`  Search Latency p50:  ${results.overall.retrieval.latencyMs.p50} ms (p95: ${results.overall.retrieval.latencyMs.p95} ms)`);
  if (allCoverage3.length > 0) {
    console.log('  --- CROSS-MODULE METRICS ---');
    console.log(`  Module Coverage@3:   ${(results.overall.crossModule.coverage3 * 100).toFixed(1)}%`);
    console.log(`  Module Coverage@5:   ${(results.overall.crossModule.coverage5 * 100).toFixed(1)}%`);
  }
  console.log('  --- GENERATION & SAFETY METRICS ---');
  console.log(`  Claim Support:       ${(results.overall.generation.claimSupportAvg * 100).toFixed(1)}%`);
  console.log(`  Citation Precision:  ${(results.overall.generation.citationPrecision * 100).toFixed(1)}%`);
  console.log(`  Citation Coverage:   ${(results.overall.generation.citationCompleteness * 100).toFixed(1)}%`);
  console.log(`  Abstention Accuracy: ${(results.overall.generation.abstentionAccuracy * 100).toFixed(1)}%`);
  console.log(`  Hallucination Rate:  ${(results.overall.generation.hallucinationRate * 100).toFixed(1)}%`);
  console.log(`  TTFT p50:            ${results.overall.generation.latencyMs.ttft_p50} ms (p95: ${results.overall.generation.latencyMs.ttft_p95} ms)`);
  console.log(`  Ask Latency p50:     ${results.overall.generation.latencyMs.p50} ms (p95: ${results.overall.generation.latencyMs.p95} ms)`);
  console.log('======================================================');
  console.log(`Detailed JSON logged to: ${outFilePath}\n`);

  return results;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const expId = args[0] || 'EXP-0001';
  const desc = args[1] || 'Baseline Dense Vector Search';
  runBenchmark({ experimentId: expId, description: desc, suite: 'all', runGeneration: true, generationSampleLimit: 10 });
}

module.exports = {
  runBenchmark
};
