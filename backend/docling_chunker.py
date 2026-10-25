"""
backend/docling_chunker.py - EXP-0038: Structure-Aware Evidence Chunking with Docling HybridChunker

Implementation:
- Uses official Docling `DoclingDocument` data structures.
- Uses official Docling `HybridChunker` with token-aware chunk sizing.
- Aligned with `BAAI/bge-small-en-v1.5` tokenizer (`BertTokenizer`, max_tokens = 512).
- Preserves document hierarchy, headings, captions, code blocks, lists, and exact factual content.
- Maintains strict distinction between `raw_text` (evidence text) and `embedding_text` (contextualized text).
"""

import os
import re
import sqlite3
import numpy as np
from typing import List, Dict, Any, Tuple

from docling_core.types.doc.document import DoclingDocument, DocItemLabel
from docling_core.transforms.chunker.hybrid_chunker import HybridChunker
from transformers import AutoTokenizer

DB_PATH = os.path.join(os.path.dirname(__DIR__ if "__DIR__" in locals() else os.path.dirname(__file__)), "database", "rag_materials.sqlite3")
SEED_FILE = os.path.join(os.path.dirname(__DIR__ if "__DIR__" in locals() else os.path.dirname(__file__)), "backend", "seed_rag_knowledge.php")
MODEL_NAME = "BAAI/bge-small-en-v1.5"
MAX_TOKENS = 512

_TOKENIZER = None
_CHUNKER = None

def get_tokenizer():
    global _TOKENIZER
    if _TOKENIZER is None:
        _TOKENIZER = AutoTokenizer.from_pretrained(MODEL_NAME)
    return _TOKENIZER

def get_chunker():
    global _CHUNKER
    if _CHUNKER is None:
        tok = get_tokenizer()
        _CHUNKER = HybridChunker(tokenizer=tok, max_tokens=MAX_TOKENS)
    return _CHUNKER

def load_curriculum_source_documents() -> List[Dict[str, Any]]:
    """Loads authentic curriculum source documents from backend/seed_rag_knowledge.php."""
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        php_code = f.read()

    pattern = r"'title'\s*=>\s*'([^']+)',\s*'course_name'\s*=>\s*'([^']+)',\s*'default_mat_id'\s*=>\s*'([^']+)',\s*'content'\s*=>\s*<<<EOT\s*(.*?)\s*EOT"
    matches = re.findall(pattern, php_code, re.DOTALL)

    docs = []
    for title, course, mat_id, content in matches:
        docs.append({
            "title": title,
            "course_name": course,
            "material_id": mat_id,
            "content": content.replace("\r\n", "\n").strip()
        })
    return docs

def build_docling_document(doc_info: Dict[str, Any]) -> DoclingDocument:
    """
    Constructs a native DoclingDocument from raw curriculum note content.
    Identifies sections, headings, paragraphs, lists, and code fences.
    """
    title = doc_info["title"]
    content = doc_info["content"]

    doc = DoclingDocument(name=title)
    doc.add_title(text=title)

    lines = content.split("\n")
    i = 0
    in_code = False
    code_lines = []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Handle code fences
        if stripped.startswith("```"):
            if in_code:
                doc.add_code(text="\n".join(code_lines))
                code_lines = []
                in_code = False
            else:
                in_code = True
                code_lines = []
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        if not stripped:
            i += 1
            continue

        # Major section header (ALL-CAPS ending with colon or numbered section)
        # e.g., 'HTML5 SEMANTIC ELEMENTS:', 'CSS BOX MODEL:', '1. First Normal Form (1NF):'
        if re.match(r'^[A-Z0-9\s_\-&,./]{4,60}:$', stripped):
            header_text = stripped.rstrip(':').strip()
            doc.add_heading(text=header_text, level=1)
            i += 1
            continue
        elif re.match(r'^[0-9]+\.\s+[A-Z0-9\s_\-&,./()]{3,60}:$', stripped):
            header_text = stripped.rstrip(':').strip()
            doc.add_heading(text=header_text, level=2)
            i += 1
            continue
        elif stripped.startswith("- ") or stripped.startswith("* "):
            # Bullet list item (keep full text including tag names and bullet marker)
            doc.add_list_item(text=stripped)
            i += 1
            continue
        elif re.match(r'^[0-9]+\.\s+', stripped):
            # Numbered list item (keep full text)
            doc.add_list_item(text=stripped)
            i += 1
            continue
        else:
            # Paragraph text (aggregate until next structural block)
            para = [line]
            while i + 1 < len(lines):
                next_line = lines[i + 1]
                next_stripped = next_line.strip()
                if not next_stripped:
                    break
                if (next_stripped.startswith("```") or 
                    next_stripped.startswith("- ") or 
                    next_stripped.startswith("* ") or 
                    re.match(r'^[0-9]+\.\s+', next_stripped) or 
                    re.match(r'^[A-Z0-9\s_\-&,./]{4,60}:$', next_stripped)):
                    break
                para.append(next_line)
                i += 1
            doc.add_text(label=DocItemLabel.PARAGRAPH, text="\n".join(para))
            i += 1
            continue

    if in_code and code_lines:
        doc.add_code(text="\n".join(code_lines))

    return doc

def chunk_curriculum_documents() -> List[Dict[str, Any]]:
    """
    Executes Docling HybridChunker over all curriculum documents.
    Returns structured chunks with separate raw_text, embedding_text, headings, and token stats.
    """
    docs = load_curriculum_source_documents()
    chunker = get_chunker()
    tokenizer = get_tokenizer()

    all_chunks = []

    for doc_info in docs:
        mat_id = doc_info["material_id"]
        title = doc_info["title"]
        dl_doc = build_docling_document(doc_info)
        doc_chunks = list(chunker.chunk(dl_doc=dl_doc))

        for idx, c in enumerate(doc_chunks):
            raw_text = c.text
            embedding_text = chunker.contextualize(c)
            headings = list(c.meta.headings) if hasattr(c.meta, "headings") and c.meta.headings else [title]
            
            raw_tokens = len(tokenizer.encode(raw_text))
            ctx_tokens = len(tokenizer.encode(embedding_text))

            chunk_id = f"{mat_id}_c1_chunk_{idx}"

            all_chunks.append({
                "id": chunk_id,
                "material_id": mat_id,
                "source_document": title,
                "title": title,
                "chunk_index": idx,
                "raw_text": raw_text,
                "embedding_text": embedding_text,
                "content": raw_text,  # For compatibility with verifier interface
                "headings": headings,
                "captions": None,
                "page": 1,
                "token_count": raw_tokens,
                "ctx_token_count": ctx_tokens,
                "char_length": len(raw_text)
            })

    return all_chunks

if __name__ == "__main__":
    chunks = chunk_curriculum_documents()
    print(f"Docling HybridChunker successfully generated {len(chunks)} C1 chunks across 5 curriculum documents.")
    for c in chunks:
        print(f"  [{c['source_document']}] Chunk {c['chunk_index']} | {c['char_length']} chars | {c['token_count']} tok | Headings: {c['headings']}")
