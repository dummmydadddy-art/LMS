const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../../database/rag_store.sqlite');
if (!fs.existsSync(dbPath)) {
    console.error(`Database not found at ${dbPath}`);
    process.exit(1);
}

const db = new Database(dbPath);

console.log(`Testing page tracking in ${dbPath}...`);

try {
    const rows = db.prepare("SELECT id, title, metadata, content FROM material_chunks WHERE metadata LIKE '%page_citation%'").all();
    
    if (rows.length === 0) {
        console.log("No chunks with page_citation found.");
        process.exit(0);
    }
    
    const tableData = rows.map(row => {
        let meta = {};
        try {
            meta = JSON.parse(row.metadata);
        } catch (e) {}
        
        return {
            'Chunk ID': row.id,
            'Title': row.title,
            'Pages': meta.page_citation || 'N/A',
            'Content Preview': row.content.substring(0, 40).replace(/\n/g, ' ') + '...'
        };
    });
    
    console.table(tableData);
} catch (error) {
    console.error("Error accessing database:", error.message);
} finally {
    db.close();
}
