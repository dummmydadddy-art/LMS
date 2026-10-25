// EXP-0015 Audit Suite 02: Semantic Adversarial Contrast & Tri-Engine Disagreement
const fs = require('fs');
const path = require('path');
const { searchGateway, askGateway } = require('./audit_harness_common');

const contrastPairs = [
  // React Pairs
  {
    id: 'REACT-01',
    concept: 'useRef vs useState Re-render',
    query_target: 'How to persist a mutable value across renders without causing a component re-render?',
    expected_chunk_keywords: ['useRef', '.current', 'without re-render'],
    confuser_query: 'How to store state and trigger a component re-render on change?',
    confuser_keywords: ['useState', 'setCount', 're-render']
  },
  {
    id: 'REACT-02',
    concept: 'useCallback vs useMemo',
    query_target: 'How to memoize a function definition so it retains the same reference equality across renders?',
    expected_chunk_keywords: ['useCallback', 'reference equality', 'memoize callback'],
    confuser_query: 'How to memoize the computed result of an expensive calculation across renders?',
    confuser_keywords: ['useMemo', 'expensive calculation', 'memoize the result']
  },
  {
    id: 'REACT-03',
    concept: 'useEffect Cleanup Timing',
    query_target: 'When exactly does the cleanup function returned by useEffect execute?',
    expected_chunk_keywords: ['cleanup', 'before the effect runs again', 'unmount'],
    confuser_query: 'When does the main callback of useEffect execute during component lifecycle?',
    confuser_keywords: ['after every render', 'DOM update', 'componentDidMount']
  },

  // JS Pairs
  {
    id: 'JS-01',
    concept: 'let/const TDZ vs var Hoisting',
    query_target: 'What specific error occurs when accessing a let or const variable before its declaration line?',
    expected_chunk_keywords: ['Temporal Dead Zone', 'TDZ', 'ReferenceError'],
    confuser_query: 'What value is returned when accessing a var variable before its declaration line?',
    confuser_keywords: ['hoisted', 'undefined', 'var declaration']
  },
  {
    id: 'JS-02',
    concept: 'Object.freeze vs Object.seal',
    query_target: 'Does Object.freeze prevent modifying the existing properties of an object?',
    expected_chunk_keywords: ['Object.freeze', 'cannot be modified', 'immutable', 'TypeError'],
    confuser_query: 'Does Object.seal allow modifying the existing properties of an object?',
    confuser_keywords: ['Object.seal', 'existing properties can still be modified']
  },
  {
    id: 'JS-03',
    concept: 'Arrow function this vs regular function this',
    query_target: 'How does an arrow function determine the value of the this keyword?',
    expected_chunk_keywords: ['lexical this', 'enclosing lexical scope', 'does not have its own this'],
    confuser_query: 'How does a regular function determine the value of the this keyword when invoked?',
    confuser_keywords: ['caller', 'how the function was called', 'bind', 'call', 'apply']
  },

  // Node.js Pairs
  {
    id: 'NODE-01',
    concept: 'Libuv Thread Pool vs OS Kernel Epoll',
    query_target: 'Does Node.js use the libuv thread pool for network socket I/O operations on Linux?',
    expected_chunk_keywords: ['epoll', 'non-blocking OS kernel', 'does not use thread pool for network'],
    confuser_query: 'Which operations use the 4 default threads in the libuv thread pool in Node.js?',
    confuser_keywords: ['crypto', 'zlib', 'fs', 'thread pool', 'UV_THREADPOOL_SIZE']
  },
  {
    id: 'NODE-02',
    concept: 'Express Error Middleware Signature',
    query_target: 'What is the mandatory four-parameter signature required to define an Express error-handling middleware?',
    expected_chunk_keywords: ['err, req, res, next', 'four arguments', 'error-handling middleware'],
    confuser_query: 'What is the standard three-parameter signature for regular Express middleware?',
    confuser_keywords: ['req, res, next', 'next()', 'middleware pipeline']
  },
  {
    id: 'NODE-03',
    concept: 'next("route") vs next(err)',
    query_target: 'How to bypass remaining middleware in the current router stack and pass control to the next route in Express?',
    expected_chunk_keywords: ["next('route')", 'skip the rest of the middleware functions'],
    confuser_query: 'How to pass an error to Express error handlers from inside a middleware function?',
    confuser_keywords: ['next(err)', 'pass error', 'error-handling middleware']
  },

  // Postgres Pairs
  {
    id: 'PG-01',
    concept: 'B-tree Index vs Sequential Scan Trade-off',
    query_target: 'Why does the PostgreSQL query planner choose a sequential scan over a B-tree index when querying high percentage of rows?',
    expected_chunk_keywords: ['sequential scan', 'cost', 'random I/O', 'high percentage of table'],
    confuser_query: 'How does a B-tree index accelerate selective equality and range lookups in PostgreSQL?',
    confuser_keywords: ['B-tree index', 'O(log n)', 'binary search', 'selective queries']
  },
  {
    id: 'PG-02',
    concept: '3NF Transitive Dependency vs 2NF Partial Dependency',
    query_target: 'What specific type of dependency must be eliminated to achieve Third Normal Form (3NF)?',
    expected_chunk_keywords: ['transitive dependency', 'non-key attribute depends on another non-key'],
    confuser_query: 'What specific type of dependency must be eliminated to achieve Second Normal Form (2NF)?',
    confuser_keywords: ['partial dependency', 'composite primary key']
  },
  {
    id: 'PG-03',
    concept: 'READ COMMITTED vs REPEATABLE READ',
    query_target: 'What happens when a new query executes in READ COMMITTED transaction mode after another transaction commits?',
    expected_chunk_keywords: ['new snapshot per statement', 'sees newly committed data', 'READ COMMITTED'],
    confuser_query: 'What snapshot does a REPEATABLE READ transaction use throughout its lifetime?',
    confuser_keywords: ['snapshot at start of transaction', 'REPEATABLE READ', 'does not see newly committed']
  },

  // CSS Pairs
  {
    id: 'CSS-01',
    concept: 'box-sizing: border-box vs content-box',
    query_target: 'How does box-sizing: border-box include padding and border in the specified width of an element?',
    expected_chunk_keywords: ['border-box', 'width includes padding and border', 'box-sizing'],
    confuser_query: 'How does content-box calculate total element width when padding and border are applied?',
    confuser_keywords: ['content-box', 'width + padding + border', 'default box model']
  },
  {
    id: 'CSS-02',
    concept: 'justify-content vs align-items',
    query_target: 'Which Flexbox property controls the alignment of items along the main axis?',
    expected_chunk_keywords: ['justify-content', 'main axis'],
    confuser_query: 'Which Flexbox property controls the alignment of items along the cross axis?',
    confuser_keywords: ['align-items', 'cross axis']
  }
];

async function runSemanticAdversarialAudit() {
  console.log('================================================================');
  console.log(`  RUNNING EXP-0015 SUITE 02: SEMANTIC ADVERSARIAL CONTRAST AUDIT (${contrastPairs.length} Pairs)`);
  console.log('================================================================\n');

  const pairResults = [];
  let totalDisplacements = 0;
  let totalInversions = 0;

  for (let i = 0; i < contrastPairs.length; i++) {
    const pair = contrastPairs[i];
    process.stdout.write(`[${i + 1}/${contrastPairs.length}] Evaluating Pair ${pair.id} (${pair.concept}) ... `);

    // 1. Search with Target Query
    const targetRes = await searchGateway(pair.query_target, { limit: 5 });
    // 2. Search with Confuser Query
    const confuserRes = await searchGateway(pair.confuser_query, { limit: 5 });

    const topTargetChunk = targetRes.results[0] ? targetRes.results[0].content : '';
    const topConfuserChunk = confuserRes.results[0] ? confuserRes.results[0].content : '';

    // Check if target retrieval matched expected keywords
    const targetMatchesExpected = pair.expected_chunk_keywords.some(kw =>
      topTargetChunk.toLowerCase().includes(kw.toLowerCase())
    );

    // Check if target incorrectly retrieved confuser chunk keywords
    const targetHitConfuser = pair.confuser_keywords.some(kw =>
      topTargetChunk.toLowerCase().includes(kw.toLowerCase())
    );

    // Check ranking inversion
    let status = 'ACCURATE_SEPARATION';
    if (!targetMatchesExpected && targetHitConfuser) {
      status = 'RANKING_INVERSION';
      totalInversions++;
    } else if (!targetMatchesExpected) {
      status = 'TARGET_DISPLACEMENT';
      totalDisplacements++;
    }

    console.log(`${status} (Target Top: "${targetRes.results[0]?.title || 'none'}", Confuser Top: "${confuserRes.results[0]?.title || 'none'}")`);

    pairResults.push({
      id: pair.id,
      concept: pair.concept,
      query_target: pair.query_target,
      confuser_query: pair.confuser_query,
      target_top_chunk: targetRes.results[0]?.title || null,
      target_top_score: targetRes.results[0]?.score || 0,
      confuser_top_chunk: confuserRes.results[0]?.title || null,
      confuser_top_score: confuserRes.results[0]?.score || 0,
      status,
      targetMatchesExpected,
      targetHitConfuser
    });
  }

  const summary = {
    total_pairs_tested: contrastPairs.length,
    accurate_separations: contrastPairs.length - totalDisplacements - totalInversions,
    target_displacements: totalDisplacements,
    ranking_inversions: totalInversions,
    separation_rate_pct: Number((((contrastPairs.length - totalDisplacements - totalInversions) / contrastPairs.length) * 100).toFixed(2)),
    pairs: pairResults
  };

  const outPath = path.resolve('D:/Collage project/EduConnect-LMS-Experimental/tests/rag/audit_exp0015/results_suite_02_semantic_adversarial.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log('\n----------------------------------------------------------------');
  console.log(`Suite 02 Semantic Adversarial Complete:`);
  console.log(`  Total Pairs: ${contrastPairs.length}`);
  console.log(`  Accurate Separations: ${summary.accurate_separations}`);
  console.log(`  Target Displacements: ${totalDisplacements}`);
  console.log(`  Ranking Inversions: ${totalInversions}`);
  console.log(`  Separation Rate: ${summary.separation_rate_pct}%`);
  console.log(`  Results written to: ${outPath}`);
  console.log('----------------------------------------------------------------\n');
}

runSemanticAdversarialAudit().catch(console.error);
