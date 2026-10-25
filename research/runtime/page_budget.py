# research/runtime/page_budget.py
"""
Page Budget Manager for Resource-Aware Document Intelligence.
Central Principle:
  "Never process more pages than necessary."
Tracks:
  candidate pages, selected pages, skipped pages, processed pages.
"""

from typing import Dict, Any, List, Optional, Tuple


class PageBudgetManager:
    """Enforces bounded page budget on document processing operations."""

    def __init__(self, max_page_budget: int = 10):
        self.max_page_budget = max_page_budget
        self.budget_log: List[Dict[str, Any]] = []

    def request_page_window(
        self,
        total_document_pages: int,
        start_page: int,
        end_page: int
    ) -> Dict[str, Any]:
        """
        Computes bounded page window.
        Assures:
          pages_processed = window_size (bounded by max_page_budget)
          pages_before = skipped
          pages_after = skipped
        """
        # Clamp to bounds
        s = max(1, start_page)
        e = min(total_document_pages, end_page)

        requested_count = (e - s + 1)
        if requested_count > self.max_page_budget:
            e = s + self.max_page_budget - 1

        selected_pages = list(range(s, e + 1))
        pages_processed = len(selected_pages)
        pages_skipped_before = s - 1
        pages_skipped_after = total_document_pages - e
        pages_skipped_total = pages_skipped_before + pages_skipped_after

        record = {
            "total_document_pages": total_document_pages,
            "requested_range": (start_page, end_page),
            "bounded_range": (s, e),
            "selected_pages": selected_pages,
            "pages_processed": pages_processed,
            "pages_skipped_before": pages_skipped_before,
            "pages_skipped_after": pages_skipped_after,
            "pages_skipped_total": pages_skipped_total,
            "budget_limit": self.max_page_budget
        }
        self.budget_log.append(record)
        return record

    def get_log(self) -> List[Dict[str, Any]]:
        return self.budget_log
