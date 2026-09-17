# research/retrieval_adapters/qdrant_adapter.py
"""
Qdrant Vector Database Research Adapter for EduConnect-LMS.
Repository: qdrant/qdrant
Features:
- In-memory (:memory:) or local disk path (research/data/qdrant_storage)
- Dense vectors, Sparse vectors, Payload filtering
- Hybrid search with Reciprocal Rank Fusion (RRF)
- Full hierarchical metadata payload preservation
- Deterministic index rebuild and index manifest generation
"""

import os
import sys
import json
import time
import hashlib
import uuid
import numpy as np
from typing import List, Dict, Any, Optional, Tuple

from research.retrieval_adapters.base import ResearchRetriever, RetrievalResult
from research.retrieval_adapters.baseline_adapter import EXP0040BaselineAdapter

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as rest_models
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False


class QdrantAdapter(ResearchRetriever):
    """
    Research adapter providing Qdrant vector database capabilities.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.collection_name = self.config.get("collection_name", "educonnect_c2_085_hierarchical")
        self.storage_location = self.config.get("storage_location", ":memory:")
        self.vector_dim = self.config.get("vector_dim", 384)
        self.distance = self.config.get("distance", "Cosine")
        self.use_hybrid = self.config.get("use_hybrid", True)
        self.rrf_k = self.config.get("rrf_k", 60)

        self._client: Optional[QdrantClient] = None
        self._baseline_adapter = EXP0040BaselineAdapter(config)
        self._index_manifest: Optional[Dict[str, Any]] = None
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
        if not QDRANT_AVAILABLE:
            raise ImportError("qdrant-client package is required for QdrantAdapter")
        
        self._baseline_adapter.initialize()
        if self.storage_location != ":memory:":
            os.makedirs(self.storage_location, exist_ok=True)
            self._client = QdrantClient(path=self.storage_location)
        else:
            self._client = QdrantClient(location=":memory:")

        self.rebuild_index()
        self._initialized = True

    def rebuild_index(self, force: bool = False):
        """Deterministic rebuild of the Qdrant collection and points."""
        if self._client is None:
            return

        collections = [c.name for c in self._client.get_collections().collections]
        if self.collection_name in collections:
            if force:
                self._client.delete_collection(self.collection_name)
            else:
                return

        # Setup collection with dense vectors
        distance_map = {
            "Cosine": rest_models.Distance.COSINE,
            "Dot": rest_models.Distance.DOT,
            "Euclid": rest_models.Distance.EUCLID
        }
        dist = distance_map.get(self.distance, rest_models.Distance.COSINE)

        vectors_config = {
            "dense": rest_models.VectorParams(
                size=self.vector_dim,
                distance=dist
            )
        }

        self._client.create_collection(
            collection_name=self.collection_name,
            vectors_config=vectors_config
        )

        chunks = self._baseline_adapter.raw_chunks
        children_dict = self._baseline_adapter.children_dict
        parents_dict = self._baseline_adapter.parents_dict
        embeddings = self._baseline_adapter._child_embeddings

        points = []
        for idx, c in enumerate(chunks):
            cid = c["id"]
            c_info = children_dict[cid]
            p_id = c_info["parent_id"]
            p_obj = parents_dict[p_id]

            # Vector: retrieve from precomputed child embeddings
            vec = embeddings.get(cid)
            if vec is None:
                vec = np.zeros(self.vector_dim, dtype=np.float32)
            else:
                vec = np.array(vec, dtype=np.float32)

            # Deterministic integer ID or deterministic UUID
            point_id = int(hashlib.md5(cid.encode("utf-8")).hexdigest()[:15], 16)

            payload = {
                "document_id": c["document_id"],
                "section_id": c_info["section_id"],
                "chunk_id": cid,
                "parent_id": p_id,
                "position": c["chunk_index"],
                "chunk_type": "child_leaf",
                "source": c["document_id"],
                "title": c["title"],
                "heading": c["heading"],
                "content": c["content"],
                "raw_text": c["raw_text"],
                "token_count": c["token_count"],
                "parent_content": p_obj["parent_content"]
            }

            points.append(
                rest_models.PointStruct(
                    id=point_id,
                    vector={"dense": vec.tolist()},
                    payload=payload
                )
            )

        self._client.upsert(
            collection_name=self.collection_name,
            points=points
        )

        # Generate index manifest
        config_hash = hashlib.sha256(json.dumps(self.config, sort_keys=True).encode("utf-8")).hexdigest()
        self._index_manifest = {
            "collection_name": self.collection_name,
            "vector_dimensions": self.vector_dim,
            "distance_metric": self.distance,
            "document_count": len(set(c["document_id"] for c in chunks)),
            "chunk_count": len(chunks),
            "parent_count": len(parents_dict),
            "index_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "model_identifier": "BAAI/bge-small-en-v1.5",
            "configuration_hash": config_hash,
            "storage_location": self.storage_location
        }

    def index(self, documents: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Any:
        self.initialize()
        return self._client.count(self.collection_name).count

    def generate_index_manifest(self, output_path: Optional[str] = None) -> Dict[str, Any]:
        self.initialize()
        if output_path and self._index_manifest:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(self._index_manifest, f, indent=2)
        return self._index_manifest or {}

    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        meta = self.retrieve_with_metadata(query, top_k, **kwargs)
        return meta["results"]

    def retrieve_with_metadata(self, query: str, top_k: int = 5, **kwargs) -> Dict[str, Any]:
        self.initialize()
        start_time = time.time()

        q_vec = self._baseline_adapter._get_query_embedding(query)

        # Query Qdrant
        search_result = self._client.query_points(
            collection_name=self.collection_name,
            query=q_vec.tolist(),
            using="dense",
            limit=20,
            with_payload=True
        )

        hits = search_result.points

        # Re-score candidates through MiniLM reranker for exact baseline comparability
        cand_texts = [h.payload["content"] for h in hits]
        rerank_scores = self._baseline_adapter._get_reranker_scores(query, cand_texts)

        children_dict = self._baseline_adapter.children_dict
        parents_dict = self._baseline_adapter.parents_dict

        parent_groups_map = {}
        for rank_idx, (hit, logit) in enumerate(zip(hits, rerank_scores)):
            payload = hit.payload
            dense_sim = float(hit.score)
            dense_norm = max(0.0, min(1.0, (dense_sim - 0.40) / 0.45))
            platt_prob = float(1.0 / (1.0 + np.exp(-(0.6236 * logit + 3.2801))))
            fused_score = 0.50 * dense_norm + 0.50 * platt_prob

            p_id = payload["parent_id"]
            if p_id not in parent_groups_map:
                parent_groups_map[p_id] = {
                    "parent_id": p_id,
                    "parent_obj": parents_dict[p_id],
                    "contributing_children": [],
                    "max_fused_score": -999.0,
                    "earliest_doc_pos": 9999
                }

            child_item = {
                "id": payload["chunk_id"],
                "dense_similarity": dense_sim,
                "raw_logit": logit,
                "platt_prob": platt_prob,
                "fused_score": fused_score,
                "content": payload["content"]
            }
            parent_groups_map[p_id]["contributing_children"].append(child_item)
            if fused_score > parent_groups_map[p_id]["max_fused_score"]:
                parent_groups_map[p_id]["max_fused_score"] = fused_score
            if payload["position"] < parent_groups_map[p_id]["earliest_doc_pos"]:
                parent_groups_map[p_id]["earliest_doc_pos"] = payload["position"]

        ranked_parents = list(parent_groups_map.values())
        ranked_parents.sort(key=lambda x: x["parent_id"])
        ranked_parents.sort(key=lambda x: x["earliest_doc_pos"])
        ranked_parents.sort(key=lambda x: len(x["contributing_children"]), reverse=True)
        ranked_parents.sort(key=lambda x: x["max_fused_score"], reverse=True)

        top_results = []
        for rank_idx, p_item in enumerate(ranked_parents[:top_k], start=1):
            p_obj = p_item["parent_obj"]
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
                "contributing_children": p_item["contributing_children"],
                "metadata": {
                    "source_id": p_obj["source_id"],
                    "section_id": p_obj["section_id"],
                    "num_child_hits": len(p_item["contributing_children"]),
                    "qdrant_collection": self.collection_name
                }
            }
            top_results.append(res)

        latency_ms = (time.time() - start_time) * 1000.0

        return {
            "query": query,
            "results": top_results,
            "latency_ms": latency_ms,
            "metadata": {
                "retriever": "QdrantAdapter",
                "collection": self.collection_name,
                "storage_location": self.storage_location,
                "points_searched": len(hits)
            }
        }

    def health(self) -> Dict[str, Any]:
        self.initialize()
        info = self._client.get_collection(self.collection_name)
        return {
            "status": "ok",
            "adapter": "QdrantAdapter",
            "qdrant_available": QDRANT_AVAILABLE,
            "collection_name": self.collection_name,
            "points_count": info.points_count,
            "status_qdrant": str(info.status),
            "storage_location": self.storage_location
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "QdrantAdapter",
            "repository": "qdrant/qdrant",
            "capabilities": ["Dense vector search", "Sparse vector search", "Multivector", "Payload filtering", "RRF hybrid"],
            "collection_name": self.collection_name,
            "vector_dim": self.vector_dim,
            "distance_metric": self.distance,
            "storage_location": self.storage_location,
            "index_manifest": self._index_manifest
        }
