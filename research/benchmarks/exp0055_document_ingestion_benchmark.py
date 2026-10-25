"""
research/benchmarks/exp0055_document_ingestion_benchmark.py
EXP-0055: Document Ingestion Performance & Memory Scaling Benchmark.

Compares:
- Control B0: Monolithic whole-document batch parsing (unwindowed, no page budgeting)
- Candidate C1: Bounded page-windowed incremental streaming parsing (window=5, streaming_mode=True)

Across:
1. 5-page authentic curriculum PDF (tests/research/data/multipage_curriculum.pdf)
2. 20-page curriculum PDF (scratch/data_benchmarks/curriculum_20p.pdf)
3. 50-page stress curriculum PDF (scratch/data_benchmarks/curriculum_50p.pdf)

Instruments:
- True peak RSS via active background thread sampling (2ms polling)
- Latency (total ms and ms/page)
- Character and structural heading completeness
- Memory scaling slope analysis (O(1) vs O(N))
"""

import os
import sys
import gc
import json
import time
from typing import Dict, Any, List

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from research.document_adapters.python_docling_adapter import PythonDoclingAdapter, PeakMemoryMonitor


def run_monolithic_batch(adapter: PythonDoclingAdapter, pdf_path: str, total_pages: int) -> Dict[str, Any]:
    """Control B0: Whole-document monolithic conversion."""
    gc.collect()
    time.sleep(0.1)
    
    start_t = time.time()
    with PeakMemoryMonitor(interval_sec=0.002) as monitor:
        converter = adapter._get_converter()
        conv_res = converter.convert(pdf_path, page_range=(1, total_pages))
        docling_doc = conv_res.document
        
        extracted_text = []
        headings = []
        for item, level in docling_doc.iterate_items():
            text = getattr(item, "text", "")
            if text:
                item_type = type(item).__name__
                if "Header" in item_type or "Title" in item_type or level > 0:
                    headings.append(text)
                extracted_text.append(text)
                
        all_text = "\n".join(extracted_text)
    
    elapsed_sec = time.time() - start_t
    return {
        "condition": "B0_MONOLITHIC_BATCH",
        "pdf_path": pdf_path,
        "total_pages": total_pages,
        "elapsed_sec": round(elapsed_sec, 4),
        "ms_per_page": round((elapsed_sec * 1000.0) / total_pages, 2),
        "peak_rss_mb": monitor.peak_rss_mb,
        "baseline_rss_mb": round(monitor.baseline_rss_bytes / (1024 * 1024), 2),
        "delta_rss_mb": monitor.delta_rss_mb,
        "total_chars": len(all_text),
        "headings_count": len(headings),
        "text_sample": all_text[:200]
    }


def run_windowed_streaming(adapter: PythonDoclingAdapter, pdf_path: str, total_pages: int, window_size: int = 5) -> Dict[str, Any]:
    """Candidate C1: Bounded page-windowed incremental streaming conversion."""
    gc.collect()
    time.sleep(0.1)
    
    start_t = time.time()
    extracted_artifacts: List[Dict[str, Any]] = []
    
    with PeakMemoryMonitor(interval_sec=0.002) as monitor:
        # Stream pages in bounded windows
        stream = adapter.stream_pages(pdf_path, page_range=(1, total_pages), chunk_window=window_size)
        for artifact in stream:
            extracted_artifacts.append(artifact)
            
        all_text = "\n".join(a.get("text", "") for a in extracted_artifacts)
        headings = [a.get("heading") for a in extracted_artifacts if a.get("heading")]
        
    elapsed_sec = time.time() - start_t
    return {
        "condition": "C1_WINDOWED_STREAMING",
        "pdf_path": pdf_path,
        "total_pages": total_pages,
        "window_size": window_size,
        "elapsed_sec": round(elapsed_sec, 4),
        "ms_per_page": round((elapsed_sec * 1000.0) / total_pages, 2),
        "peak_rss_mb": monitor.peak_rss_mb,
        "baseline_rss_mb": round(monitor.baseline_rss_bytes / (1024 * 1024), 2),
        "delta_rss_mb": monitor.delta_rss_mb,
        "total_chars": len(all_text),
        "pages_processed": len(extracted_artifacts),
        "headings_count": len(headings),
        "text_sample": all_text[:200]
    }


def execute_ingestion_benchmark() -> Dict[str, Any]:
    print("=" * 70)
    print("EXP-0055: DOCUMENT INGESTION PERFORMANCE & MEMORY SCALING BENCHMARK")
    print("=" * 70)
    
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    test_cases = [
        {"name": "5_pages_curriculum", "path": os.path.join(base_dir, "tests", "research", "data", "multipage_curriculum.pdf"), "pages": 5},
        {"name": "20_pages_curriculum", "path": os.path.join(base_dir, "scratch", "data_benchmarks", "curriculum_20p.pdf"), "pages": 20},
        {"name": "50_pages_curriculum", "path": os.path.join(base_dir, "scratch", "data_benchmarks", "curriculum_50p.pdf"), "pages": 50}
    ]
    
    adapter = PythonDoclingAdapter({"default_page_window": 5, "max_page_budget": 10})
    results = []
    
    for tc in test_cases:
        p = tc["path"]
        pages = tc["pages"]
        print(f"\n--- Testing: {tc['name']} ({pages} pages, {os.path.getsize(p)} bytes) ---")
        
        # Run B0
        print("  Running B0 (Monolithic Batch)...")
        res_b0 = run_monolithic_batch(adapter, p, pages)
        print(f"    B0: {res_b0['elapsed_sec']}s, Peak RSS: {res_b0['peak_rss_mb']} MB (Delta: +{res_b0['delta_rss_mb']} MB), Chars: {res_b0['total_chars']}")
        
        # Run C1
        print("  Running C1 (Bounded Windowed Streaming)...")
        res_c1 = run_windowed_streaming(adapter, p, pages, window_size=5)
        print(f"    C1: {res_c1['elapsed_sec']}s, Peak RSS: {res_c1['peak_rss_mb']} MB (Delta: +{res_c1['delta_rss_mb']} MB), Chars: {res_c1['total_chars']}")
        
        # Character fidelity check
        char_ratio = round(res_c1["total_chars"] / max(1, res_b0["total_chars"]) * 100.0, 2)
        mem_savings_mb = round(res_b0["peak_rss_mb"] - res_c1["peak_rss_mb"], 2)
        delta_ratio = round((res_c1["delta_rss_mb"] / max(0.1, res_b0["delta_rss_mb"])) * 100.0, 2)
        
        comparison = {
            "test_case": tc["name"],
            "pages": pages,
            "b0_batch": res_b0,
            "c1_streaming": res_c1,
            "char_fidelity_pct": char_ratio,
            "memory_reduction_mb": mem_savings_mb,
            "delta_memory_pct_of_batch": delta_ratio
        }
        results.append(comparison)
        
    out_file = os.path.join(base_dir, "research", "benchmarks", "exp0055_ingestion_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    print("\n" + "=" * 70)
    print(f"Benchmark completed successfully. Results written to: {out_file}")
    print("=" * 70)
    return {"status": "SUCCESS", "results": results, "output_path": out_file}


if __name__ == "__main__":
    execute_ingestion_benchmark()
