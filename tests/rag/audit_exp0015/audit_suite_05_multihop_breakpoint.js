// EXP-0015 Audit Suite 05: Multi-Hop Breakpoint & Complexity Degradation
const fs = require('fs');
const path = require('path');
const { searchGateway } = require('./audit_harness_common');

const multiHopCases = [
  // 1 Module Baseline
  {
    id: 'MH-01',
    tier: '1_module',
    query: 'How does the React useEffect cleanup function prevent memory leaks?',
    required_modules: ['React Hooks Tutorial'],
    constraints: 1
  },
  {
    id: 'MH-02',
    tier: '1_module',
    query: 'What is the role of the 4 worker threads in the Node.js libuv thread pool?',
    required_modules: ['Node.js & Express REST API Notes'],
    constraints: 1
  },
  {
    id: 'MH-03',
    tier: '1_module',
    query: 'Why does a B-tree index in PostgreSQL accelerate range queries and equality lookups?',
    required_modules: ['PostgreSQL Database Design'],
    constraints: 1
  },

  // 2 Modules
  {
    id: 'MH-04',
    tier: '2_modules',
    query: 'How does an Express authentication middleware verify JWT tokens sent by a React frontend using fetch?',
    required_modules: ['React Hooks Tutorial', 'Node.js & Express REST API Notes'],
    constraints: 2
  },
  {
    id: 'MH-05',
    tier: '2_modules',
    query: 'How does an Express route handler execute parameterized SQL queries using a PostgreSQL connection pool?',
    required_modules: ['Node.js & Express REST API Notes', 'PostgreSQL Database Design'],
    constraints: 2
  },
  {
    id: 'MH-06',
    tier: '2_modules',
    query: 'How do JavaScript ES6 closures maintain lexical state across React component re-renders?',
    required_modules: ['JavaScript ES6+ Deep Dive', 'React Hooks Tutorial'],
    constraints: 2
  },

  // 3 Modules
  {
    id: 'MH-07',
    tier: '3_modules',
    query: 'How does a React component fetch normalized 3NF data from an Express API powered by PostgreSQL transactions?',
    required_modules: ['React Hooks Tutorial', 'Node.js & Express REST API Notes', 'PostgreSQL Database Design'],
    constraints: 3
  },
  {
    id: 'MH-08',
    tier: '3_modules',
    query: 'How do JavaScript async/await Promises handle errors thrown by Express error middleware when inserting into PostgreSQL?',
    required_modules: ['JavaScript ES6+ Deep Dive', 'Node.js & Express REST API Notes', 'PostgreSQL Database Design'],
    constraints: 3
  },
  {
    id: 'MH-09',
    tier: '3_modules',
    query: 'How does CSS Flexbox layout student cards rendered by React after fetching JSON records from an Express endpoint?',
    required_modules: ['HTML & CSS Fundamentals', 'React Hooks Tutorial', 'Node.js & Express REST API Notes'],
    constraints: 3
  },

  // 4 Modules
  {
    id: 'MH-10',
    tier: '4_modules',
    query: 'How does modern JavaScript ES6 syntax power React hooks and Express REST endpoints that query indexed PostgreSQL tables?',
    required_modules: ['JavaScript ES6+ Deep Dive', 'React Hooks Tutorial', 'Node.js & Express REST API Notes', 'PostgreSQL Database Design'],
    constraints: 4
  },
  {
    id: 'MH-11',
    tier: '4_modules',
    query: 'How does CSS box-sizing style React components that display asynchronous data fetched from Express connected to PostgreSQL?',
    required_modules: ['HTML & CSS Fundamentals', 'React Hooks Tutorial', 'Node.js & Express REST API Notes', 'PostgreSQL Database Design'],
    constraints: 4
  },

  // 5 Modules (Full Curriculum Synthesis)
  {
    id: 'MH-12',
    tier: '5_modules',
    query: 'Design an end-to-end full-stack web application: HTML5 semantic tags and CSS Flexbox layout styling a React functional UI using hooks, calling Node.js Express middleware with JWT auth, executing parameterized queries against a 3NF PostgreSQL database with B-tree indexes, written in modern JavaScript ES6+.',
    required_modules: ['HTML & CSS Fundamentals', 'JavaScript ES6+ Deep Dive', 'React Hooks Tutorial', 'Node.js & Express REST API Notes', 'PostgreSQL Database Design'],
    constraints: 5
  },

  // High-Constraint Multi-Hop (3 modules + Negative Constraints)
  {
    id: 'MH-13',
    tier: 'high_constraint_3mod',
    query: 'How to connect React to an Express backend querying PostgreSQL WITHOUT using class components, WITHOUT using var declarations, and WITHOUT raw unparameterized SQL?',
    required_modules: ['React Hooks Tutorial', 'Node.js & Express REST API Notes', 'PostgreSQL Database Design'],
    constraints: 6
  },
  {
    id: 'MH-14',
    tier: 'high_constraint_3mod',
    query: 'How does Express stream PostgreSQL query results to a React client WITHOUT buffering the entire table in memory and WITHOUT blocking the libuv thread pool?',
    required_modules: ['React Hooks Tutorial', 'Node.js & Express REST API Notes', 'PostgreSQL Database Design'],
    constraints: 5
  },

  // Distracted Multi-Hop (3 modules + Irrelevant Distractor Terms)
  {
    id: 'MH-15',
    tier: 'distracted_3mod',
    query: 'How does React fetch PostgreSQL data through Express while ignoring Docker containers, Kubernetes pods, and Python Django settings?',
    required_modules: ['React Hooks Tutorial', 'Node.js & Express REST API Notes', 'PostgreSQL Database Design'],
    constraints: 6
  },
  {
    id: 'MH-16',
    tier: 'distracted_3mod',
    query: 'How do JavaScript arrow functions and React hooks interact with Express routes, regardless of AWS S3, Redis caching, or MongoDB collections?',
    required_modules: ['JavaScript ES6+ Deep Dive', 'React Hooks Tutorial', 'Node.js & Express REST API Notes'],
    constraints: 6
  }
];

async function runMultiHopBreakpointAudit() {
  console.log('================================================================');
  console.log(`  RUNNING EXP-0015 SUITE 05: MULTI-HOP BREAKPOINT & COMPLEXITY AUDIT (${multiHopCases.length} Cases)`);
  console.log('================================================================\n');

  const results = [];
  const tierStats = {};

  for (let i = 0; i < multiHopCases.length; i++) {
    const item = multiHopCases[i];
    process.stdout.write(`[${i + 1}/${multiHopCases.length}] [${item.tier}] "${item.query.substring(0, 45)}..." ... `);

    // Run search with limit=8 to test K=3, K=5, K=8 coverage
    const res = await searchGateway(item.query, { limit: 8 });

    const retrievedDocs = (res.results || []).map(r => r.title);
    const top3Docs = retrievedDocs.slice(0, 3);
    const top5Docs = retrievedDocs.slice(0, 5);
    const top8Docs = retrievedDocs.slice(0, 8);

    const checkCoverage = (docs) => {
      let matched = 0;
      for (const req of item.required_modules) {
        if (docs.some(d => d.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(d.toLowerCase()))) {
          matched++;
        }
      }
      return matched / item.required_modules.length;
    };

    const cov3 = checkCoverage(top3Docs);
    const cov5 = checkCoverage(top5Docs);
    const cov8 = checkCoverage(top8Docs);

    let status = 'FULL_COVERAGE';
    if (cov5 < 1.0) {
      status = 'PARTIAL_COVERAGE_DROP';
    } else if (cov3 < 1.0) {
      status = 'EXPANSION_NEEDED';
    }

    console.log(`${status} (Cov@3: ${(cov3 * 100).toFixed(0)}%, Cov@5: ${(cov5 * 100).toFixed(0)}%, Cov@8: ${(cov8 * 100).toFixed(0)}%)`);

    results.push({
      id: item.id,
      tier: item.tier,
      query: item.query,
      required_modules: item.required_modules,
      retrieved_top_8: retrievedDocs,
      coverage_at_3: Number((cov3 * 100).toFixed(1)),
      coverage_at_5: Number((cov5 * 100).toFixed(1)),
      coverage_at_8: Number((cov8 * 100).toFixed(1)),
      status
    });

    if (!tierStats[item.tier]) {
      tierStats[item.tier] = { count: 0, cov3: [], cov5: [], cov8: [] };
    }
    tierStats[item.tier].count++;
    tierStats[item.tier].cov3.push(cov3);
    tierStats[item.tier].cov5.push(cov5);
    tierStats[item.tier].cov8.push(cov8);
  }

  const summary = {
    total_cases: multiHopCases.length,
    by_tier: {},
    breakdown: results
  };

  for (const tier in tierStats) {
    const t = tierStats[tier];
    summary.by_tier[tier] = {
      count: t.count,
      mean_coverage_at_3: Number(((t.cov3.reduce((a, b) => a + b, 0) / t.count) * 100).toFixed(1)),
      mean_coverage_at_5: Number(((t.cov5.reduce((a, b) => a + b, 0) / t.count) * 100).toFixed(1)),
      mean_coverage_at_8: Number(((t.cov8.reduce((a, b) => a + b, 0) / t.count) * 100).toFixed(1))
    };
  }

  const outPath = path.resolve('D:/Collage project/EduConnect-LMS-Experimental/tests/rag/audit_exp0015/results_suite_05_multihop_breakpoint.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log('\n================================================================');
  console.log('EXP-0015 Suite 05 Multi-Hop Breakpoint Complete:');
  for (const tier in summary.by_tier) {
    const s = summary.by_tier[tier];
    console.log(`  Tier [${tier}]: Cov@3=${s.mean_coverage_at_3}%, Cov@5=${s.mean_coverage_at_5}%, Cov@8=${s.mean_coverage_at_8}%`);
  }
  console.log(`  Results written to: ${outPath}`);
  console.log('================================================================\n');
}

runMultiHopBreakpointAudit().catch(console.error);
