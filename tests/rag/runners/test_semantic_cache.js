const http = require('http');

const API_BASE = 'http://127.0.0.1:8000';
const SERVICE_KEY = process.env.SERVICE_KEY || 'lms-n8n-service-key-2026';

const queries = [
    "Explain the four layers of the CSS Box Model",
    "How do var, let, and const differ in JavaScript?",
    "What are the two fundamental Rules of Hooks in React?",
    "What is the purpose of the <main> HTML5 semantic element?",
    "What does the next() function do in an Express middleware?"
];

const similarQueries = {
    "Explain the four layers of the CSS Box Model": "What are the four layers of the CSS box model?",
    "How do var, let, and const differ in JavaScript?": "What is the difference between var, let, and const in JavaScript?",
    "What are the two fundamental Rules of Hooks in React?": "State the two core rules of hooks in React"
};

async function askRag(query) {
    return new Promise((resolve, reject) => {
        const req = http.request(`${API_BASE}/api/rag/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Service-Key': SERVICE_KEY
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify({ question: query }));
        req.end();
    });
}

async function runTests() {
    console.log("Starting Semantic Cache Tests against Live API...");
    let firstCallTimes = [];
    let secondCallTimes = [];
    let similarCallTimes = [];
    let hits = 0;

    for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        
        // 1st call (miss / generate)
        const start1 = Date.now();
        const res1 = await askRag(q).catch((e) => ({ error: e.message }));
        const duration1 = Date.now() - start1;
        firstCallTimes.push(duration1);
        
        // 2nd call (exact hit)
        const start2 = Date.now();
        const res2 = await askRag(q).catch((e) => ({ error: e.message }));
        const duration2 = Date.now() - start2;
        secondCallTimes.push(duration2);
        
        if (res2.cache_hit) hits++;

        console.log(`Query: "${q.substring(0, 35)}..." | Miss: ${duration1}ms | Exact Hit: ${duration2}ms (Hit: ${!!res2.cache_hit})`);

        // Similar query (semantic hit)
        if (similarQueries[q]) {
            const sq = similarQueries[q];
            const start3 = Date.now();
            const res3 = await askRag(sq).catch((e) => ({ error: e.message }));
            const duration3 = Date.now() - start3;
            similarCallTimes.push(duration3);
            
            if (res3.cache_hit) hits++;
            
            console.log(`  -> Similar: "${sq.substring(0, 35)}..." | Latency: ${duration3}ms (Hit: ${!!res3.cache_hit})`);
        }
    }

    const avg = arr => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0;
    
    console.log("\n--- Results ---");
    console.log(`Average Miss Latency: ${avg(firstCallTimes).toFixed(2)}ms`);
    console.log(`Average Exact Hit Latency: ${avg(secondCallTimes).toFixed(2)}ms`);
    console.log(`Average Similar Query Latency: ${avg(similarCallTimes).toFixed(2)}ms`);
    console.log(`Total Cache Hits: ${hits}`);
}

runTests();
