const http = require('http');
const fs = require('fs');
const path = require('path');

const SERVICE_KEY = 'lms-n8n-service-key-2026';
const PORT = 8000;

function makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve) => {
        const start = Date.now();
        const headers = {
            'X-Service-Key': SERVICE_KEY
        };
        let bodyStr = null;
        if (body) {
            bodyStr = JSON.stringify(body);
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

        const req = http.request({
            hostname: '127.0.0.1',
            port: PORT,
            path: path,
            method: method,
            headers: headers
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const duration = Date.now() - start;
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, duration, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, duration, raw: data.substring(0, 100) });
                }
            });
        });

        req.on('error', (err) => {
            resolve({ error: err.message, duration: Date.now() - start });
        });

        if (bodyStr) {
            req.write(bodyStr);
        }
        req.end();
    });
}

async function runBenchmark() {
    console.log("=================================================================");
    console.log("  EduConnect-LMS: FrankenPHP Concurrency Benchmark (Port 8000)");
    console.log("=================================================================\n");

    // Test 1: Parallel Burst (20 Concurrent Requests)
    const burstCount = 20;
    console.log(`[Test 1] Dispatching ${burstCount} Simultaneous Concurrent Requests...`);
    const startBurst = Date.now();
    const burstPromises = [];
    for (let i = 0; i < burstCount; i++) {
        burstPromises.push(
            makeRequest('/api/rag/search', 'POST', {
                query: `What are the benefits of B-tree indexes and normalization in database design? req_${i}`,
                limit: 2
            })
        );
    }
    const burstResults = await Promise.all(burstPromises);
    const totalBurstTime = Date.now() - startBurst;

    const durations = burstResults.map(r => r.duration);
    const successCount = burstResults.filter(r => r.status === 200).length;
    const avgLatency = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minLatency = Math.min(...durations);
    const maxLatency = Math.max(...durations);
    const throughput = burstCount / (totalBurstTime / 1000);

    console.log(`  -> Completed: ${successCount}/${burstCount} succeeded`);
    console.log(`  -> Total Elapsed: ${totalBurstTime}ms`);
    console.log(`  -> Min: ${minLatency}ms | Max: ${maxLatency}ms | Avg: ${avgLatency.toFixed(1)}ms`);
    console.log(`  -> Throughput: ${throughput.toFixed(2)} requests/second\n`);

    // Test 2: Non-blocking Interleaving Test
    console.log(`[Test 2] Head-of-Line Blocking / Interleaving Verification...`);
    const heavyReqPromise = makeRequest('/api/rag/search', 'POST', {
        query: "Explain the four layers of the CSS Box Model in extensive detail",
        limit: 4
    });

    // Small delay so Request 1 is actively executing
    await new Promise(r => setTimeout(r, 40));

    const fastReqStart = Date.now();
    const fastReqPromise = makeRequest('/api/rag/stats', 'GET');

    const fastRes = await fastReqPromise;
    const heavyRes = await heavyReqPromise;

    console.log(`  -> Fast Request (/api/rag/stats) duration: ${fastRes.duration}ms (HTTP ${fastRes.status})`);
    console.log(`  -> Heavy Request (/api/rag/search) duration: ${heavyRes.duration}ms (HTTP ${heavyRes.status})`);

    const nonBlocking = fastRes.duration < 15;
    console.log(`  -> Non-Blocking Execution: ${nonBlocking ? 'CONFIRMED (Zero Head-of-Line Blocking)' : 'FAILED'}\n`);

    const report = {
        server: "FrankenPHP 1.12.7 (PHP 8.5.11, Caddy v2.11.4)",
        port: PORT,
        timestamp: new Date().toISOString(),
        burst_test: {
            concurrent_requests: burstCount,
            successful: successCount,
            total_elapsed_ms: totalBurstTime,
            min_latency_ms: minLatency,
            max_latency_ms: maxLatency,
            avg_latency_ms: avgLatency,
            throughput_req_sec: throughput
        },
        interleaving_test: {
            heavy_request_ms: heavyRes.duration,
            fast_request_ms: fastRes.duration,
            non_blocking: nonBlocking
        }
    };

    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }
    const reportPath = path.join(reportsDir, 'CONCURRENCY_BENCHMARK_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Benchmark report saved to: ${reportPath}`);
}

runBenchmark();
