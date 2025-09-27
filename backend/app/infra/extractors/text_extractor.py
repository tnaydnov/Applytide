from __future__ import annotations
from pathlib import Path
import re
from typing import Protocol

SAFE_BULLET = "•"

class PDFExtractorPort(Protocol):
    def extract_text(self, pdf_content: bytes) -> dict: ...

class TextExtractor:
    """Handles text extraction for .txt / .pdf / .docx / (legacy .doc notice)."""
    def __init__(self, pdf_extractor: PDFExtractorPort) -> None:
        self.pdf_extractor = pdf_extractor

    def extract_text(self, file_path: Path) -> str:
        ext = file_path.suffix.lower()
        try:
            if ext == ".txt":
                return file_path.read_text(encoding="utf-8", errors="ignore")

            if ext == ".pdf":
                data = file_path.read_bytes()
                res = self.pdf_extractor.extract_text(data)
                return res.get("text", "")

            if ext in (".docx", ".doc"):
                try:
                    from docx import Document as _Docx
                    d = _Docx(str(file_path))
                except Exception:
                    if ext == ".doc":
                        return "Legacy .doc file: text extraction requires conversion to .docx"
                    raise
                parts: list[str] = []
                for p in d.paragraphs:
                    txt = p.text.strip()
                    if txt:
                        parts.append(txt)
                for t in d.tables:
                    for row in t.rows:
                        row_txt = " | ".join(cell.text.strip() for cell in row.cells if cell and cell.text)
                        if row_txt:
                            parts.append(row_txt)
                text = "\n".join(parts)
                # normalize bullets
                text = re.sub(r"^[\u2022\u25CF\-]\s*", SAFE_BULLET + " ", text, flags=re.M)
                return text
        except Exception as e:
            return f"Error extracting text: {e}"
        return ""
