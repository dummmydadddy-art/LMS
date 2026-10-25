// Information Retrieval (IR) Benchmark Metrics
// Measures retrieval rank accuracy, recall, precision, MRR, and nDCG

function calculateIRMetrics(testCase, retrievedChunks, kValues = [1, 3, 5]) {
  const expectedDocs = (testCase.expected_modules || (testCase.expected_doc ? [testCase.expected_doc] : [])).map(d => d.toLowerCase().trim());
  const expectedDoc = (testCase.expected_doc || (expectedDocs[0] || '')).toLowerCase().trim();
  const targetKeywords = (testCase.target_keywords || []).map(kw => kw.toLowerCase().trim());

  // 1. HitRate @ K (is an expected document in top K?)
  const hitRate = {};
  kValues.forEach(k => {
    const topK = retrievedChunks.slice(0, k);
    const hit = topK.some(chunk => expectedDocs.includes((chunk.title || '').toLowerCase().trim()));
    hitRate['hit@' + k] = hit ? 1.0 : 0.0;
  });

  // 1b. Module Coverage @ K (for multi-module: are all expected modules in top K?)
  const moduleCoverage = {};
  if (expectedDocs.length > 1) {
    kValues.forEach(k => {
      const topKDocs = new Set(retrievedChunks.slice(0, k).map(c => (c.title || '').toLowerCase().trim()));
      const allCovered = expectedDocs.every(d => topKDocs.has(d));
      moduleCoverage['coverage@' + k] = allCovered ? 1.0 : 0.0;
    });
  }

  // 2. Mean Reciprocal Rank (MRR)
  let reciprocalRank = 0.0;
  for (let rank = 0; rank < retrievedChunks.length; rank++) {
    const chunk = retrievedChunks[rank];
    if (expectedDocs.includes((chunk.title || '').toLowerCase().trim())) {
      reciprocalRank = 1.0 / (rank + 1);
      break;
    }
  }

  // 3. Keyword Recall (how many expected domain keywords appear across all retrieved chunks?)
  let keywordRecall = 0.0;
  if (targetKeywords.length > 0) {
    const combinedContent = retrievedChunks.map(c => ((c.title || '') + ' ' + (c.content || '')).toLowerCase()).join(' ');
    const matchedCount = targetKeywords.filter(kw => combinedContent.includes(kw)).length;
    keywordRecall = matchedCount / targetKeywords.length;
  } else {
    keywordRecall = hitRate['hit@5'] || 0.0;
  }

  // 4. Precision @ K
  const precision = {};
  kValues.forEach(k => {
    const topK = retrievedChunks.slice(0, k);
    if (topK.length === 0) {
      precision['p@' + k] = 0.0;
    } else {
      const hits = topK.filter(chunk => (chunk.title || '').toLowerCase().trim() === expectedDoc).length;
      precision['p@' + k] = hits / topK.length;
    }
  });

  // 5. Normalized Discounted Cumulative Gain @ 5 (nDCG@5)
  // Graded relevance: 2 = exact matching document, 1 = relevant keywords found, 0 = irrelevant
  const dcgScores = retrievedChunks.slice(0, 5).map((chunk, idx) => {
    const isDocMatch = expectedDocs.includes((chunk.title || '').toLowerCase().trim());
    const chunkText = ((chunk.title || '') + ' ' + (chunk.content || '')).toLowerCase();
    const hasKw = targetKeywords.some(kw => chunkText.includes(kw));
    let rel = 0;
    if (isDocMatch) rel = 2;
    else if (hasKw) rel = 1;
    return rel / Math.log2(idx + 2);
  });
  const dcg = dcgScores.reduce((a, b) => a + b, 0);

  // Ideal DCG (best possible ordering: 2, 2, 1, 1, 0)
  const idealRels = [2, 2, 1, 1, 0];
  const idcg = idealRels.map((rel, idx) => rel / Math.log2(idx + 2)).reduce((a, b) => a + b, 0);
  const ndcg5 = idcg > 0 ? (dcg / idcg) : 0.0;

  return {
    hitRate,
    moduleCoverage,
    mrr: reciprocalRank,
    keywordRecall,
    precision,
    ndcg5: Math.min(1.0, ndcg5)
  };
}

module.exports = {
  calculateIRMetrics
};
