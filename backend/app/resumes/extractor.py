from __future__ import annotations
import io
import os
from pathlib import Path
from typing import Tuple
from pypdf import PdfReader
from docx import Document

UPLOAD_DIR = Path("/app/uploads/resumes")

def ensure_upload_dir() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def extract_text_from_pdf(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    parts = []
    for page in reader.pages:
        txt = page.extract_text() or ""
        parts.append(txt)
    return "\n".join(parts).strip()

def extract_text_from_docx(data: bytes) -> str:
    bio = io.BytesIO(data)
    doc = Document(bio)
    return "\n".join(p.text for p in doc.paragraphs).strip()

def save_file_and_extract(filename: str, data: bytes) -> Tuple[str, str]:
    """
    Save uploaded file and return (absolute_path, extracted_text).
    Supports .pdf, .docx, .txt. Others store file only and return empty text.
    """
    ensure_upload_dir()
    safe = filename.replace(" ", "_")
    dest = UPLOAD_DIR / safe
    # Avoid collisions: add suffix if exists
    i = 1
    while dest.exists():
        dest = UPLOAD_DIR / f"{dest.stem}_{i}{dest.suffix}"
        i += 1
    dest.write_bytes(data)

    ext = dest.suffix.lower()
    text = ""
    if ext == ".pdf":
        text = extract_text_from_pdf(data)
    elif ext == ".docx":
        text = extract_text_from_docx(data)
    elif ext == ".txt":
        text = data.decode("utf-8", errors="ignore")

    return str(dest), text
