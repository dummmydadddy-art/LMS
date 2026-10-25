# research/document_adapters/selective_vision.py
"""
Selective Visual Processing Policy for Resource-Aware Document Intelligence.
Logic:
  Page -> Text quality assessment -> Is text reliable?
    YES -> retain cheap text extract (no OCR/VLM)
    NO  -> route to Surya/Marker for selective OCR
Triggers logged: low OCR confidence, sparse text, scanned page, math/table density.
NO ground truth may be used to make this decision.
"""

import re
from typing import Dict, Any, List, Tuple


class SelectiveVisionPolicy:
    """Determines whether a document page requires expensive visual/OCR processing."""

    def __init__(self, min_char_count: int = 60, min_word_ratio: float = 0.60):
        self.min_char_count = min_char_count
        self.min_word_ratio = min_word_ratio
        self.trigger_log: List[Dict[str, Any]] = []

    def evaluate_page(self, page_dict_or_text: Any, page_num: int = 1) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Evaluates page text quality.
        Returns: (needs_ocr: bool, trigger_reason: str, diagnostics: dict)
        """
        if isinstance(page_dict_or_text, dict):
            text = page_dict_or_text.get("text", "")
        else:
            text = str(page_dict_or_text)

        char_len = len(text.strip())

        # Trigger 1: Sparse text / scanned page
        if char_len < self.min_char_count:
            reason = f"sparse_text_under_{self.min_char_count}_chars"
            diag = {"char_length": char_len, "decision": "TRIGGER_OCR"}
            self._log(page_num, True, reason, diag)
            return True, reason, diag

        # Trigger 2: High non-alphanumeric / unparsed binary characters
        alphanumeric = sum(1 for c in text if c.isalnum() or c.isspace())
        ratio = alphanumeric / max(1, char_len)
        if ratio < self.min_word_ratio:
            reason = f"low_alphanumeric_ratio_{ratio:.2f}"
            diag = {"char_length": char_len, "ratio": ratio, "decision": "TRIGGER_OCR"}
            self._log(page_num, True, reason, diag)
            return True, reason, diag

        # Trigger 3: Heavy unrendered equation symbols
        math_tokens = len(re.findall(r"(\\[a-zA-Z]+|[∀-⋿]|\$\$)", text))
        if math_tokens > 15:
            reason = "complex_equation_density"
            diag = {"math_tokens": math_tokens, "decision": "TRIGGER_OCR"}
            self._log(page_num, True, reason, diag)
            return True, reason, diag

        # Text is reliable: pass through without expensive visual processing
        reason = "text_extraction_reliable"
        diag = {"char_length": char_len, "ratio": ratio, "decision": "RETAIN_TEXT"}
        self._log(page_num, False, reason, diag)
        return False, reason, diag

    def _log(self, page_num: int, needs_ocr: bool, reason: str, diag: Dict[str, Any]):
        self.trigger_log.append({
            "page_number": page_num,
            "needs_ocr": needs_ocr,
            "trigger_reason": reason,
            "diagnostics": diag
        })

    def get_trigger_history(self) -> List[Dict[str, Any]]:
        return self.trigger_log
