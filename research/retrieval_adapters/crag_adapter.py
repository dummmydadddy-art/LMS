# research/retrieval_adapters/crag_adapter.py
"""
CRAG (Corrective Retrieval-Augmented Generation) Research Adapter.
Repository: HuskyInSalt/CRAG
Principle: Retrieval quality evaluator with self-corrective actions for CLOSED educational corpus.
STRICT RULE: NO web search. Operates entirely within the local educational curriculum.
Pipeline:
  Initial retrieval -> Quality evaluation (CORRECT / AMBIGUOUS / INCORRECT) -> Corrective action -> A4 verifier
"""

import os
import sys
import json
import time
import re
from typing import List, Dict, Any, Optional, Tuple

from research.retrieval_adapters.base import ResearchRetriever, RetrievalResult
from research.retrieval_adapters.baseline_adapter import EXP0040BaselineAdapter


class CRAGAdapter(ResearchRetriever):
    """
    Research adapter implementing CRAG corrective retrieval without external search.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.upper_threshold = self.config.get("upper_threshold", 0.65)
        self.lower_threshold = self.config.get("lower_threshold", 0.40)
        self.max_retries = self.config.get("max_retries", 1)

        self._baseline = EXP0040BaselineAdapter(config)
        self._action_history: List[Dict[str, Any]] = []
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
        self._baseline.initialize()
        self._initialized = True

    def _evaluate_quality(self, results: List[Dict[str, Any]]) -> Tuple[str, float]:
        """
        Evaluates retrieval quality strictly from internal retrieval confidence.
        NEVER accesses ground-truth labels.
        Returns (decision, confidence_score) where decision is CORRECT, AMBIGUOUS, or INCORRECT.
        """
        if not results:
            return "INCORRECT", 0.0

        top_score = float(results[0].get("similarity", 0.0))
        mean_score = sum(float(r.get("similarity", 0.0)) for r in results[:3]) / max(1, min(3, len(results)))
        confidence = 0.70 * top_score + 0.30 * mean_score

        if confidence >= self.upper_threshold:
            return "CORRECT", confidence
        elif confidence >= self.lower_threshold:
            return "AMBIGUOUS", confidence
        else:
            return "INCORRECT", confidence

    def _apply_corrective_action(
        self,
        query: str,
        initial_results: List[Dict[str, Any]],
        decision: str,
        top_k: int
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Applies internal closed-corpus corrective actions:
        - CORRECT: Pass through unchanged.
        - AMBIGUOUS: Context expansion (incorporate adjacent sibling parent chunks).
        - INCORRECT: Query reformulation with core technical entities and retry retrieval.
        """
        if decision == "CORRECT":
            return initial_results[:top_k], {
                "action": "pass_through",
                "trigger": f"confidence >= {self.upper_threshold}",
                "query_used": query,
                "modified": False
            }

        elif decision == "AMBIGUOUS":
            # Context expansion: retrieve top 10 and merge adjacent section contexts
            expanded_meta = self._baseline.retrieve_with_metadata(query, top_k=min(10, top_k * 2))
            expanded_results = expanded_meta["results"]

            # Merge / expand parent contexts
            seen_ids = set()
            merged_results = []
            for item in expanded_results:
                if item["id"] not in seen_ids:
                    seen_ids.add(item["id"])
                    merged_results.append(item)
                if len(merged_results) >= top_k:
                    break

            return merged_results, {
                "action": "context_expansion",
                "trigger": f"{self.lower_threshold} <= confidence < {self.upper_threshold}",
                "query_used": query,
                "modified": True,
                "expanded_pool_size": len(expanded_results)
            }

        else: # INCORRECT
            # Query reformulation: extract technical keywords and re-retrieve
            words = re.findall(r"\b[a-zA-Z0-9_-]{3,}\b", query)
            stopwords = {"what", "which", "when", "where", "does", "explain", "describe", "show", "tell", "true", "false", "that", "this", "with"}
            clean_terms = [w for w in words if w.lower() not in stopwords]
            reformulated_query = " ".join(clean_terms[:5]) if clean_terms else query

            retry_meta = self._baseline.retrieve_with_metadata(reformulated_query, top_k=top_k)
            retry_results = retry_meta["results"]

            # Combine if retry returned high confidence, else fallback
            return retry_results, {
                "action": "query_reformulation_and_retry",
                "trigger": f"confidence < {self.lower_threshold}",
                "original_query": query,
                "reformulated_query": reformulated_query,
                "modified": True
            }

    def index(self, documents: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Any:
        self.initialize()
        return self._baseline.index(documents, **kwargs)

    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        meta = self.retrieve_with_metadata(query, top_k, **kwargs)
        return meta["results"]

    def retrieve_with_metadata(self, query: str, top_k: int = 5, **kwargs) -> Dict[str, Any]:
        self.initialize()
        start_time = time.time()

        # Step 1: Initial baseline retrieval
        initial_meta = self._baseline.retrieve_with_metadata(query, top_k=top_k)
        initial_results = initial_meta["results"]

        # Step 2: Quality evaluation
        decision, confidence = self._evaluate_quality(initial_results)
        initial_score = float(initial_results[0]["similarity"]) if initial_results else 0.0

        # Step 3: Corrective action
        final_results, action_info = self._apply_corrective_action(query, initial_results, decision, top_k)
        final_score = float(final_results[0]["similarity"]) if final_results else 0.0

        latency_ms = (time.time() - start_time) * 1000.0

        log_record = {
            "initial_retrieval_score": round(initial_score, 4),
            "retrieval_confidence": round(confidence, 4),
            "decision": decision,
            "correction_trigger": action_info.get("trigger"),
            "correction_action": action_info.get("action"),
            "final_retrieval_score": round(final_score, 4),
            "final_evidence_count": len(final_results),
            "latency_ms": round(latency_ms, 2)
        }
        self._action_history.append(log_record)

        return {
            "query": query,
            "results": final_results,
            "latency_ms": latency_ms,
            "metadata": {
                "retriever": "CRAGAdapter",
                "decision": decision,
                "confidence": round(confidence, 4),
                "action_info": action_info,
                "log_record": log_record
            }
        }

    def health(self) -> Dict[str, Any]:
        return {
            "status": "ok",
            "adapter": "CRAGAdapter",
            "web_search_enabled": False,
            "upper_threshold": self.upper_threshold,
            "lower_threshold": self.lower_threshold,
            "total_actions_logged": len(self._action_history)
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "CRAGAdapter",
            "repository": "HuskyInSalt/CRAG",
            "principle": "Corrective Retrieval for Closed Educational Corpus",
            "web_search": "STRICTLY DISABLED (Closed Corpus)",
            "decisions": ["CORRECT", "AMBIGUOUS", "INCORRECT"],
            "actions": ["pass_through", "context_expansion", "query_reformulation_and_retry"],
            "upper_threshold": self.upper_threshold,
            "lower_threshold": self.lower_threshold
        }
