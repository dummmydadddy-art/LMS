// Autonomous RAG Evolution Lab - Blind Benchmark Runner (EXP-0008)
// Evaluates Frozen Champion (EXP-0007) against unseen blind datasets

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

    let ttft = null;
    let fullAnswer = '';
    let sources = [];
    let abstain = false;
    let confidence = 0.5;

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

async function runBlindBenchmark() {
  console.log('\n======================================================');
  console.log('  RUNNING BLIND GENERALIZATION BENCHMARK (EXP-0008)');
  console.log('  Evaluating Frozen Champion against Unseen Holdouts');
  console.log(`  Target: ${API_BASE}`);
  console.log('======================================================\n');

  // Load all 4 blind holdout suites
  const holdoutData = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, 'blind_holdout', 'blind_holdout_v1.json'), 'utf-8'));
  const unansData = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, 'unanswerable', 'blind_unanswerable_v1.json'), 'utf-8'));
  const fpData = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, 'false_premise', 'blind_false_premise_v2.json'), 'utf-8'));
  const cm2Data = JSON.parse(fs.readFileSync(path.join(DATASETS_DIR, 'cross_module', 'lms_cross_module_v2.json'), 'utf-8'));

  const testSuites = [
    { name: 'Blind Holdout (100)', data: holdoutData, isUnans: false, isCross: false, isFP: false, genLimit: 25 },
    { name: 'Blind Unanswerable (25)', data: unansData, isUnans: true, isCross: false, isFP: false, genLimit: 25 },
    { name: 'Blind False-Premise (20)', data: fpData, isUnans: false, isCross: false, isFP: true, genLimit: 20 },
    { name: 'Hard Cross-Module v2 (20)', data: cm2Data, isUnans: false, isCross: true, isFP: false, genLimit: 15 }
  ];

  const expId = process.argv[2] || 'EXP-0009_BLIND';
  const results = {
    experimentId: expId,
    description: 'Blind Generalization, Robustness & Scalability on Unseen Data',
    timestamp: new Date().toISOString(),
    suites: {},
    overall: {}
  };

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
  let allFpRefutations = [];

  for (const s of testSuites) {
    console.log(`\n--> Evaluating Suite: ${s.name}...`);
    const suiteResults = [];

    for (let i = 0; i < s.data.length; i++) {
      const tc = s.data[i];
      process.stdout.write(`   [${tc.id}] ${tc.query.substring(0, 45).padEnd(48)} ... `);

      // 1. Retrieval
      const searchRes = await callApi('/api/rag/search', {
        query: tc.query,
        limit: 5,
        threshold: 0.20
      });

      const retrieved = searchRes.success ? (searchRes.data.results || []) : [];
      const searchLat = searchRes.latency;
      allSearchLatencies.push(searchLat);

      let ir = null;
      if (!s.isUnans) {
        ir = calculateIRMetrics(tc, retrieved, [1, 3, 5]);
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

      // 2. Generation
      let genEval = null;
      let askLat = 0;
      let ttftLat = null;
      const shouldGen = (s.genLimit === null || i < s.genLimit || s.isUnans);

      if (shouldGen) {
        const askRes = await callApiStream('/api/rag/ask', { question: tc.query, limit: 4 });
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

          // False-premise refutation check
          if (s.isFP) {
            const lowerAns = (askRes.data.answer || '').toLowerCase();
            const refutes = lowerAns.includes('incorrect') || lowerAns.includes('not') || lowerAns.includes('never') || lowerAns.includes('prohibit') || lowerAns.includes('false') || lowerAns.includes('refute');
            allFpRefutations.push(refutes ? 1.0 : 0.0);
          }
        }
      }

      if (s.isUnans) {
        const abstOK = genEval ? (genEval.abstentionAccuracy === 1.0) : false;
        console.log(`${abstOK ? 'ABSTAIN_OK' : 'ABSTAIN_FAIL'} (search: ${searchLat}ms, gen: ${askLat}ms)`);
      } else {
        const hit3 = ir ? (ir.hitRate['hit@3'] === 1.0) : false;
        console.log(`${hit3 ? 'HIT@3' : 'MISS'} (search: ${searchLat}ms${askLat ? `, gen: ${askLat}ms` : ''})`);
      }

      suiteResults.push({
        id: tc.id,
        query: tc.query,
        searchLatencyMs: searchLat,
        generationLatencyMs: askLat,
        ttftMs: ttftLat,
        irMetrics: ir,
        generationMetrics: genEval
      });
    }

    results.suites[s.name] = suiteResults;
  }

  // Summary aggregation
  const p50 = (arr) => arr.length ? arr.sort((a,b)=>a-b)[Math.floor(arr.length * 0.50)] : 0;
  const p95 = (arr) => arr.length ? arr.sort((a,b)=>a-b)[Math.floor(arr.length * 0.95)] : 0;
  const avg = (arr) => arr.length ? arr.reduce((a,b)=>a+b, 0) / arr.length : 0;

  results.overall = {
    totalQueriesEvaluated: allSearchLatencies.length,
    retrieval: {
      hitRate1: parseFloat(avg(allHit1).toFixed(4)),
      hitRate3: parseFloat(avg(allHit3).toFixed(4)),
      hitRate5: parseFloat(avg(allHit5).toFixed(4)),
      mrr: parseFloat(avg(allMrr).toFixed(4)),
      keywordRecall: parseFloat(avg(allKwRecall).toFixed(4)),
      ndcg5: parseFloat(avg(allNdcg).toFixed(4)),
      latencyMs: { avg: Math.round(avg(allSearchLatencies)), p50: p50(allSearchLatencies), p95: p95(allSearchLatencies) }
    },
    crossModule: {
      evaluatedCount: allCoverage5.length,
      coverage3: parseFloat(avg(allCoverage3).toFixed(4)),
      coverage5: parseFloat(avg(allCoverage5).toFixed(4))
    },
    generation: {
      evaluatedCount: allGenLatencies.length,
      claimSupportAvg: parseFloat(avg(allClaimSupport).toFixed(4)),
      citationPrecision: parseFloat(avg(allCitationPrecision).toFixed(4)),
      citationCompleteness: parseFloat(avg(allCitationCompleteness).toFixed(4)),
      abstentionAccuracy: parseFloat(avg(allAbstentionAcc).toFixed(4)),
      hallucinationRate: parseFloat(avg(allHallucination).toFixed(4)),
      falsePremiseRefutationRate: allFpRefutations.length ? parseFloat(avg(allFpRefutations).toFixed(4)) : null,
      latencyMs: {
        avg: Math.round(avg(allGenLatencies)),
        p50: p50(allGenLatencies),
        p95: p95(allGenLatencies),
        ttft_avg: Math.round(avg(allTtftLatencies)),
        ttft_p50: p50(allTtftLatencies),
        ttft_p95: p95(allTtftLatencies)
      }
    }
  };

  const outFilePath = path.join(EXPERIMENTS_DIR, `${expId}.json`);
  fs.writeFileSync(outFilePath, JSON.stringify(results, null, 2));

  console.log('\n======================================================');
  console.log(`  BLIND HOLDOUT SCORECARD: ${expId}`);
  console.log('======================================================');
  console.log(`  Total Unseen Queries: ${results.overall.totalQueriesEvaluated}`);
  console.log('  --- RETRIEVAL ON UNSEEN DATA ---');
  console.log(`  HitRate@1:           ${(results.overall.retrieval.hitRate1 * 100).toFixed(1)}%`);
  console.log(`  HitRate@3:           ${(results.overall.retrieval.hitRate3 * 100).toFixed(1)}%`);
  console.log(`  HitRate@5:           ${(results.overall.retrieval.hitRate5 * 100).toFixed(1)}%`);
  console.log(`  Mean Recip. Rank:    ${results.overall.retrieval.mrr.toFixed(4)}`);
  console.log(`  nDCG@5:              ${results.overall.retrieval.ndcg5.toFixed(4)}`);
  console.log(`  Search Latency p50:  ${results.overall.retrieval.latencyMs.p50} ms (p95: ${results.overall.retrieval.latencyMs.p95} ms)`);
  if (allCoverage5.length > 0) {
    console.log('  --- CROSS-MODULE V2 (HARD) ---');
    console.log(`  Module Coverage@3:   ${(results.overall.crossModule.coverage3 * 100).toFixed(1)}%`);
    console.log(`  Module Coverage@5:   ${(results.overall.crossModule.coverage5 * 100).toFixed(1)}%`);
  }
  console.log('  --- GENERATION & SAFETY ON UNSEEN DATA ---');
  console.log(`  Claim Support:       ${(results.overall.generation.claimSupportAvg * 100).toFixed(1)}%`);
  console.log(`  Citation Precision:  ${(results.overall.generation.citationPrecision * 100).toFixed(1)}%`);
  console.log(`  Citation Coverage:   ${(results.overall.generation.citationCompleteness * 100).toFixed(1)}%`);
  console.log(`  Abstention Accuracy: ${(results.overall.generation.abstentionAccuracy * 100).toFixed(1)}%`);
  console.log(`  Hallucination Rate:  ${(results.overall.generation.hallucinationRate * 100).toFixed(1)}%`);
  if (results.overall.generation.falsePremiseRefutationRate !== null) {
    console.log(`  False Premise Refute:${(results.overall.generation.falsePremiseRefutationRate * 100).toFixed(1)}%`);
  }
  console.log(`  TTFT p50:            ${results.overall.generation.latencyMs.ttft_p50} ms (p95: ${results.overall.generation.latencyMs.ttft_p95} ms)`);
  console.log(`  Ask Latency p50:     ${results.overall.generation.latencyMs.p50} ms (p95: ${results.overall.generation.latencyMs.p95} ms)`);
  console.log('======================================================');
  console.log(`Detailed JSON logged to: ${outFilePath}\n`);

  return results;
}

if (require.main === module) {
  runBlindBenchmark();
}

module.exports = { runBlindBenchmark };
