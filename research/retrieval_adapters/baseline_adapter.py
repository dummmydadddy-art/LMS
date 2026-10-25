# research/retrieval_adapters/baseline_adapter.py
"""
EXP-0040 Adopted Baseline Adapter: Small-to-Big Hierarchical Parent-Child Retrieval.
Corpus: C2_ChonkieSemantic_085 (76 chunks -> 36 bounded parent groups)
Embedding: BAAI/bge-small-en-v1.5 (384-dim)
Reranker: cross-encoder/ms-marco-MiniLM-L-6-v2
Score Fusion: M2 (0.50 * dense_norm + 0.50 * platt_prob)
"""

import os
import sys
import json
import sqlite3
import math
import struct
import urllib.request
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

from research.retrieval_adapters.base import ResearchRetriever, RetrievalResult


def normalize_dense(sim: float) -> float:
    val = (sim - 0.4000) / 0.4500
    return max(0.0, min(1.0, val))


def platt_probability(x: float) -> float:
    return float(1.0 / (1.0 + np.exp(-(0.6236 * x + 3.2801))))


class EXP0040BaselineAdapter(ResearchRetriever):
    """
    FROZEN Baseline Adapter implementing the adopted EXP-0040 hierarchical retrieval.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.bridge_url = self.config.get("bridge_url", "http://127.0.0.1:8100")
        self.db_path = self.config.get("db_path", "database/rag_materials.sqlite3")
        self.table_name = self.config.get("table_name", "C2_ChonkieSemantic_085")
        self.dense_pool_size = self.config.get("dense_pool_size", 20)
        self.max_parent_tokens = self.config.get("max_parent_tokens", 512)

        self.parents: List[Dict[str, Any]] = []
        self.parents_dict: Dict[str, Dict[str, Any]] = {}
        self.children_dict: Dict[str, Dict[str, Any]] = {}
        self.raw_chunks: List[Dict[str, Any]] = []
        self._child_embeddings: Dict[str, np.ndarray] = {}

        self._initialized = False
        self._st_model = None
        self._reranker_model = None

    def initialize(self):
        if self._initialized:
            return
        self.index()
        self._initialized = True

    def index(self, documents: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Any:
        """
        Builds the frozen EXP-0040 small-to-big hierarchy from C2_085 chunks.
        """
        if not os.path.exists(self.db_path):
            raise FileNotFoundError(f"Corpus database {self.db_path} not found")

        con = sqlite3.connect(self.db_path)
        cur = con.cursor()
        cur.execute(f"""
            SELECT document_id, title, heading, chunk_index, token_count, id, content, raw_text, embedding 
            FROM {self.table_name} 
            ORDER BY document_id, chunk_index
        """)
        rows = cur.fetchall()
        con.close()

        self.raw_chunks = []
        sections = defaultdict(list)
        for r in rows:
            doc_id, title, heading, chunk_idx, tok_cnt, cid, content, raw_text, emb_blob = r
            item = {
                "document_id": doc_id,
                "title": title,
                "heading": heading,
                "chunk_index": chunk_idx,
                "token_count": tok_cnt,
                "id": cid,
                "content": content,
                "raw_text": raw_text
            }
            self.raw_chunks.append(item)
            sections[(doc_id, title, heading)].append(item)

            if emb_blob:
                try:
                    num_floats = len(emb_blob) // 4
                    vec = np.array(struct.unpack(f"{num_floats}f", emb_blob), dtype=np.float32)
                    norm = np.linalg.norm(vec)
                    if norm > 0:
                        vec = vec / norm
                    self._child_embeddings[cid] = vec
                except Exception:
                    pass

        # Partition into bounded parent groups (max 3 contiguous chunks within same section)
        self.parents = []
        self.children_dict = {}
        sec_counter = 0

        for (doc_id, doc_title, sec_heading), s_chunks in sections.items():
            sec_counter += 1
            sec_id = f"SEC_{doc_id[:8]}_{sec_counter:02d}"

            for p_idx, i in enumerate(range(0, len(s_chunks), 3)):
                group = s_chunks[i:i+3]
                parent_id = f"PARENT_{doc_id[:8]}_{sec_counter:02d}_{p_idx:02d}"
                child_ids = [c["id"] for c in group]

                content_lines = []
                for c_pos, c in enumerate(group):
                    c_raw = c["raw_text"].strip()
                    if c_pos == 0 and not c_raw.upper().startswith(sec_heading.upper()):
                        c_raw = f"{sec_heading}:\n{c_raw}"
                    content_lines.append(c_raw)
                parent_content = "\n\n".join(content_lines)

                # Estimated or counted token length
                est_tokens = sum(c["token_count"] for c in group)

                p_entry = {
                    "parent_id": parent_id,
                    "source_id": doc_id,
                    "document_title": doc_title,
                    "section_heading": sec_heading,
                    "section_id": sec_id,
                    "child_ids": child_ids,
                    "parent_content": parent_content,
                    "parent_token_count": est_tokens
                }
                self.parents.append(p_entry)
                self.parents_dict[parent_id] = p_entry

                for pos, c in enumerate(group):
                    self.children_dict[c["id"]] = {
                        "child_id": c["id"],
                        "parent_id": parent_id,
                        "source_id": doc_id,
                        "section_id": sec_id,
                        "position_in_parent": pos,
                        "position_in_document": c["chunk_index"],
                        "token_count": c["token_count"],
                        "raw_chunk": c
                    }

        self.validate_hierarchical_invariants()
        return len(self.parents)

    def _get_query_embedding(self, query: str) -> np.ndarray:
        # 1. Try Bridge
        try:
            url = f"{self.bridge_url}/embed"
            payload = json.dumps({"texts": [query], "normalize": True, "model": "BAAI/bge-small-en-v1.5"}).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                vec = np.array(data["vectors"][0], dtype=np.float32)
                return vec / (np.linalg.norm(vec) + 1e-9)
        except Exception:
            pass

        # 2. Local fallback
        if self._st_model is None:
            from sentence_transformers import SentenceTransformer
            self._st_model = SentenceTransformer("BAAI/bge-small-en-v1.5", device=self.device)
        vec = self._st_model.encode([query], normalize_embeddings=True)[0]
        return np.array(vec, dtype=np.float32)

    def _get_reranker_scores(self, query: str, candidate_docs: List[str]) -> List[float]:
        # 1. Try Bridge
        try:
            url = f"{self.bridge_url}/rerank"
            payload = json.dumps({
                "query": query,
                "documents": candidate_docs,
                "top_n": len(candidate_docs),
                "model": "cross-encoder/ms-marco-MiniLM-L-6-v2"
            }).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                results = data.get("results", [])
                doc_to_score = {r["index"]: r["score"] for r in results}
                return [doc_to_score.get(i, 0.0) for i in range(len(candidate_docs))]
        except Exception:
            pass

        # 2. Local fallback
        if self._reranker_model is None:
            from sentence_transformers import CrossEncoder
            self._reranker_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", device="cpu")
        pairs = [[query, doc] for doc in candidate_docs]
        scores = self._reranker_model.predict(pairs)
        return [float(s) for s in scores]

    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        meta = self.retrieve_with_metadata(query, top_k, **kwargs)
        return meta["results"]

    def retrieve_with_metadata(self, query: str, top_k: int = 5, **kwargs) -> Dict[str, Any]:
        self.initialize()
        start_time = np.datetime64('now')

        q_vec = self._get_query_embedding(query)

        # Step 1: Dense similarity over all 76 child chunks
        child_similarities = []
        for c in self.raw_chunks:
            cid = c["id"]
            if cid in self._child_embeddings:
                c_vec = self._child_embeddings[cid]
                sim = float(np.dot(q_vec, c_vec))
            else:
                sim = 0.0
            child_similarities.append((c, sim))

        child_similarities.sort(key=lambda x: x[1], reverse=True)
        pool = child_similarities[:self.dense_pool_size]

        # Step 2: Cross-encoder reranking over candidate pool
        pool_docs = [c[0]["content"] for c in pool]
        rerank_logits = self._get_reranker_scores(query, pool_docs)

        # Step 3: M2 Score Fusion
        cand_scored = []
        for rank_idx, ((c, dense_sim), logit) in enumerate(zip(pool, rerank_logits)):
            dense_norm = normalize_dense(dense_sim)
            platt_prob = platt_probability(logit)
            s_fused = (0.50 * dense_norm) + (0.50 * platt_prob)

            cand_scored.append({
                "id": c["id"],
                "chunk_id": c["id"],
                "dense_similarity": dense_sim,
                "dense_rank": rank_idx + 1,
                "raw_logit": logit,
                "platt_prob": platt_prob,
                "fused_score": s_fused,
                "similarity": round(s_fused, 4),
                "title": c["title"],
                "heading": c["heading"],
                "content": c["content"]
            })

        # Step 4: Group candidates by parent_id
        parent_groups_map: Dict[str, Dict[str, Any]] = {}
        for c in cand_scored:
            c_info = self.children_dict[c["id"]]
            p_id = c_info["parent_id"]

            if p_id not in parent_groups_map:
                parent_groups_map[p_id] = {
                    "parent_id": p_id,
                    "parent_obj": self.parents_dict[p_id],
                    "contributing_children": [],
                    "max_fused_score": -1.0,
                    "earliest_doc_pos": 9999
                }

            parent_groups_map[p_id]["contributing_children"].append(c)
            if c["fused_score"] > parent_groups_map[p_id]["max_fused_score"]:
                parent_groups_map[p_id]["max_fused_score"] = c["fused_score"]
            if c_info["position_in_document"] < parent_groups_map[p_id]["earliest_doc_pos"]:
                parent_groups_map[p_id]["earliest_doc_pos"] = c_info["position_in_document"]

        # Step 5: Deterministic Parent Ranking
        ranked_parents = list(parent_groups_map.values())
        ranked_parents.sort(key=lambda x: x["parent_id"])
        ranked_parents.sort(key=lambda x: x["earliest_doc_pos"])
        ranked_parents.sort(key=lambda x: len(x["contributing_children"]), reverse=True)
        ranked_parents.sort(key=lambda x: x["max_fused_score"], reverse=True)

        # Step 6: Assemble final top_k parent context results
        top_results = []
        for rank_idx, p_item in enumerate(ranked_parents[:top_k], start=1):
            p_obj = p_item["parent_obj"]
            contributing = p_item["contributing_children"]

            child_evidence = []
            for ch in contributing:
                ch_info = self.children_dict[ch["id"]]
                child_evidence.append({
                    "child_id": ch["id"],
                    "dense_similarity": round(float(ch["dense_similarity"]), 4),
                    "dense_rank": ch["dense_rank"],
                    "raw_logit": round(float(ch["raw_logit"]), 4),
                    "platt_prob": round(float(ch["platt_prob"]), 4),
                    "fused_score": round(float(ch["fused_score"]), 4),
                    "position_in_parent": ch_info["position_in_parent"],
                    "position_in_document": ch_info["position_in_document"]
                })

            res = {
                "rank": rank_idx,
                "id": p_item["parent_id"],
                "chunk_id": p_item["parent_id"],
                "parent_id": p_item["parent_id"],
                "title": p_obj["document_title"],
                "heading": p_obj["section_heading"],
                "content": p_obj["parent_content"],
                "similarity": round(float(p_item["max_fused_score"]), 4),
                "fused_score": round(float(p_item["max_fused_score"]), 4),
                "contributing_children": child_evidence,
                "metadata": {
                    "source_id": p_obj["source_id"],
                    "section_id": p_obj["section_id"],
                    "num_child_hits": len(contributing),
                    "total_parent_children": len(p_obj["child_ids"]),
                    "parent_token_count": p_obj["parent_token_count"]
                }
            }
            top_results.append(res)

        end_time = np.datetime64('now')
        latency_ms = float((end_time - start_time) / np.timedelta64(1, 'ms'))

        return {
            "query": query,
            "results": top_results,
            "latency_ms": latency_ms,
            "metadata": {
                "retriever": "EXP0040BaselineAdapter",
                "pool_size": len(pool),
                "unique_parents_in_pool": len(parent_groups_map),
                "device": self.device,
                "status": "ok"
            }
        }

    def health(self) -> Dict[str, Any]:
        return {
            "status": "ok",
            "adapter": "EXP0040BaselineAdapter",
            "device": self.device,
            "corpus_chunks": len(self.raw_chunks) or 76,
            "parent_groups": len(self.parents) or 36,
            "bridge_url": self.bridge_url,
            "db_path": self.db_path
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "EXP0040BaselineAdapter",
            "experiment": "EXP-0040",
            "architecture": "Small-to-big hierarchical parent-child retrieval",
            "embedding_model": "BAAI/bge-small-en-v1.5",
            "embedding_dim": 384,
            "reranker_model": "cross-encoder/ms-marco-MiniLM-L-6-v2",
            "fusion_formula": "0.50 * dense_norm + 0.50 * platt_prob",
            "parent_window": 1,
            "max_parent_chunks": 3,
            "max_parent_tokens": 512,
            "frozen": True
        }
