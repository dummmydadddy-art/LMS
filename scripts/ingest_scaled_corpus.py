import sys
import os
import re
import time
import json
import struct
import sqlite3
import urllib.request
import fitz

sys.stdout.reconfigure(encoding='utf-8')

CORPUS_DIR = r"d:\Collage project\EduConnect-LMS-Experimental\data\corpus_raw"
DB_PATH = r"d:\Collage project\EduConnect-LMS-Experimental\backend\storage\vectors.sqlite"
OLLAMA_EMBED_URL = "http://localhost:11434/api/embed"
EMBED_MODEL = "nomic-embed-text"
BATCH_SIZE = 32

BOOK_CONFIGS = [
    {
        "mat_id": "mat_eloquent_js",
        "prefix": "ejs",
        "title": "Eloquent JavaScript (4th Ed)",
        "file": os.path.join(CORPUS_DIR, "Eloquent_JavaScript.pdf"),
        "category": "Web & JavaScript Engineering",
        "page_start": 25,
        "page_end": 455,
        "target_chunks": 260
    },
    {
        "mat_id": "mat_postgresql_16",
        "prefix": "pg16",
        "title": "PostgreSQL 16 Reference Manual",
        "file": os.path.join(CORPUS_DIR, "postgresql-16-US.pdf"),
        "category": "Relational Databases & SQL",
        "page_start": 35,
        "page_end": 500,
        "target_chunks": 360
    },
    {
        "mat_id": "mat_pro_git",
        "prefix": "git",
        "title": "Pro Git (2nd Ed)",
        "file": os.path.join(CORPUS_DIR, "progit.pdf"),
        "category": "Version Control & Git Internals",
        "page_start": 20,
        "page_end": 490,
        "target_chunks": 260
    },
    {
        "mat_id": "mat_think_python",
        "prefix": "py",
        "title": "Think Python: How to Think Like a Computer Scientist",
        "file": os.path.join(CORPUS_DIR, "thinkpython2.pdf"),
        "category": "Python Programming & Algorithms",
        "page_start": 22,
        "page_end": 235,
        "target_chunks": 210
    },
    {
        "mat_id": "mat_data_science",
        "prefix": "fds",
        "title": "Foundations of Data Science (Blum, Hopcroft, Kannan)",
        "file": os.path.join(CORPUS_DIR, "foundations_of_data_science.pdf"),
        "category": "Data Science & Mathematics",
        "page_start": 18,
        "page_end": 350,
        "target_chunks": 210
    }
]

def clean_text(text):
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def split_into_subchunks(text, max_len=1000):
    """Splits a long paragraph into sentence-bounded chunks under max_len."""
    if len(text) <= max_len:
        return [text]
    
    sentences = re.split(r'(?<=[.?!])\s+', text)
    chunks = []
    curr = []
    curr_len = 0
    
    for s in sentences:
        if curr_len + len(s) > max_len and curr:
            chunks.append(" ".join(curr))
            curr = [s]
            curr_len = len(s)
        else:
            curr.append(s)
            curr_len += len(s)
            
    if curr:
        chunks.append(" ".join(curr))
    return chunks

def extract_and_chunk(cfg):
    doc = fitz.open(cfg["file"])
    total_pages = len(doc)
    p_start = min(cfg["page_start"], total_pages - 1)
    p_end = min(cfg["page_end"], total_pages)

    print(f"-> Extracting [{cfg['title']}] (p.{p_start}-{p_end} of {total_pages})...")
    
    pages_text = []
    for p in range(p_start, p_end):
        txt = doc[p].get_text()
        txt = clean_text(txt)
        if len(txt) > 80:
            pages_text.append((p + 1, txt))
            
    raw_chunks = []
    current_chunk = []
    current_len = 0
    current_pages = []
    
    for page_num, page_content in pages_text:
        paragraphs = re.split(r'\n\n+', page_content)
        for para in paragraphs:
            para = para.strip()
            if not para or len(para) < 30:
                continue
                
            # If paragraph itself is very long, subchunk it
            subchunks = split_into_subchunks(para, max_len=950)
            for sc in subchunks:
                if current_len + len(sc) > 950 and current_len >= 350:
                    chunk_text = " ".join(current_chunk)
                    raw_chunks.append({
                        "content": chunk_text,
                        "pages": sorted(list(set(current_pages))),
                        "page_start": min(current_pages),
                        "page_end": max(current_pages)
                    })
                    current_chunk = [sc]
                    current_len = len(sc)
                    current_pages = [page_num]
                else:
                    current_chunk.append(sc)
                    current_len += len(sc)
                    current_pages.append(page_num)
                    
    if current_chunk and current_len >= 200:
        chunk_text = " ".join(current_chunk)
        raw_chunks.append({
            "content": chunk_text,
            "pages": sorted(list(set(current_pages))),
            "page_start": min(current_pages),
            "page_end": max(current_pages)
        })
        
    target = cfg["target_chunks"]
    if len(raw_chunks) > target:
        step = len(raw_chunks) / target
        selected = [raw_chunks[int(i * step)] for i in range(target)]
    else:
        selected = raw_chunks
        
    print(f"   Done: {len(selected)} chunks selected (lengths {min(len(c['content']) for c in selected)} - {max(len(c['content']) for c in selected)} chars)")
    return selected

def fetch_batch_embeddings(texts):
    """Calls Ollama /api/embed with a batch of texts."""
    payload = json.dumps({"model": EMBED_MODEL, "input": texts}).encode("utf-8")
    req = urllib.request.Request(OLLAMA_EMBED_URL, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        return res.get("embeddings", [])

def main():
    print("=========================================================")
    print("  EduConnect-LMS: Scaling RAG Knowledge Base to 1,000+ Chunks")
    print(f"  Target DB: {DB_PATH}")
    print(f"  Embedding Engine: Ollama {EMBED_MODEL}")
    print("=========================================================\n")
    
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)
        
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    cur.execute("SELECT count(*) FROM material_chunks")
    baseline_count = cur.fetchone()[0]
    print(f"Baseline chunks in SQLite: {baseline_count}")
    
    # Clean previous book chunks if any exist, preserving baseline curriculum chunks
    cur.execute("DELETE FROM material_chunks WHERE id LIKE 'book_%' OR material_id LIKE 'mat_%'")
    conn.commit()
    print("Pruned any previous book runs; preserving baseline curriculum chunks.\n")
    
    all_chunks_to_insert = []
    
    # 1. Extract chunks from all 5 books
    for cfg in BOOK_CONFIGS:
        chunks = extract_and_chunk(cfg)
        for idx, c in enumerate(chunks):
            chunk_id = f"book_{cfg['prefix']}_chunk_{idx}"
            chunk_title = f"{cfg['title']}"
            
            # Format content with page marker for RagPageTracker compatibility
            content_with_marker = f"<!-- PAGE:{c['page_start']} -->\n{c['content']}"
            
            metadata = {
                "source": cfg["title"],
                "source_file": os.path.basename(cfg["file"]),
                "category": cfg["category"],
                "chunk_index": idx,
                "total_chunks": len(chunks),
                "page_start": c["page_start"],
                "page_end": c["page_end"],
                "pages": c["pages"],
                "page_markers": [f"<!-- PAGE:{c['page_start']} -->"]
            }
            
            all_chunks_to_insert.append({
                "id": chunk_id,
                "material_id": cfg["mat_id"],
                "course_id": None, # Universal cross-course reference
                "batch_id": None,
                "chunk_index": idx,
                "title": chunk_title,
                "content": content_with_marker,
                "metadata": json.dumps(metadata),
                "raw_text": c["content"]
            })
            
    print(f"\nTotal new textbook chunks to embed & index: {len(all_chunks_to_insert)}")
    print("Starting batch GPU embedding via Ollama...\n")
    
    # 2. Batch embed in chunks of BATCH_SIZE
    start_time = time.time()
    total_embedded = 0
    
    for i in range(0, len(all_chunks_to_insert), BATCH_SIZE):
        batch = all_chunks_to_insert[i:i + BATCH_SIZE]
        texts = [item["raw_text"] for item in batch]
        
        t0 = time.time()
        embs = fetch_batch_embeddings(texts)
        t_batch = time.time() - t0
        
        if len(embs) != len(batch):
            raise RuntimeError(f"Embedding batch size mismatch: got {len(embs)}, expected {len(batch)}")
            
        for item, emb in zip(batch, embs):
            item["embedding_blob"] = struct.pack(f"{len(emb)}f", *emb)
            
        total_embedded += len(batch)
        pct = (total_embedded / len(all_chunks_to_insert)) * 100
        ms_per_item = (t_batch / len(batch)) * 1000
        print(f"  -> Embedded {total_embedded}/{len(all_chunks_to_insert)} ({pct:.1f}%) | Batch {len(batch)} items in {t_batch:.2f}s ({ms_per_item:.1f}ms/chunk)")
        
    total_time = time.time() - start_time
    print(f"\nSuccessfully embedded {total_embedded} chunks in {total_time:.2f} seconds! (avg {(total_time/total_embedded)*1000:.1f}ms/chunk)\n")
    
    # 3. Insert into SQLite within a transaction
    print("Writing packed vectors and metadata into vectors.sqlite...")
    cur.execute("BEGIN TRANSACTION")
    insert_sql = """
        INSERT INTO material_chunks (id, material_id, course_id, batch_id, chunk_index, title, content, metadata, embedding)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    for item in all_chunks_to_insert:
        cur.execute(insert_sql, (
            item["id"],
            item["material_id"],
            item["course_id"],
            item["batch_id"],
            item["chunk_index"],
            item["title"],
            item["content"],
            item["metadata"],
            item["embedding_blob"]
        ))
    conn.commit()
    
    # 4. Final verification
    cur.execute("SELECT count(*) FROM material_chunks")
    final_count = cur.fetchone()[0]
    
    cur.execute("SELECT material_id, count(*), min(length(content)), max(length(content)), count(embedding) FROM material_chunks GROUP BY material_id")
    stats = cur.fetchall()
    
    print("\n================ FINAL KNOWLEDGE BASE STATE ================")
    print(f"Total Chunks in Vector Store: {final_count}")
    print(f"{'Material / Book ID':<30} {'Chunks':<8} {'Min Len':<10} {'Max Len':<10} {'Vectors'}")
    print("-" * 70)
    for row in stats:
        print(f"{row[0]:<30} {row[1]:<8} {row[2]:<10} {row[3]:<10} {row[4]}")
    print("============================================================\n")
    
    conn.close()

if __name__ == "__main__":
    main()
