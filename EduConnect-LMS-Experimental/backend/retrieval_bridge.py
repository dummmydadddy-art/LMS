#!/usr/bin/env python3
"""
EXP-0032: Lightweight Local Python Retrieval Bridge
Provides local, offline HTTP endpoints for embedding and cross-encoder reranking.
Models:
  - BAAI/bge-small-en-v1.5 (Primary embedding, 384-dim)
  - intfloat/e5-small-v2 (Secondary embedding, 384-dim, prefixed)
  - cross-encoder/ms-marco-MiniLM-L-6-v2 (Primary reranker, lazy loaded)
Hardware Target: RTX 3050 Laptop / Intel i5-12450H / 16 GB RAM
"""

import os
import sys

# Prevent OpenMP / MKL DLL collision access violation on Windows
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Safe import ordering to prevent Windows runtime collision
try:
    import pyarrow
    import pyarrow.dataset
except ImportError:
    pass

import json
import time
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
import torch

# Global model state
_MODELS = {
    "bge": None,
    "e5": None,
    "minilm": None
}

_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
_CUDA_AVAILABLE = torch.cuda.is_available()


def get_embedding_model(model_name: str = "BAAI/bge-small-en-v1.5"):
    """Load or retrieve cached embedding model."""
    global _MODELS
    if "e5" in model_name.lower():
        if _MODELS["e5"] is None:
            from sentence_transformers import SentenceTransformer
            print(f"[Bridge] Loading e5 model '{model_name}' on {_DEVICE}...", flush=True)
            _MODELS["e5"] = SentenceTransformer(model_name, device=_DEVICE)
        return _MODELS["e5"], "intfloat/e5-small-v2", 384
    else:
        if _MODELS["bge"] is None:
            from sentence_transformers import SentenceTransformer
            print(f"[Bridge] Loading BGE model '{model_name}' on {_DEVICE}...", flush=True)
            _MODELS["bge"] = SentenceTransformer(model_name, device=_DEVICE)
        return _MODELS["bge"], "BAAI/bge-small-en-v1.5", 384


def get_reranker_model(model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
    """Lazy-load or retrieve cached cross-encoder reranker on CPU."""
    global _MODELS
    if _MODELS["minilm"] is None:
        from sentence_transformers import CrossEncoder
        print(f"[Bridge] Lazy-loading reranker '{model_name}' on CPU...", flush=True)
        # Always run reranker on CPU per hardware constraint
        _MODELS["minilm"] = CrossEncoder(model_name, device="cpu")
    return _MODELS["minilm"], "cross-encoder/ms-marco-MiniLM-L-6-v2"


class RetrievalRequestHandler(BaseHTTPRequestHandler):
    """Lightweight HTTP Request Handler for EXP-0032 Bridge."""

    def _send_json(self, status_code: int, data: dict):
        response_bytes = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {
                "status": "ok",
                "embedding_loaded": (_MODELS["bge"] is not None or _MODELS["e5"] is not None),
                "reranker_loaded": (_MODELS["minilm"] is not None),
                "device": _DEVICE,
                "cuda_available": _CUDA_AVAILABLE
            })
        elif self.path == "/models":
            self._send_json(200, {
                "loaded": {
                    "bge_small": _MODELS["bge"] is not None,
                    "e5_small": _MODELS["e5"] is not None,
                    "minilm_reranker": _MODELS["minilm"] is not None
                },
                "supported": {
                    "embedding": ["BAAI/bge-small-en-v1.5", "intfloat/e5-small-v2"],
                    "reranker": ["cross-encoder/ms-marco-MiniLM-L-6-v2"]
                }
            })
        else:
            self._send_json(404, {"error": f"Endpoint not found: {self.path}"})

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self._send_json(400, {"error": "Empty request body"})
            return

        raw_body = self.rfile.read(content_length)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception as e:
            self._send_json(400, {"error": f"Invalid JSON body: {str(e)}"})
            return

        if self.path == "/embed":
            self.handle_embed(payload)
        elif self.path == "/rerank":
            self.handle_rerank(payload)
        else:
            self._send_json(404, {"error": f"Endpoint not found: {self.path}"})

    def handle_embed(self, payload: dict):
        """Handle POST /embed endpoint."""
        texts = payload.get("texts", [])
        if not isinstance(texts, list) or len(texts) == 0:
            self._send_json(400, {"error": "'texts' must be a non-empty list of strings"})
            return

        normalize = payload.get("normalize", True)
        requested_model = payload.get("model", "BAAI/bge-small-en-v1.5")

        try:
            t0 = time.perf_counter()
            model, model_id, dim = get_embedding_model(requested_model)
            
            # Encode texts
            vectors = model.encode(texts, normalize_embeddings=normalize, batch_size=32)
            latency_ms = (time.perf_counter() - t0) * 1000

            # Convert numpy array to list of lists of floats
            vector_list = [v.tolist() for v in vectors]

            self._send_json(200, {
                "model": model_id,
                "dimension": dim,
                "count": len(vector_list),
                "latency_ms": round(latency_ms, 2),
                "vectors": vector_list
            })
        except Exception as e:
            self._send_json(500, {"error": f"Embedding failed: {str(e)}"})

    def handle_rerank(self, payload: dict):
        """Handle POST /rerank endpoint."""
        query = payload.get("query", "")
        documents = payload.get("documents", [])
        top_n = payload.get("top_n", 5)
        requested_model = payload.get("model", "cross-encoder/ms-marco-MiniLM-L-6-v2")

        if not query or not isinstance(documents, list) or len(documents) == 0:
            self._send_json(400, {"error": "'query' string and non-empty 'documents' list are required"})
            return

        try:
            t0 = time.perf_counter()
            reranker, model_id = get_reranker_model(requested_model)

            # Build pairs: [[query, doc['text']], ...]
            pairs = []
            doc_ids = []
            for doc in documents:
                doc_id = doc.get("id", "")
                text = doc.get("text", "")
                pairs.append([query, text])
                doc_ids.append(doc_id)

            # Predict cross-encoder relevance scores
            scores = reranker.predict(pairs)
            latency_ms = (time.perf_counter() - t0) * 1000

            # Format and rank results
            scored_results = []
            for idx, (doc_id, score) in enumerate(zip(doc_ids, scores)):
                scored_results.append({
                    "id": doc_id,
                    "score": round(float(score), 6),
                    "original_index": idx
                })

            # Sort descending by score
            scored_results.sort(key=lambda x: x["score"], reverse=True)

            # Assign 1-based ranks and take top_n
            final_results = []
            for rank, item in enumerate(scored_results[:top_n], start=1):
                final_results.append({
                    "id": item["id"],
                    "score": item["score"],
                    "rank": rank
                })

            self._send_json(200, {
                "model": model_id,
                "query": query,
                "candidate_count": len(documents),
                "latency_ms": round(latency_ms, 2),
                "results": final_results
            })
        except Exception as e:
            self._send_json(500, {"error": f"Reranking failed: {str(e)}"})

    def log_message(self, format, *args):
        """Custom concise logging."""
        sys.stderr.write(f"[Bridge {time.strftime('%H:%M:%S')}] {format % args}\n")


def run_server(host: str = "127.0.0.1", port: int = 8100, preload_embedding: bool = True):
    """Start local HTTP server."""
    if preload_embedding:
        # Preload default embedding model during server startup
        get_embedding_model("BAAI/bge-small-en-v1.5")

    server_address = (host, port)
    httpd = HTTPServer(server_address, RetrievalRequestHandler)
    print(f"[Bridge] Server listening on http://{host}:{port}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Bridge] Shutting down server...", flush=True)
    finally:
        httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EXP-0032 Retrieval Bridge Server")
    parser.add_argument("--host", default="127.0.0.1", help="Binding host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8100, help="Port (default: 8100)")
    parser.add_argument("--no-preload", action="store_true", help="Do not preload embedding model")
    args = parser.parse_args()

    run_server(host=args.host, port=args.port, preload_embedding=not args.no_preload)
