const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../../backend/storage/pipeline_logs');

function readLogs() {
    const logs = [];
    if (!fs.existsSync(LOG_DIR)) {
        return logs;
    }
    
    const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.jsonl'));
    for (const file of files) {
        const content = fs.readFileSync(path.join(LOG_DIR, file), 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.trim()) {
                try {
                    logs.push(JSON.parse(line));
                } catch (e) {
                    // Ignore malformed lines
                }
            }
        }
    }
    return logs;
}

function calculatePercentile(arr, p) {
    if (arr.length === 0) return 0;
    arr.sort((a, b) => a - b);
    const index = (p / 100) * (arr.length - 1);
    const floor = Math.floor(index);
    const ceil = Math.ceil(index);
    if (floor === ceil) return arr[floor];
    return arr[floor] + (arr[ceil] - arr[floor]) * (index - floor);
}

function runProfiler() {
    const logs = readLogs();
    if (logs.length === 0) {
        console.log("No pipeline logs found in " + LOG_DIR);
        return;
    }
    
    const stageTimes = {};
    let totalRetrievalTimes = [];
    let llmGenerationTimes = [];
    let endToEndTimes = [];
    
    for (const log of logs) {
        endToEndTimes.push(log.total_ms || 0);
        
        let retrievalTotal = 0;
        
        if (log.stages) {
            for (const [stage, ms] of Object.entries(log.stages)) {
                if (!stageTimes[stage]) {
                    stageTimes[stage] = [];
                }
                stageTimes[stage].push(ms);
                
                if (stage === 'llm_generation' || stage === 'total_generation') {
                    llmGenerationTimes.push(ms);
                } else if (stage === 'total_retrieval') {
                    retrievalTotal = ms;
                }
            }
            
            if (retrievalTotal === 0) {
                for (const [stage, ms] of Object.entries(log.stages)) {
                    if (stage !== 'llm_generation' && stage !== 'total_generation' && stage !== 'total_retrieval') {
                        retrievalTotal += ms;
                    }
                }
            }
            
            if (retrievalTotal > 0) {
                totalRetrievalTimes.push(retrievalTotal);
            }
        }
    }
    
    const stageAvgs = [];
    let totalAvgTimeForStages = 0;
    
    const ignoredStages = ['llm_generation', 'total_generation', 'total_retrieval'];
    
    for (const [stage, times] of Object.entries(stageTimes)) {
        if (ignoredStages.includes(stage)) continue;
        
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        stageAvgs.push({ stage, avg });
        totalAvgTimeForStages += avg;
    }
    
    stageAvgs.sort((a, b) => b.avg - a.avg);
    
    console.log(`\n  Pipeline Stage Breakdown (${logs.length} queries, avg)`);
    console.log(`  ${'─'.repeat(42)}`);
    
    const maxBarLength = 40;
    
    for (const { stage, avg } of stageAvgs) {
        const percentage = totalAvgTimeForStages > 0 ? (avg / totalAvgTimeForStages) * 100 : 0;
        const barLength = Math.max(1, Math.round((percentage / 100) * maxBarLength));
        const bar = percentage < 1 ? '▏' : '█'.repeat(barLength);
        
        const stagePadded = (stage + ' '.repeat(20)).substring(0, 20);
        const barPadded = (bar + ' '.repeat(maxBarLength)).substring(0, maxBarLength);
        
        console.log(`  ${stagePadded}  ${barPadded}  ${avg.toFixed(1)}ms (${percentage.toFixed(1)}%)`);
    }
    
    console.log(`  ${'─'.repeat(42)}`);
    
    if (totalRetrievalTimes.length > 0) {
        const avg = totalRetrievalTimes.reduce((a, b) => a + b, 0) / totalRetrievalTimes.length;
        const p50 = calculatePercentile(totalRetrievalTimes, 50);
        const p95 = calculatePercentile(totalRetrievalTimes, 95);
        console.log(`  Total Retrieval:      ${avg.toFixed(1)}ms (avg)  |  p50: ${p50.toFixed(0)}ms  |  p95: ${p95.toFixed(0)}ms`);
    }
    
    if (llmGenerationTimes.length > 0) {
        const avg = llmGenerationTimes.reduce((a, b) => a + b, 0) / llmGenerationTimes.length;
        const p50 = calculatePercentile(llmGenerationTimes, 50);
        const p95 = calculatePercentile(llmGenerationTimes, 95);
        console.log(`  LLM Generation:       ${avg.toFixed(0)}ms (avg)  |  p50: ${p50.toFixed(0)}ms |  p95: ${p95.toFixed(0)}ms`);
    }
    
    if (endToEndTimes.length > 0) {
        const avg = endToEndTimes.reduce((a, b) => a + b, 0) / endToEndTimes.length;
        const p50 = calculatePercentile(endToEndTimes, 50);
        const p95 = calculatePercentile(endToEndTimes, 95);
        console.log(`  End-to-End:           ${avg.toFixed(0)}ms (avg)  |  p50: ${p50.toFixed(0)}ms |  p95: ${p95.toFixed(0)}ms`);
    }
    console.log('\n');
}

runProfiler();
