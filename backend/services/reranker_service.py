#!/usr/bin/env python3
"""
EduConnect LMS - Neural Cross-Encoder Reranker Microservice (Milestone 1 / R1)
Port: 8100
Model: cross-encoder/ms-marco-MiniLM-L-6-v2 (CPU-only, 0 MB VRAM)
"""

import os
import sys

# Prevent OpenMP / MKL DLL collision and tokenizer deadlock on Windows
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import time
from typing import List, Union, Optional
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"
DEVICE = "cpu"

# Global model state
tokenizer = None
model = None


def init_model():
    global tokenizer, model
    if model is None:
        print(f"[Reranker] Loading model '{MODEL_NAME}' on {DEVICE}...", flush=True)
        t0 = time.perf_counter()
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
        model.to(DEVICE)
        model.eval()

        # Warmup single inference
        warmup_inputs = tokenizer(
            [["query warmup", "passage warmup"]],
            padding=True,
            truncation=True,
            return_tensors="pt"
        )
        with torch.no_grad():
            _ = model(**warmup_inputs).logits

        t_load = (time.perf_counter() - t0) * 1000
        print(f"[Reranker] Loaded and warmed up in {t_load:.1f}ms on {DEVICE}.", flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_model()
    yield


app = FastAPI(
    title="EduConnect LMS Reranker Service",
    description="Cross-Encoder Reranker Microservice for RAG Pipeline (R1)",
    version="1.0.0",
    lifespan=lifespan
)


class PassageItem(BaseModel):
    id: Union[int, str]
    text: Optional[str] = None
    content: Optional[str] = None


class RerankRequest(BaseModel):
    query: str
    passages: Optional[List[PassageItem]] = None
    documents: Optional[List[PassageItem]] = None
    top_n: Optional[int] = None


class RerankResultItem(BaseModel):
    id: Union[int, str]
    score: float
    logit: Optional[float] = None
    rank: Optional[int] = None


class RerankResponse(BaseModel):
    results: List[RerankResultItem]
    model: str = MODEL_NAME
    took_ms: Optional[float] = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": DEVICE,
        "loaded": model is not None,
        "vram_mb": 0.0
    }


@app.post("/rerank", response_model=RerankResponse)
def rerank(req: RerankRequest):
    t_start = time.perf_counter()

    items = req.passages if req.passages is not None else req.documents
    if not items:
        return RerankResponse(results=[], model=MODEL_NAME, took_ms=0.0)

    if model is None or tokenizer is None:
        init_model()

    query = req.query.strip()
    pairs = []
    ids = []
    for item in items:
        text = (item.text or item.content or "").strip()
        pairs.append([query, text])
        ids.append(item.id)

    try:
        inputs = tokenizer(
            pairs,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt"
        )

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits.squeeze(-1)
            if logits.ndim == 0:
                logits = logits.unsqueeze(0)
            probs = torch.sigmoid(logits)

        logits_list = logits.tolist()
        probs_list = probs.tolist()

        scored = []
        for doc_id, logit, prob in zip(ids, logits_list, probs_list):
            scored.append({
                "id": doc_id,
                "score": float(prob),
                "logit": float(logit)
            })

        # Sort descending by neural reranker score (sigmoid probability)
        scored.sort(key=lambda x: x["score"], reverse=True)

        if req.top_n is not None and req.top_n > 0:
            scored = scored[:req.top_n]

        results = [
            RerankResultItem(
                id=item["id"],
                score=round(item["score"], 6),
                logit=round(item["logit"], 4),
                rank=idx + 1
            )
            for idx, item in enumerate(scored)
        ]

        elapsed_ms = (time.perf_counter() - t_start) * 1000
        return RerankResponse(
            results=results,
            model=MODEL_NAME,
            took_ms=round(elapsed_ms, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reranking error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    # Initialize model synchronously before running server
    init_model()
    uvicorn.run(app, host="127.0.0.1", port=8100, log_level="info")
