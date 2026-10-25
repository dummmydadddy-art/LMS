"""
EXP-0071 Targeted Counter-Evidence Retrieval Module (Action A2)
Generates targeted counter-queries and retrieves falsifying/contrastive curriculum chunks.
"""

import os
import json
import re
import math
from collections import Counter

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Antonym / Contradiction polarity mapping for query transformation
CONTRAST_MAPPINGS = {
    'content-box': ['border-box', 'excludes padding', 'width only'],
    'border-box': ['content-box', 'includes padding and border'],
    'flexbox': ['one-dimensional', '1-dimensional', 'row or column', 'grid 2d'],
    'grid': ['two-dimensional', '2-dimensional', 'rows and columns', 'flexbox 1d'],
    'mutable': ['immutable', 'cannot modify', 'read-only'],
    'immutable': ['mutable', 'can modify', 'in-place'],
    'tuple': ['immutable', 'cannot append', 'read-only'],
    'list': ['mutable', 'append', 'dynamic'],
    'synchronous': ['asynchronous', 'blocking', 'non-blocking'],
    'asynchronous': ['synchronous', 'event loop', 'callback', 'promise'],
    'client': ['server', 'browser-side', 'server-side'],
    'server': ['client', 'backend', 'frontend'],
    'row': ['column', 'horizontal', 'vertical'],
    'column': ['row', 'vertical', 'horizontal'],
    'block': ['inline', 'full width', 'flows'],
    'inline': ['block', 'content width', 'stacked'],
    'stateless': ['stateful', 'session', 'cookie'],
    'stateful': ['stateless', 'independent requests'],
    'primary key': ['unique', 'not null', 'foreign key'],
    'foreign key': ['references', 'referential integrity'],
    'get': ['idempotent', 'url parameters', 'safe'],
    'post': ['non-idempotent', 'request body', 'side effects']
}

class SimpleBM25:
    """Lightweight self-contained BM25 index over curriculum chunks."""
    def __init__(self, corpus, k1=1.5, b=0.75):
        self.corpus = corpus
        self.k1 = k1
        self.b = b
        self.doc_len = [len(doc['tokens']) for doc in corpus]
        self.avg_doc_len = sum(self.doc_len) / max(1, len(self.doc_len))
        self.doc_freqs = Counter()
        for doc in corpus:
            unique_tokens = set(doc['tokens'])
            for token in unique_tokens:
                self.doc_freqs[token] += 1
        self.N = len(corpus)
        self.idf = {}
        for token, freq in self.doc_freqs.items():
            self.idf[token] = math.log((self.N - freq + 0.5) / (freq + 0.5) + 1.0)

    def score(self, query_tokens, doc_idx):
        score = 0.0
        doc = self.corpus[doc_idx]
        d_len = self.doc_len[doc_idx]
        tf = Counter(doc['tokens'])
        for q in query_tokens:
            if q not in tf:
                continue
            idf_val = self.idf.get(q, 0.0)
            f = tf[q]
            denom = f + self.k1 * (1.0 - self.b + self.b * (d_len / self.avg_doc_len))
            score += idf_val * (f * (self.k1 + 1.0)) / denom
        return score

    def search(self, query_tokens, top_k=3, exclude_ids=None):
        exclude_ids = exclude_ids or set()
        scores = []
        for i, doc in enumerate(self.corpus):
            if doc['id'] in exclude_ids:
                continue
            s = self.score(query_tokens, i)
            scores.append((s, doc))
        scores.sort(key=lambda x: x[0], reverse=True)
        return scores[:top_k]

class CounterEvidenceRetriever:
    """Targeted counter-evidence retrieval manager."""
    def __init__(self):
        self.chunks = self._load_all_chunks()
        self.bm25 = SimpleBM25(self.chunks)

    def _load_all_chunks(self):
        corpus_dict = {}
        
        # 1. Load from scratch/corpus_dump.json
        c_dump_path = os.path.join(ROOT_DIR, 'scratch', 'corpus_dump.json')
        if os.path.exists(c_dump_path):
            with open(c_dump_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data:
                    cid = item.get('id', f"corpus_{item.get('chunk_index', len(corpus_dict))}")
                    content = item.get('content', '')
                    title = item.get('title', '')
                    corpus_dict[cid] = {
                        'id': cid,
                        'title': title,
                        'content': content,
                        'tokens': self._tokenize(title + " " + content)
                    }

        # 2. Augment from dev cache
        cache_path = os.path.join(ROOT_DIR, 'scratch', 'exp0056_dev_c1_cache.json')
        if os.path.exists(cache_path):
            with open(cache_path, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
                for case_id, case in cache_data.items():
                    for chunk in case.get('top5', []):
                        cid = chunk.get('id', '')
                        if cid and cid not in corpus_dict:
                            content = chunk.get('content', '')
                            title = chunk.get('title', '')
                            corpus_dict[cid] = {
                                'id': cid,
                                'title': title,
                                'content': content,
                                'tokens': self._tokenize(title + " " + content)
                            }

        return list(corpus_dict.values())

    def _tokenize(self, text):
        return [w.lower() for w in re.findall(r'\b[a-zA-Z0-9_\-\.:]+\b', text) if len(w) > 1]

    def formulate_counter_query(self, query):
        """Constructs contrastive and negated keywords targeting potential false assertions."""
        q_tokens = self._tokenize(query)
        q_lower = query.lower()
        
        counter_terms = []
        for term, contrasts in CONTRAST_MAPPINGS.items():
            if re.search(r'\b' + re.escape(term) + r'\b', q_lower):
                counter_terms.extend(contrasts)
                
        # Add general boundary/contrastive terms
        counter_terms.extend(['difference', 'limitation', 'exception', 'contrast', 'not', 'cannot', 'error'])
        
        # Combine original entity nouns with counter terms
        # Retain substantive tokens
        substantive = [w for w in q_tokens if w not in {'why', 'how', 'what', 'does', 'is', 'the', 'a', 'an', 'in', 'on', 'of', 'to'}]
        augmented_query = substantive + counter_terms
        return augmented_query

    def retrieve_counter_evidence(self, query, primary_chunk_ids=None):
        """
        Executes counter-evidence retrieval given query and primary chunk IDs.
        Returns the top counter-chunk, score, and augmented search tokens.
        """
        primary_ids = set(primary_chunk_ids or [])
        counter_tokens = self.formulate_counter_query(query)
        results = self.bm25.search(counter_tokens, top_k=3, exclude_ids=primary_ids)
        
        if not results:
            return None, 0.0, counter_tokens
            
        top_score, top_doc = results[0]
        return top_doc, top_score, counter_tokens

    def synthesize_counter_premise(self, primary_evidence, counter_chunk):
        """
        Synthesizes primary evidence and counter-evidence chunk into an augmented premise.
        """
        if not counter_chunk:
            return primary_evidence
        counter_text = f"\n[Counter-Evidence / Clarification: {counter_chunk.get('title', 'Curriculum')}] {counter_chunk.get('content', '')}"
        return primary_evidence + "\n" + counter_text

_GLOBAL_COUNTER_RETRIEVER = None

def get_counter_evidence_retriever():
    global _GLOBAL_COUNTER_RETRIEVER
    if _GLOBAL_COUNTER_RETRIEVER is None:
        _GLOBAL_COUNTER_RETRIEVER = CounterEvidenceRetriever()
    return _GLOBAL_COUNTER_RETRIEVER
