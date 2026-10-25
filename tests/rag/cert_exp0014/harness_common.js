// EXP-0014 Certification Common Utility Library
const http = require('http');

const API_BASE = 'http://127.0.0.1:8000';
const SERVICE_KEY = 'lms-n8n-service-key-2026';

function mean(arr) {
  if (!arr || !arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  if (!arr || !arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stddev(arr) {
  if (!arr || arr.length <= 1) return 0;
  const m = mean(arr);
  const variance = arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function percentile(arr, p) {
  if (!arr || !arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// 95% Wilson Score Interval for binomial proportions
function wilsonScoreInterval(successes, total, z = 1.96) {
  if (total === 0) return { lower: 0, upper: 0, p: 0 };
  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denominator;
  const spread = (z * Math.sqrt((p * (1 - p) / total) + (z2 / (4 * total * total)))) / denominator;
  return {
    p: parseFloat(p.toFixed(4)),
    lower: parseFloat(Math.max(0, center - spread).toFixed(4)),
    upper: parseFloat(Math.min(1, center + spread).toFixed(4))
  };
}

// 95% Normal Confidence Interval for continuous values
function continuousConfidenceInterval(arr, z = 1.96) {
  if (!arr || arr.length <= 1) return { mean: mean(arr), lower: mean(arr), upper: mean(arr) };
  const m = mean(arr);
  const s = stddev(arr);
  const margin = z * (s / Math.sqrt(arr.length));
  return {
    mean: parseFloat(m.toFixed(2)),
    lower: parseFloat((m - margin).toFixed(2)),
    upper: parseFloat((m + margin).toFixed(2))
  };
}

// Expected Calibration Error (ECE)
function computeECE(confidences, outcomes, numBins = 10) {
  if (!confidences.length) return 0;
  const bins = Array.from({ length: numBins }, () => ({ count: 0, correct: 0, confSum: 0 }));
  for (let i = 0; i < confidences.length; i++) {
    const conf = Math.max(0, Math.min(1, confidences[i]));
    const binIdx = Math.min(numBins - 1, Math.floor(conf * numBins));
    bins[binIdx].count++;
    bins[binIdx].correct += (outcomes[i] ? 1 : 0);
    bins[binIdx].confSum += conf;
  }
  let ece = 0;
  const total = confidences.length;
  for (const b of bins) {
    if (b.count > 0) {
      const acc = b.correct / b.count;
      const avgConf = b.confSum / b.count;
      ece += (b.count / total) * Math.abs(acc - avgConf);
    }
  }
  return parseFloat(ece.toFixed(4));
}

// Brier Score
function computeBrierScore(probabilities, outcomes) {
  if (!probabilities.length) return 0;
  let sum = 0;
  for (let i = 0; i < probabilities.length; i++) {
    const p = Math.max(0, Math.min(1, probabilities[i]));
    const y = outcomes[i] ? 1 : 0;
    sum += Math.pow(p - y, 2);
  }
  return parseFloat((sum / probabilities.length).toFixed(4));
}

// HTTP POST to /api/rag/search
function searchGateway(query, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const payload = JSON.stringify({ query });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8000,
      path: '/api/rag/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': SERVICE_KEY,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: timeoutMs
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - start;
        try {
          const json = JSON.parse(data);
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            latency,
            data: json
          });
        } catch (err) {
          resolve({
            success: false,
            statusCode: res.statusCode,
            latency,
            error: 'Invalid JSON: ' + data.slice(0, 100)
          });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, latency: Date.now() - start, error: 'TIMEOUT' });
    });

    req.on('error', (err) => {
      resolve({ success: false, latency: Date.now() - start, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

// HTTP POST to /api/rag/ask
function askGateway(query, history = [], stream = false, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const payload = JSON.stringify({ query, conversation_history: history });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8000,
      path: stream ? '/api/rag/ask?stream=true' : '/api/rag/ask',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': SERVICE_KEY,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: timeoutMs
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - start;
        try {
          const json = JSON.parse(data);
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            latency,
            data: json
          });
        } catch (err) {
          resolve({
            success: false,
            statusCode: res.statusCode,
            latency,
            error: 'Invalid JSON: ' + data.slice(0, 100),
            raw: data
          });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, latency: Date.now() - start, error: 'TIMEOUT' });
    });

    req.on('error', (err) => {
      resolve({ success: false, latency: Date.now() - start, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

function evaluateRetrievalRank(results, expectedDoc, expectedKeyword = null) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return { rank: 0, hit1: 0, hit3: 0, hit5: 0, mrr: 0, ndcg5: 0, kwHit: 0 };
  }
  let rank = 0;
  let kwHit = 0;
  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    const titleMatch = item.title === expectedDoc || (item.title && item.title.includes(expectedDoc));
    if (titleMatch && rank === 0) {
      rank = i + 1;
    }
    if (expectedKeyword && (item.content || '').toLowerCase().includes(expectedKeyword.toLowerCase())) {
      kwHit = 1;
    }
  }
  const hit1 = rank === 1 ? 1 : 0;
  const hit3 = (rank >= 1 && rank <= 3) ? 1 : 0;
  const hit5 = (rank >= 1 && rank <= 5) ? 1 : 0;
  const mrr = rank > 0 ? (1 / rank) : 0;
  let dcg = 0;
  if (rank >= 1 && rank <= 5) {
    dcg = 1 / Math.log2(rank + 1);
  }
  const idcg = 1 / Math.log2(2); // Ideal rank is 1
  const ndcg5 = dcg / idcg;

  return { rank, hit1, hit3, hit5, mrr, ndcg5, kwHit };
}

module.exports = {
  mean,
  median,
  stddev,
  percentile,
  wilsonScoreInterval,
  continuousConfidenceInterval,
  computeECE,
  computeBrierScore,
  searchGateway,
  askGateway,
  evaluateRetrievalRank
};
