const fs = require('fs');
const path = require('path');

function formatPercent(val) {
    return (val * 100).toFixed(1) + '%';
}

function runComparison() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node compare_benchmarks.js <file1.json> <file2.json>');
        process.exit(1);
    }
    
    const file1 = path.resolve(args[0]);
    const file2 = path.resolve(args[1]);
    
    if (!fs.existsSync(file1)) {
        console.error(`Error: File not found - ${file1}`);
        process.exit(1);
    }
    if (!fs.existsSync(file2)) {
        console.error(`Error: File not found - ${file2}`);
        process.exit(1);
    }
    
    const data1 = JSON.parse(fs.readFileSync(file1, 'utf8'));
    const data2 = JSON.parse(fs.readFileSync(file2, 'utf8'));
    
    const agg1 = data1.aggregateMetrics || (data1.overall && data1.overall.retrieval) || data1;
    const agg2 = data2.aggregateMetrics || (data2.overall && data2.overall.retrieval) || data2;
    
    const metricsToCompare = [
        ['HitRate@1', 'hitRate1', true],
        ['HitRate@3', 'hitRate3', true],
        ['HitRate@5', 'hitRate5', true],
        ['Recall@5', 'recall5', true],
        ['Precision@1', 'precision1', true],
        ['Precision@3', 'precision3', true],
        ['Precision@5', 'precision5', true],
        ['Mean Recip. Rank', 'mrr', false],
        ['Keyword Recall', 'keywordRecall', true],
        ['nDCG@5', 'ndcg5', false]
    ];
    
    console.log('\n================================================================');
    console.log(`  BENCHMARK COMPARISON`);
    console.log(`  Base: ${path.basename(file1)}`);
    console.log(`  New:  ${path.basename(file2)}`);
    console.log('================================================================');
    console.log(`| Metric             | Base       | New        | Delta      |`);
    console.log(`|--------------------|------------|------------|------------|`);
    
    for (const [label, key, isPct] of metricsToCompare) {
        if (agg1[key] === undefined || agg2[key] === undefined) {
            continue;
        }
        
        const v1 = agg1[key];
        const v2 = agg2[key];
        const delta = v2 - v1;
        
        const f1 = isPct ? formatPercent(v1) : v1.toFixed(4);
        const f2 = isPct ? formatPercent(v2) : v2.toFixed(4);
        const fd = isPct ? (delta > 0 ? '+' : '') + (delta * 100).toFixed(1) + '%' : (delta > 0 ? '+' : '') + delta.toFixed(4);
        
        const reset = '\x1b[0m';
        const red = '\x1b[31m';
        const green = '\x1b[32m';
        
        let fdStyled = fd;
        if (delta < -0.0001) fdStyled = `${red}${fd.padEnd(10)}${reset}`;
        else if (delta > 0.0001) fdStyled = `${green}${fd.padEnd(10)}${reset}`;
        else fdStyled = fd.padEnd(10);
        
        console.log(`| ${label.padEnd(18)} | ${f1.padEnd(10)} | ${f2.padEnd(10)} | ${fdStyled} |`);
    }
    console.log('================================================================\n');
}

if (require.main === module) {
    runComparison();
}
