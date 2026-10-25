// EXP-0014: Evaluator for Suites 1 to 4
const fs = require('fs');
const path = require('path');
const {
  mean, median, stddev, percentile,
  wilsonScoreInterval, continuousConfidenceInterval,
  searchGateway, askGateway, evaluateRetrievalRank
} = require('./harness_common');

const DIR = path.resolve(__dirname);

async function runSuite1() {
  console.log('\n================================================================');
  console.log('  RUNNING SUITE 1: LARGE BLIND RETRIEVAL (510 QUERIES)');
  console.log('================================================================');
  const queries = JSON.parse(fs.readFileSync(path.join(DIR, 'suite_1_large_blind_500.json'), 'utf8'));

  const results = [];
  const latencies = [];
  const categoryStats = {};

  let totalHit1 = 0;
  let totalHit3 = 0;
  let totalHit5 = 0;
  let totalMRR = 0;
  let totalNDCG5 = 0;
  let totalKwHit = 0;
  let totalModuleAcc = 0;
  let totalSectionAcc = 0;

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    if (!categoryStats[q.category]) {
      categoryStats[q.category] = { total: 0, hit1: 0, hit3: 0, hit5: 0, mrr: 0, ndcg: 0, latencies: [] };
    }
    const cat = categoryStats[q.category];
    cat.total++;

    const res = await searchGateway(q.query);
    latencies.push(res.latency);
    cat.latencies.push(res.latency);

    const searchResults = res.data && res.data.results ? res.data.results : [];
    const evalRes = evaluateRetrievalRank(searchResults, q.expected_doc, q.expected_keyword);

    // Module and Section accuracy
    let modMatch = 0;
    let secMatch = 0;
    if (searchResults.length > 0) {
      const top = searchResults[0];
      if (top.title === q.expected_doc) {
        modMatch = 1;
        // Check if top chunk content contains expected section or keyword
        if ((top.content || '').toLowerCase().includes(q.expected_section.toLowerCase()) ||
            (top.content || '').toLowerCase().includes((q.expected_keyword || '').toLowerCase())) {
          secMatch = 1;
        }
      }
    }

    totalHit1 += evalRes.hit1;
    totalHit3 += evalRes.hit3;
    totalHit5 += evalRes.hit5;
    totalMRR += evalRes.mrr;
    totalNDCG5 += evalRes.ndcg5;
    totalKwHit += evalRes.kwHit;
    totalModuleAcc += modMatch;
    totalSectionAcc += secMatch;

    cat.hit1 += evalRes.hit1;
    cat.hit3 += evalRes.hit3;
    cat.hit5 += evalRes.hit5;
    cat.mrr += evalRes.mrr;
    cat.ndcg += evalRes.ndcg5;

    results.push({
      id: q.id,
      category: q.category,
      query: q.query,
      expected_doc: q.expected_doc,
      rank: evalRes.rank,
      hit1: evalRes.hit1,
      hit3: evalRes.hit3,
      hit5: evalRes.hit5,
      mrr: evalRes.mrr,
      ndcg5: evalRes.ndcg5,
      latency_ms: res.latency,
      module_correct: modMatch,
      section_correct: secMatch
    });

    if ((i + 1) % 100 === 0 || i === queries.length - 1) {
      console.log(`  Processed ${i + 1}/${queries.length} queries... Current Hit@3: ${((totalHit3 / (i + 1)) * 100).toFixed(1)}%`);
    }
  }

  const N = queries.length;
  const s1Summary = {
    total_queries: N,
    hit1: wilsonScoreInterval(totalHit1, N),
    hit3: wilsonScoreInterval(totalHit3, N),
    hit5: wilsonScoreInterval(totalHit5, N),
    mrr: parseFloat((totalMRR / N).toFixed(4)),
    ndcg5: parseFloat((totalNDCG5 / N).toFixed(4)),
    keyword_recall: wilsonScoreInterval(totalKwHit, N),
    module_accuracy: wilsonScoreInterval(totalModuleAcc, N),
    section_accuracy: wilsonScoreInterval(totalSectionAcc, N),
    latency: {
      p50: percentile(latencies, 0.50),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99),
      mean: continuousConfidenceInterval(latencies)
    },
    category_breakdown: {}
  };

  for (const [catKey, c] of Object.entries(categoryStats)) {
    s1Summary.category_breakdown[catKey] = {
      count: c.total,
      hit1_pct: parseFloat(((c.hit1 / c.total) * 100).toFixed(1)),
      hit3_pct: parseFloat(((c.hit3 / c.total) * 100).toFixed(1)),
      mrr: parseFloat((c.mrr / c.total).toFixed(4)),
      ndcg5: parseFloat((c.ndcg / c.total).toFixed(4)),
      latency_p50: percentile(c.latencies, 0.50)
    };
  }

  fs.writeFileSync(path.join(DIR, 'results_suite_1.json'), JSON.stringify({ summary: s1Summary, details: results }, null, 2));
  console.log(`Suite 1 Complete: Hit@1=${(s1Summary.hit1.p * 100).toFixed(1)}% | Hit@3=${(s1Summary.hit3.p * 100).toFixed(1)}% | MRR=${s1Summary.mrr} | Latency p50=${s1Summary.latency.p50}ms`);
  return s1Summary;
}

async function runSuite2() {
  console.log('\n================================================================');
  console.log('  RUNNING SUITE 2: PARAPHRASE ROBUSTNESS (120 QUERIES)');
  console.log('================================================================');
  const queries = JSON.parse(fs.readFileSync(path.join(DIR, 'suite_2_paraphrase.json'), 'utf8'));

  const canonicalTopDocs = {};
  const results = [];
  const typeStats = {};

  // First pass: evaluate canonical queries to establish reference ranks
  for (const q of queries.filter(item => item.paraphrase_type === 'canonical')) {
    const res = await searchGateway(q.query);
    const topDoc = (res.data && res.data.results && res.data.results[0]) ? res.data.results[0].title : null;
    canonicalTopDocs[q.canonical_id] = topDoc;
  }

  let totalEquivalent = 0;
  let totalHit1 = 0;
  let totalHit3 = 0;
  let totalMRR = 0;

  for (const q of queries) {
    if (!typeStats[q.paraphrase_type]) {
      typeStats[q.paraphrase_type] = { total: 0, equivalent: 0, hit1: 0, hit3: 0, mrr: 0 };
    }
    const ts = typeStats[q.paraphrase_type];
    ts.total++;

    const res = await searchGateway(q.query);
    const searchResults = res.data && res.data.results ? res.data.results : [];
    const evalRes = evaluateRetrievalRank(searchResults, q.expected_doc, q.expected_keyword);

    const topDoc = searchResults[0] ? searchResults[0].title : null;
    const isEquiv = (topDoc && canonicalTopDocs[q.canonical_id] && topDoc === canonicalTopDocs[q.canonical_id]) ? 1 : 0;

    totalEquivalent += isEquiv;
    totalHit1 += evalRes.hit1;
    totalHit3 += evalRes.hit3;
    totalMRR += evalRes.mrr;

    ts.equivalent += isEquiv;
    ts.hit1 += evalRes.hit1;
    ts.hit3 += evalRes.hit3;
    ts.mrr += evalRes.mrr;

    results.push({
      canonical_id: q.canonical_id,
      paraphrase_type: q.paraphrase_type,
      query: q.query,
      rank: evalRes.rank,
      is_equivalent: isEquiv,
      hit1: evalRes.hit1,
      hit3: evalRes.hit3,
      mrr: evalRes.mrr,
      latency_ms: res.latency
    });
  }

  const N = queries.length;
  const s2Summary = {
    total_queries: N,
    retrieval_equivalence_rate: wilsonScoreInterval(totalEquivalent, N),
    hit1: wilsonScoreInterval(totalHit1, N),
    hit3: wilsonScoreInterval(totalHit3, N),
    mrr: parseFloat((totalMRR / N).toFixed(4)),
    by_paraphrase_type: {}
  };

  for (const [t, s] of Object.entries(typeStats)) {
    s2Summary.by_paraphrase_type[t] = {
      count: s.total,
      equivalence_rate: parseFloat(((s.equivalent / s.total) * 100).toFixed(1)),
      hit1_pct: parseFloat(((s.hit1 / s.total) * 100).toFixed(1)),
      hit3_pct: parseFloat(((s.hit3 / s.total) * 100).toFixed(1)),
      mrr: parseFloat((s.mrr / s.total).toFixed(4))
    };
  }

  fs.writeFileSync(path.join(DIR, 'results_suite_2.json'), JSON.stringify({ summary: s2Summary, details: results }, null, 2));
  console.log(`Suite 2 Complete: Equivalence=${(s2Summary.retrieval_equivalence_rate.p * 100).toFixed(1)}% | Hit@3=${(s2Summary.hit3.p * 100).toFixed(1)}% | MRR=${s2Summary.mrr}`);
  return s2Summary;
}

async function runSuite3() {
  console.log('\n================================================================');
  console.log('  RUNNING SUITE 3: TYPO / NOISE ROBUSTNESS (105 QUERIES)');
  console.log('================================================================');
  const queries = JSON.parse(fs.readFileSync(path.join(DIR, 'suite_3_noise.json'), 'utf8'));

  const results = [];
  const noiseStats = {};

  let totalHit1 = 0;
  let totalHit3 = 0;
  let totalMRR = 0;

  for (const q of queries) {
    if (!noiseStats[q.noise_type]) {
      noiseStats[q.noise_type] = { total: 0, hit1: 0, hit3: 0, mrr: 0, latencies: [] };
    }
    const ns = noiseStats[q.noise_type];
    ns.total++;

    const res = await searchGateway(q.query);
    ns.latencies.push(res.latency);

    const searchResults = res.data && res.data.results ? res.data.results : [];
    const evalRes = evaluateRetrievalRank(searchResults, q.expected_doc, q.expected_keyword);

    totalHit1 += evalRes.hit1;
    totalHit3 += evalRes.hit3;
    totalMRR += evalRes.mrr;

    ns.hit1 += evalRes.hit1;
    ns.hit3 += evalRes.hit3;
    ns.mrr += evalRes.mrr;

    results.push({
      canonical_id: q.canonical_id,
      noise_type: q.noise_type,
      query: q.query,
      rank: evalRes.rank,
      hit1: evalRes.hit1,
      hit3: evalRes.hit3,
      mrr: evalRes.mrr,
      latency_ms: res.latency
    });
  }

  const N = queries.length;
  const s3Summary = {
    total_queries: N,
    hit1: wilsonScoreInterval(totalHit1, N),
    hit3: wilsonScoreInterval(totalHit3, N),
    mrr: parseFloat((totalMRR / N).toFixed(4)),
    by_noise_type: {}
  };

  for (const [t, s] of Object.entries(noiseStats)) {
    s3Summary.by_noise_type[t] = {
      count: s.total,
      hit1_pct: parseFloat(((s.hit1 / s.total) * 100).toFixed(1)),
      hit3_pct: parseFloat(((s.hit3 / s.total) * 100).toFixed(1)),
      mrr: parseFloat((s.mrr / s.total).toFixed(4)),
      latency_p50: percentile(s.latencies, 0.50)
    };
  }

  fs.writeFileSync(path.join(DIR, 'results_suite_3.json'), JSON.stringify({ summary: s3Summary, details: results }, null, 2));
  console.log(`Suite 3 Complete: Hit@1=${(s3Summary.hit1.p * 100).toFixed(1)}% | Hit@3=${(s3Summary.hit3.p * 100).toFixed(1)}% | MRR=${s3Summary.mrr}`);
  return s3Summary;
}

async function runSuite4() {
  console.log('\n================================================================');
  console.log('  RUNNING SUITE 4: COLLOQUIAL & HINGLISH ROBUSTNESS (80 QUERIES)');
  console.log('================================================================');
  const queries = JSON.parse(fs.readFileSync(path.join(DIR, 'suite_4_hinglish.json'), 'utf8'));

  const results = [];
  let totalHit1 = 0;
  let totalHit3 = 0;
  let totalMRR = 0;
  let mappedCount = 0;
  let falseAbstentionCount = 0;
  const latencies = [];

  for (const q of queries) {
    const res = await searchGateway(q.query);
    latencies.push(res.latency);

    const searchResults = res.data && res.data.results ? res.data.results : [];
    const evalRes = evaluateRetrievalRank(searchResults, q.expected_doc, q.expected_keyword);

    const isMapped = (res.data && res.data.semantic_mapping && res.data.semantic_mapping.detected_concepts && res.data.semantic_mapping.detected_concepts.length > 0) ? 1 : 0;
    if (isMapped) mappedCount++;

    // Did the system falsely abstain?
    const isAbstained = (res.data && res.data.abstain) ? 1 : 0;
    if (isAbstained) falseAbstentionCount++;

    totalHit1 += evalRes.hit1;
    totalHit3 += evalRes.hit3;
    totalMRR += evalRes.mrr;

    results.push({
      id: q.id,
      query: q.query,
      expected_doc: q.expected_doc,
      rank: evalRes.rank,
      hit1: evalRes.hit1,
      hit3: evalRes.hit3,
      mrr: evalRes.mrr,
      is_mapped: isMapped,
      false_abstain: isAbstained,
      latency_ms: res.latency
    });
  }

  const N = queries.length;
  const s4Summary = {
    total_queries: N,
    hit1: wilsonScoreInterval(totalHit1, N),
    hit3: wilsonScoreInterval(totalHit3, N),
    mrr: parseFloat((totalMRR / N).toFixed(4)),
    semantic_mapping_rate: wilsonScoreInterval(mappedCount, N),
    false_abstention_rate: wilsonScoreInterval(falseAbstentionCount, N),
    latency_p50: percentile(latencies, 0.50),
    latency_p95: percentile(latencies, 0.95)
  };

  fs.writeFileSync(path.join(DIR, 'results_suite_4.json'), JSON.stringify({ summary: s4Summary, details: results }, null, 2));
  console.log(`Suite 4 Complete: Hit@1=${(s4Summary.hit1.p * 100).toFixed(1)}% | Hit@3=${(s4Summary.hit3.p * 100).toFixed(1)}% | False Abstain=${(s4Summary.false_abstention_rate.p * 100).toFixed(1)}%`);
  return s4Summary;
}

async function main() {
  console.log('Starting execution of Suites 1 to 4 on EXP-0013 live gateway...');
  await runSuite1();
  await runSuite2();
  await runSuite3();
  await runSuite4();
  console.log('\nSuites 1 to 4 finished successfully.');
}

main().catch(err => {
  console.error('Fatal error in Suites 1 to 4:', err);
  process.exit(1);
});
