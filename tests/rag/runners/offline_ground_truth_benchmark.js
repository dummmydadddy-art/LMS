const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { calculateIRMetrics } = require('../evaluators/ir_metrics');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const DB_PATH = path.join(PROJECT_ROOT, 'backend', 'storage', 'vectors.sqlite');
const GOLDEN_DATA_PATH = path.join(__dirname, '..', 'datasets', 'golden', 'lms_golden_v1.json');
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const CACHE_PATH = path.join(CACHE_DIR, 'query_embeddings.json');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

function unpackEmbedding(buffer) {
  const floats = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  return Array.from(floats);
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getEmbedding(query, skipEmbedding, cache) {
  if (skipEmbedding && cache[query]) {
    return cache[query];
  }
  
  if (skipEmbedding) {
      console.warn(`Warning: --skip-embedding is set but query not in cache: "${query}"`);
  }

  try {
    const res = await fetch('http://localhost:11434/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', input: query })
    });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const embedding = data.embeddings[0];
    cache[query] = embedding;
    return embedding;
  } catch (err) {
    throw new Error(`Failed to get embedding from Ollama: ${err.message}. Is Ollama running?`);
  }
}

async function runOfflineBenchmark() {
  const args = process.argv.slice(2);
  const skipEmbedding = args.includes('--skip-embedding');

  console.log('\n======================================================');
  console.log(`  RUNNING OFFLINE GROUND-TRUTH BENCHMARK`);
  console.log(`  Target DB: ${DB_PATH}`);
  console.log(`  Mode: ${skipEmbedding ? 'Cached Embeddings' : 'Live Ollama Embeddings'}`);
  console.log('======================================================\n');

  if (!fs.existsSync(DB_PATH)) {
      console.error(`Error: SQLite database not found at ${DB_PATH}`);
      process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare('SELECT id, material_id, course_id, batch_id, chunk_index, title, content, metadata, embedding FROM material_chunks').all();
  
  console.log(`Loaded ${rows.length} chunks from vector store.`);

  const chunks = rows.map(row => {
      let emb = [];
      if (row.embedding) {
          emb = unpackEmbedding(row.embedding);
      }
      return {
          ...row,
          embeddingArr: emb
      };
  }).filter(c => c.embeddingArr.length === 768);

  console.log(`Successfully unpacked ${chunks.length} chunks with 768-dim embeddings.`);

  const goldenData = JSON.parse(fs.readFileSync(GOLDEN_DATA_PATH, 'utf8'));
  console.log(`Loaded ${goldenData.length} golden test cases.\n`);

  let cache = {};
  if (skipEmbedding && fs.existsSync(CACHE_PATH)) {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      console.log(`Loaded ${Object.keys(cache).length} cached embeddings.\n`);
  }

  const queryResults = [];
  
  let allP1 = [];
  let allP3 = [];
  let allP5 = [];
  let allHit1 = [];
  let allHit3 = [];
  let allHit5 = [];
  let allMrr = [];
  let allKwRecall = [];
  let allNdcg = [];
  let allRecall5 = [];

  for (let i = 0; i < goldenData.length; i++) {
    const tc = goldenData[i];
    process.stdout.write(`   [${tc.id}] ${tc.query.substring(0, 45).padEnd(48)} ... `);

    let queryEmbedding;
    try {
        queryEmbedding = await getEmbedding(tc.query, skipEmbedding, cache);
    } catch (err) {
        console.error(`\n   ERROR: ${err.message}`);
        continue;
    }

    // Compute similarities
    for (const chunk of chunks) {
        chunk.score = cosineSimilarity(queryEmbedding, chunk.embeddingArr);
    }

    // Sort by score descending and take top 5
    chunks.sort((a, b) => b.score - a.score);
    const top5 = chunks.slice(0, 5);

    const ir = calculateIRMetrics(tc, top5, [1, 3, 5]);

    // Recall@5 logic (custom for expected_doc matching since IR metrics doesn't strictly output Recall)
    const expectedDocs = (tc.expected_modules || (tc.expected_doc ? [tc.expected_doc] : [])).map(d => d.toLowerCase().trim());
    const expectedDoc = (tc.expected_doc || (expectedDocs[0] || '')).toLowerCase().trim();
    
    // recall is 1 if expected doc is in top 5, 0 otherwise (similar to hit@5 for single expected doc)
    const recall5 = ir.hitRate['hit@5'] || 0;

    allP1.push(ir.precision['p@1']);
    allP3.push(ir.precision['p@3']);
    allP5.push(ir.precision['p@5']);
    allHit1.push(ir.hitRate['hit@1']);
    allHit3.push(ir.hitRate['hit@3']);
    allHit5.push(ir.hitRate['hit@5']);
    allMrr.push(ir.mrr);
    allKwRecall.push(ir.keywordRecall);
    allNdcg.push(ir.ndcg5);
    allRecall5.push(recall5);

    queryResults.push({
        id: tc.id,
        query: tc.query,
        expected_doc: expectedDoc,
        retrieved: top5.map(c => ({ id: c.id, title: c.title, score: c.score })),
        metrics: {
            ...ir,
            recall5
        }
    });

    console.log(`HIT@3=${ir.hitRate['hit@3'] === 1.0 ? 'YES' : 'NO '} | nDCG@5=${ir.ndcg5.toFixed(2)}`);
  }

  // Save cache
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');

  const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const aggregateMetrics = {
      precision1: parseFloat(avg(allP1).toFixed(4)),
      precision3: parseFloat(avg(allP3).toFixed(4)),
      precision5: parseFloat(avg(allP5).toFixed(4)),
      recall5: parseFloat(avg(allRecall5).toFixed(4)),
      mrr: parseFloat(avg(allMrr).toFixed(4)),
      ndcg5: parseFloat(avg(allNdcg).toFixed(4)),
      keywordRecall: parseFloat(avg(allKwRecall).toFixed(4)),
      hitRate1: parseFloat(avg(allHit1).toFixed(4)),
      hitRate3: parseFloat(avg(allHit3).toFixed(4)),
      hitRate5: parseFloat(avg(allHit5).toFixed(4))
  };

  const report = {
      metadata: {
          timestamp: new Date().toISOString(),
          corpusSize: chunks.length,
          embeddingModel: 'nomic-embed-text',
          vectorDimensions: 768
      },
      aggregateMetrics,
      queryResults
  };

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(REPORTS_DIR, `GROUND_TRUTH_BENCHMARK_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log(`  OFFLINE SCORECARD`);
  console.log('======================================================');
  console.log(`  Total Test Cases:    ${queryResults.length}`);
  console.log('  --- RETRIEVAL METRICS ---');
  console.log(`  HitRate@1:           ${(aggregateMetrics.hitRate1 * 100).toFixed(1)}%`);
  console.log(`  HitRate@3:           ${(aggregateMetrics.hitRate3 * 100).toFixed(1)}%`);
  console.log(`  HitRate@5:           ${(aggregateMetrics.hitRate5 * 100).toFixed(1)}%`);
  console.log(`  Recall@5:            ${(aggregateMetrics.recall5 * 100).toFixed(1)}%`);
  console.log(`  Precision@1:         ${(aggregateMetrics.precision1 * 100).toFixed(1)}%`);
  console.log(`  Precision@3:         ${(aggregateMetrics.precision3 * 100).toFixed(1)}%`);
  console.log(`  Precision@5:         ${(aggregateMetrics.precision5 * 100).toFixed(1)}%`);
  console.log(`  Mean Recip. Rank:    ${aggregateMetrics.mrr.toFixed(4)}`);
  console.log(`  Keyword Recall:      ${(aggregateMetrics.keywordRecall * 100).toFixed(1)}%`);
  console.log(`  nDCG@5:              ${aggregateMetrics.ndcg5.toFixed(4)}`);
  console.log('======================================================');
  console.log(`Detailed JSON logged to: ${reportPath}\n`);
}

if (require.main === module) {
  runOfflineBenchmark().catch(console.error);
}

module.exports = { runOfflineBenchmark };
