# research/document_navigation/pageindex_agentic_adapter.py
"""
Native PageIndex Agentic Retrieval Adapter (EXP-0057 Architecture).
Repository: VectifyAI/PageIndex
Implementation: Native PageIndex tool-mediated agentic retrieval using custom local orchestration.

Preserves the validated EXP-0057 design:
- Real PageIndex PDF-native tree (pageindex.page_index_flash / PageIndexLocalClient)
- Native PageIndex tools (get_document_structure, get_page_content)
- Local LLM orchestration via Ollama (llama3.2:latest)
- Tool-call traces and exact pages read
- Strict turn-based state machine with error recovery
- NO regex fallback
- NO synthetic similarity scores (purged)
- NO hidden deterministic matcher
- Output conforms to standard RetrievalResult schema
"""

import os
import sys
import json
import time
import urllib.request
from typing import List, Dict, Any, Optional

try:
    import pageindex
    from pageindex.agent_tools import _tool_specs, targeting_block
    PAGEINDEX_AVAILABLE = True
    PAGEINDEX_VERSION = getattr(pageindex, "__version__", "0.2.18")
except ImportError:
    PAGEINDEX_AVAILABLE = False
    PAGEINDEX_VERSION = None

from research.retrieval_adapters.base import ResearchRetriever, RetrievalResult


class PageIndexAgenticAdapter(ResearchRetriever):
    """
    Native PageIndex tool-mediated agentic retrieval adapter using custom local orchestration.
    Maintained as a separate adapter from PageIndex structural navigation.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.doc_name = self.config.get("doc_name", "curriculum_full.pdf")
        self.pdf_path = self.config.get("pdf_path", "database/curriculum_full.pdf")
        self.storage_path = self.config.get("storage_path", "scratch/pageindex_store")
        self.model_name = self.config.get("model_name", "llama3.2:latest")
        self.ollama_endpoint = self.config.get("ollama_endpoint", "http://127.0.0.1:11434/v1/chat/completions")
        self.max_turns = self.config.get("max_turns", 6)
        self.temperature = self.config.get("temperature", 0.0)
        self.seed = self.config.get("seed", 42)

        self._client = None
        self._tools_map = {}
        self._tool_structure_schema = [{
            "type": "function",
            "function": {
                "name": "get_document_structure",
                "description": "Retrieve the document outline and structure with section titles and page ranges.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "doc_name": {"type": "string", "description": "Document name (curriculum_full.pdf)"}
                    },
                    "required": ["doc_name"]
                }
            }
        }]
        self._tool_page_schema = [{
            "type": "function",
            "function": {
                "name": "get_page_content",
                "description": "Retrieve the text content of specific pages from the document.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "doc_name": {"type": "string", "description": "Document name (curriculum_full.pdf)"},
                        "pages": {"type": "string", "description": "Page numbers or ranges to retrieve, e.g. '3-4' or '5,6'"}
                    },
                    "required": ["doc_name", "pages"]
                }
            }
        }]
        self._targeting_block_str = ""
        self._pages_store: Dict[int, str] = {}
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
        if not PAGEINDEX_AVAILABLE:
            raise RuntimeError("pageindex package (>=0.2.18) is not installed. Simulation is disabled.")

        if not os.path.exists(self.storage_path):
            os.makedirs(self.storage_path, exist_ok=True)

        self._client = pageindex.PageIndexLocalClient(storage_path=self.storage_path)
        for name, desc, schema, invoke in _tool_specs(self._client, False):
            self._tools_map[name] = invoke

        try:
            self._targeting_block_str = targeting_block(self._client, "pi-curriculum")
        except Exception:
            self._targeting_block_str = ""

        # Load authentic pages store if available
        pages_file = os.path.join(self.storage_path, "docs/curriculum_full/pages.json")
        if os.path.exists(pages_file):
            try:
                with open(pages_file, "r", encoding="utf-8") as f:
                    self._pages_store = {p["page_index"]: p["markdown"] for p in json.load(f)}
            except Exception:
                self._pages_store = {}

        self._initialized = True

    def _call_ollama(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> Dict[str, Any]:
        req_data = {
            "model": self.model_name,
            "messages": messages,
            "tools": tools,
            "parallel_tool_calls": False,
            "stream": False,
            "options": {"temperature": self.temperature, "seed": self.seed, "num_predict": 128}
        }
        req = urllib.request.Request(
            self.ollama_endpoint,
            data=json.dumps(req_data).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            res = json.loads(resp.read().decode("utf-8"))
        return res["choices"][0]["message"]

    def index(self, documents: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Any:
        self.initialize()
        return len(self._pages_store)

    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        meta = self.retrieve_with_metadata(query, top_k, **kwargs)
        return meta["results"]

    def retrieve_with_metadata(self, query: str, top_k: int = 5, **kwargs) -> Dict[str, Any]:
        self.initialize()
        start_time = time.time()

        system_prompt = (
            "You are a native PageIndex document retrieval agent.\n"
            f"{self._targeting_block_str}\n"
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f'Query: "{query}"\nStep 1: Inspect the document structure by calling get_document_structure.'}
        ]

        selected_pages: List[int] = []
        tool_calls_log: List[Dict[str, Any]] = []
        malformed_calls = 0
        parallel_calls_count = 0
        retries = 0
        state = "STATE_A_STRUCTURE"
        turn = 0
        termination_reason = "normal"

        while turn < self.max_turns:
            turn += 1

            if state == "STATE_A_STRUCTURE":
                current_tools = self._tool_structure_schema
            elif state in ("STATE_B_PAGE_RETRIEVAL", "STATE_C_ADDITIONAL_RETRIEVAL"):
                current_tools = self._tool_page_schema
            else:
                termination_reason = "terminal_state_reached"
                break

            try:
                msg = self._call_ollama(messages, current_tools)
            except Exception as e:
                termination_reason = f"request_error: {str(e)}"
                break

            tool_calls = msg.get("tool_calls") or []
            content = msg.get("content") or ""

            # Parallel tool calls rejection
            if len(tool_calls) > 1:
                parallel_calls_count += 1
                messages.append(msg)
                messages.append({
                    "role": "user",
                    "content": "Error: Only one tool call may be emitted per turn. Please call exactly one tool."
                })
                retries += 1
                if retries > 2:
                    termination_reason = "exceeded_parallel_retries"
                    break
                continue

            # Malformed tool call in prose (NO REGEX EXECUTION)
            if len(tool_calls) == 0:
                if "get_document_structure" in content or "get_page_content" in content or '{"name":' in content:
                    malformed_calls += 1
                    messages.append(msg)
                    messages.append({
                        "role": "user",
                        "content": "Error: Malformed tool call. Please invoke the tool using the structured tool calling interface, not as text."
                    })
                    retries += 1
                    if retries > 2:
                        termination_reason = "exceeded_malformed_retries"
                        break
                    continue
                else:
                    termination_reason = "model_completed_text"
                    state = "STATE_D_TERMINATE"
                    break

            # Exactly one structured tool call
            tc = tool_calls[0]
            fn_name = tc["function"]["name"]
            fn_args_raw = tc["function"]["arguments"]
            fn_args = json.loads(fn_args_raw) if isinstance(fn_args_raw, str) else fn_args_raw

            if state == "STATE_A_STRUCTURE":
                if fn_name != "get_document_structure":
                    malformed_calls += 1
                    messages.append(msg)
                    messages.append({"role": "user", "content": "Error: In this state, only get_document_structure is permitted."})
                    retries += 1
                    continue

                t_exec0 = time.time()
                blocks, is_err = self._tools_map[fn_name](fn_args) if fn_name in self._tools_map else ([{"text": "Error"}], True)
                t_exec_ms = round((time.time() - t_exec0) * 1000, 1)
                tool_out = blocks[0]["text"] if blocks else ""
                tool_calls_log.append({
                    "turn": turn,
                    "name": fn_name,
                    "arguments": fn_args,
                    "status": "success" if not is_err else "error",
                    "latency_ms": t_exec_ms
                })

                messages.append(msg)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "name": fn_name,
                    "content": tool_out
                })

                state = "STATE_B_PAGE_RETRIEVAL"
                messages.append({
                    "role": "user",
                    "content": f'Document structure retrieved. Now inspect the outline and identify the relevant section and page numbers for query: "{query}". Call get_page_content(doc_name=\'{self.doc_name}\', pages=\'...\'). If the topic is OUT OF CURRICULUM, reply "OUT_OF_CURRICULUM" without calling any tool.'
                })

            elif state in ("STATE_B_PAGE_RETRIEVAL", "STATE_C_ADDITIONAL_RETRIEVAL"):
                if fn_name != "get_page_content":
                    malformed_calls += 1
                    messages.append(msg)
                    messages.append({"role": "user", "content": "Error: In this state, only get_page_content is permitted."})
                    retries += 1
                    continue

                pages_arg = str(fn_args.get("pages", "")).strip()
                if not pages_arg or pages_arg == '""':
                    malformed_calls += 1
                    messages.append(msg)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "name": fn_name,
                        "content": json.dumps({"error": "Invalid argument: 'pages' cannot be empty. Specify a valid page number or range, e.g. '3-4'."})
                    })
                    retries += 1
                    continue

                t_exec0 = time.time()
                blocks, is_err = self._tools_map[fn_name](fn_args) if fn_name in self._tools_map else ([{"text": "Error"}], True)
                t_exec_ms = round((time.time() - t_exec0) * 1000, 1)
                tool_out = blocks[0]["text"] if blocks else ""
                tool_calls_log.append({
                    "turn": turn,
                    "name": fn_name,
                    "arguments": fn_args,
                    "status": "success" if not is_err else "error",
                    "latency_ms": t_exec_ms
                })

                try:
                    p_data = json.loads(tool_out)
                    for item in p_data.get("content", []):
                        selected_pages.append(item["page"])
                except Exception:
                    pass

                messages.append(msg)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "name": fn_name,
                    "content": tool_out[:3000]
                })

                if state == "STATE_B_PAGE_RETRIEVAL":
                    state = "STATE_C_ADDITIONAL_RETRIEVAL"
                    messages.append({
                        "role": "user",
                        "content": f'Page content for pages {pages_arg} has been retrieved into evidence. If you need content from DIFFERENT pages, call get_page_content. If you have sufficient evidence, provide your final summary and conclusion without calling any more tools.'
                    })
                else:
                    state = "STATE_D_TERMINATE"

        latency_ms = (time.time() - start_time) * 1000.0
        uniq_pages = sorted(list(set(selected_pages)))

        # Format results strictly into standard RetrievalResult
        results: List[Dict[str, Any]] = []
        for rank_idx, p in enumerate(uniq_pages[:top_k], start=1):
            p_text = self._pages_store.get(p, "")
            first_line = p_text.split("\n")[0] if p_text else f"Page {p}"
            res = RetrievalResult(
                doc_id=self.doc_name,
                chunk_id=f"PAGE_{p:02d}",
                page_start=p,
                page_end=p,
                section_id=f"Page {p} Evidence",
                score=1.0,  # Rank ordering score
                rank=rank_idx,
                retrieval_method="native_pageindex_agentic_v2",
                evidence_type="TEXT",
                metadata={
                    "title": first_line,
                    "heading": f"Page {p} Evidence",
                    "content": p_text,
                    "citation": f"{self.doc_name} (Page {p})",
                    "token_count": len(p_text.split())
                }
            )
            results.append(res.to_dict())

        return {
            "query": query,
            "results": results,
            "latency_ms": round(latency_ms, 2),
            "metadata": {
                "retriever": "PageIndexAgenticAdapter",
                "model": self.model_name,
                "tool_turns": turn,
                "tool_calls": tool_calls_log,
                "selected_pages": uniq_pages,
                "pages_read": len(uniq_pages),
                "malformed_calls": malformed_calls,
                "parallel_calls": parallel_calls_count,
                "retry_count": retries,
                "termination_reason": termination_reason
            }
        }

    def health(self) -> Dict[str, Any]:
        is_ready = PAGEINDEX_AVAILABLE
        reason = None if is_ready else "pageindex Python package is not installed (pip install pageindex)"
        return {
            "status": "READY" if is_ready else "NOT_READY",
            "reason": reason,
            "simulation": False,
            "adapter": "PageIndexAgenticAdapter",
            "package_available": PAGEINDEX_AVAILABLE,
            "package_version": PAGEINDEX_VERSION,
            "model_name": self.model_name,
            "ollama_endpoint": self.ollama_endpoint,
            "pages_store_loaded": len(self._pages_store)
        }

    def describe(self) -> Dict[str, Any]:
        return {
            "name": "PageIndexAgenticAdapter",
            "repository": "VectifyAI/PageIndex",
            "construct": "Native PageIndex tool-mediated agentic retrieval using custom local orchestration",
            "tools_used": ["get_document_structure", "get_page_content"],
            "model": self.model_name,
            "experimental_status": "EXPERIMENTAL_RESEARCH_ONLY",
            "simulation": False
        }
