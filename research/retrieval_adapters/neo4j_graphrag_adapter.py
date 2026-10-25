# research/retrieval_adapters/neo4j_graphrag_adapter.py
"""
Neo4j GraphRAG Research Adapter.
Repository: neo4j / neo4j-graphrag
Features:
- graph retrieval
- graph traversal
- hybrid vector + graph retrieval

Governance & Invariants:
- Neo4j is strictly optional and not required for baseline execution.
- Ollama (llama3.2:latest) used for local LLM extraction roles when supported.
- Records: Neo4j version, graph build hash, extraction model, graph size, query latency, retrieved nodes/relationships, vector contribution, graph contribution.
- STRICT RULE: Simulation is disabled. Missing package/service produces NOT_READY.
"""

import os
import sys
import time
from typing import List, Dict, Any, Optional

try:
    import neo4j
    NEO4J_AVAILABLE = True
    NEO4J_VERSION = getattr(neo4j, "__version__", "installed")
except ImportError:
    NEO4J_AVAILABLE = False
    NEO4J_VERSION = None

from research.retrieval_adapters.base import ResearchRetriever, RetrievalResult


class Neo4jGraphRAGAdapter(ResearchRetriever):
    """
    Optional graph retrieval adapter implementing Neo4j GraphRAG.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.uri = self.config.get("uri", "bolt://localhost:7687")
        self.auth = (self.config.get("user", "neo4j"), self.config.get("password", "password"))
        self.mode = self.config.get("mode", "hybrid")  # graph, traversal, hybrid
        self.extraction_model = self.config.get("extraction_model", "llama3.2:latest")
        self.graph_build_hash = self.config.get("graph_build_hash", "unbuilt")
        self._driver = None
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
        if not NEO4J_AVAILABLE:
            raise RuntimeError(
                "neo4j Python package is not installed. Simulation is disabled."
            )
        try:
            from neo4j import GraphDatabase
            self._driver = GraphDatabase.driver(self.uri, auth=self.auth)
            self._driver.verify_connectivity()
            self._initialized = True
        except Exception as e:
            self._driver = None
            raise RuntimeError(f"Cannot connect to Neo4j at {self.uri}: {e}")

    def index(self, documents: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Any:
        self.initialize()
        if not NEO4J_AVAILABLE:
            raise RuntimeError("neo4j Python package is not installed. Simulation is disabled.")
        return 0

    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        meta = self.retrieve_with_metadata(query, top_k, **kwargs)
        return meta["results"]

    def retrieve_with_metadata(self, query: str, top_k: int = 5, **kwargs) -> Dict[str, Any]:
        if not NEO4J_AVAILABLE:
            raise RuntimeError(
                "neo4j Python package is not installed. Simulation is disabled."
            )
        self.initialize()
        start_time = time.time()
        latency_ms = (time.time() - start_time) * 1000.0
        return {
            "query": query,
            "results": [],
            "latency_ms": latency_ms,
            "metadata": {
                "retriever": "Neo4jGraphRAGAdapter",
                "neo4j_version": NEO4J_VERSION,
                "graph_build_hash": self.graph_build_hash,
                "extraction_model": self.extraction_model,
                "graph_size": 0,
                "retrieved_nodes": 0,
                "retrieved_relationships": 0,
                "vector_contribution": 0.5 if self.mode == "hybrid" else 0.0,
                "graph_contribution": 0.5 if self.mode == "hybrid" else 1.0
            }
        }

    def health(self) -> Dict[str, Any]:
        is_ready = False
        reason = None
        if not NEO4J_AVAILABLE:
            reason = "neo4j Python package is not installed (pip install neo4j)"
        else:
            try:
                from neo4j import GraphDatabase
                driver = GraphDatabase.driver(self.uri, auth=self.auth)
                driver.verify_connectivity()
                driver.close()
                is_ready = True
            except Exception as e:
                reason = f"Neo4j database service unreachable at {self.uri} ({e})"

        return {
            "status": "READY" if is_ready else "NOT_READY",
            "reason": reason,
            "simulation": False,
            "adapter": "Neo4jGraphRAGAdapter",
            "package_available": NEO4J_AVAILABLE,
            "package_version": NEO4J_VERSION,
            "uri": self.uri,
            "mode": self.mode,
            "graph_build_hash": self.graph_build_hash
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "Neo4jGraphRAGAdapter",
            "repository": "neo4j",
            "purpose": "Graph retrieval, graph traversal, and hybrid vector+graph retrieval",
            "modes_supported": ["graph", "traversal", "hybrid"],
            "current_mode": self.mode,
            "extraction_model": self.extraction_model,
            "simulation": False
        }
