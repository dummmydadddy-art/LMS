import sys
import os
import re
import fitz

sys.stdout.reconfigure(encoding='utf-8')

CORPUS_DIR = r"d:\Collage project\EduConnect-LMS-Experimental\data\corpus_raw"

BOOK_CONFIGS = [
    {
        "id": "book_eloquent_js",
        "title": "Eloquent JavaScript (4th Edition)",
        "file": os.path.join(CORPUS_DIR, "Eloquent_JavaScript.pdf"),
        "course_id": "8e561fd8-744a-4845-a577-140bd4389346",
        "batch_id": "9421c760-14bc-4687-82ec-ab02effc833f",
        "category": "Web Engineering",
        "page_start": 25,
        "page_end": 455,
        "target_chunks": 260
    },
    {
        "id": "book_postgresql_16",
        "title": "PostgreSQL 16 Documentation",
        "file": os.path.join(CORPUS_DIR, "postgresql-16-US.pdf"),
        "course_id": "8e561fd8-744a-4845-a577-140bd4389346",
        "batch_id": "9421c760-14bc-4687-82ec-ab02effc833f",
        "category": "Database Systems",
        # Key chapters: Tutorial, SQL Syntax, Data Definition, Queries, Data Types, Functions, Indexes, Concurrency Control
        "page_start": 35,
        "page_end": 500,
        "target_chunks": 360
    },
    {
        "id": "book_pro_git",
        "title": "Pro Git (2nd Edition)",
        "file": os.path.join(CORPUS_DIR, "progit.pdf"),
        "course_id": "8e561fd8-744a-4845-a577-140bd4389346",
        "batch_id": "9421c760-14bc-4687-82ec-ab02effc833f",
        "category": "Version Control & DevOps",
        "page_start": 20,
        "page_end": 490,
        "target_chunks": 260
    },
    {
        "id": "book_think_python",
        "title": "Think Python: How to Think Like a Computer Scientist",
        "file": os.path.join(CORPUS_DIR, "thinkpython2.pdf"),
        "course_id": "8e561fd8-744a-4845-a577-140bd4389346",
        "batch_id": "9421c760-14bc-4687-82ec-ab02effc833f",
        "category": "Software Engineering & Algorithms",
        "page_start": 22,
        "page_end": 235,
        "target_chunks": 210
    },
    {
        "id": "book_data_science",
        "title": "Foundations of Data Science (Blum, Hopcroft, Kannan)",
        "file": os.path.join(CORPUS_DIR, "foundations_of_data_science.pdf"),
        "course_id": "8e561fd8-744a-4845-a577-140bd4389346",
        "batch_id": "9421c760-14bc-4687-82ec-ab02effc833f",
        "category": "Data Science & Machine Learning",
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

def chunk_book(cfg):
    doc = fitz.open(cfg["file"])
    total_pages = len(doc)
    p_start = min(cfg["page_start"], total_pages - 1)
    p_end = min(cfg["page_end"], total_pages)

    print(f"\nProcessing [{cfg['title']}] (Pages {p_start} to {p_end} of {total_pages})...")
    
    pages_text = []
    for p in range(p_start, p_end):
        txt = doc[p].get_text()
        txt = clean_text(txt)
        # Skip pages that are too short (diagrams, empty, page numbers only)
        if len(txt) > 100:
            pages_text.append((p + 1, txt))
            
    print(f"  Extracted {len(pages_text)} readable pages.")
    
    # Target chunk count and sampling
    # We want chunks of around 600-1000 characters
    raw_chunks = []
    current_chunk = []
    current_len = 0
    current_pages = []
    
    for page_num, page_content in pages_text:
        paragraphs = re.split(r'\n\n+', page_content)
        for para in paragraphs:
            para = para.strip()
            if not para or len(para) < 40:
                continue
                
            if current_len + len(para) > 900 and current_len >= 400:
                chunk_str = " ".join(current_chunk)
                raw_chunks.append({
                    "content": chunk_str,
                    "pages": sorted(list(set(current_pages))),
                    "length": len(chunk_str)
                })
                current_chunk = [para]
                current_len = len(para)
                current_pages = [page_num]
            else:
                current_chunk.append(para)
                current_len += len(para)
                current_pages.append(page_num)
                
    if current_chunk and current_len >= 200:
        chunk_str = " ".join(current_chunk)
        raw_chunks.append({
            "content": chunk_str,
            "pages": sorted(list(set(current_pages))),
            "length": len(chunk_str)
        })
        
    print(f"  Generated {len(raw_chunks)} candidate chunks from book.")
    
    # If more than target_chunks, sample evenly across the book chapters
    target = cfg["target_chunks"]
    if len(raw_chunks) > target:
        step = len(raw_chunks) / target
        selected = [raw_chunks[int(i * step)] for i in range(target)]
    else:
        selected = raw_chunks
        
    print(f"  Selected {len(selected)} balanced chunks across chapters.")
    return selected

total_all = 0
for cfg in BOOK_CONFIGS:
    chunks = chunk_book(cfg)
    total_all += len(chunks)
    if chunks:
        sample = chunks[0]
        print(f"    Sample Chunk 0 (Pages {sample['pages']}, Len {sample['length']}):")
        print(f"    '{sample['content'][:140]}...'")

print(f"\n==========================================")
print(f"Total textbook chunks planned: {total_all}")
print(f"Existing curriculum chunks: 23")
print(f"Projected total vector database size: {total_all + 23} chunks")
print(f"==========================================")
