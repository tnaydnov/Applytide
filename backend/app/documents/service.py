from __future__ import annotations

from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import uuid
import json
import re
import os
import mimetypes
from fastapi import HTTPException
import tempfile



from docx import Document as _Docx  # for .docx text extraction
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

from ..db import models
from ..services.pdf_extractor import PDFExtractor
from ..services.ai_cover_letter import AICoverLetterService  # used if available
from .models import (
    DocumentType, DocumentStatus, DocumentFormat,
    DocumentAnalysis, ATSScore, CoverLetterRequest, DocumentOptimizationRequest,
    DocumentResponse, DocumentListResponse
)

# Optional OpenAI (sync) for resume adjust/generation/AI suggestions
try:
    from openai import OpenAI
    _OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
except Exception:  # library not installed
    OpenAI = None
    _OPENAI_API_KEY = ""

SAFE_BULLET = "•"



def _sanitize_display_name(name: Optional[str]) -> str:
    if not name:
        return ""
    base = re.sub(r"\.[^./\\]+$", "", name).strip()
    base = re.sub(r"[^a-zA-Z0-9 _-]+", "", base).strip()
    return base or "document"


class DocumentService:
    """Document management + analysis + AI helpers."""

    def __init__(self):
        self.upload_dir = Path("/app/uploads/documents")
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        self.pdf_extractor = PDFExtractor()

        self.ai_cover_letter_service: Optional[AICoverLetterService] = None
        try:
            self.ai_cover_letter_service = AICoverLetterService()
        except Exception as e:
            print(f"[documents] AI cover letter unavailable: {e}")

        # Lazily create a basic OpenAI client for resume adjust/gen if key present
        self._llm = None
        if OpenAI and _OPENAI_API_KEY:
            try:
                self._llm = OpenAI(api_key=_OPENAI_API_KEY)
            except Exception as e:
                print(f"[documents] OpenAI init failed: {e}")
                self._llm = None

    # ============== Core helpers ==============


    def _extract_text(self, file_path: Path) -> str:
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
                    d = _Docx(str(file_path))
                except Exception:
                    # legacy .doc not supported by python-docx; return placeholder instead of crashing
                    if ext == ".doc":
                        return "Legacy .doc file: text extraction requires conversion to .docx"
                    raise
                parts = []
                # paragraphs
                for p in d.paragraphs:
                    txt = p.text.strip()
                    if txt:
                        parts.append(txt)
                # tables
                for t in d.tables:
                    for row in t.rows:
                        row_txt = " | ".join(cell.text.strip() for cell in row.cells if cell and cell.text)
                        if row_txt:
                            parts.append(row_txt)
                text = "\n".join(parts)
                # normalize bullets if present
                text = re.sub(r"^[\u2022\u25CF\-]\s*", SAFE_BULLET + " ", text, flags=re.M)
                return text
        except Exception as e:
            return f"Error extracting text: {e}"
        return ""

    def _sidecar_path(self, file_path: Path) -> Path:
        return file_path.with_suffix(file_path.suffix + ".meta.json")

    def _read_sidecar(self, file_path: Path) -> Dict[str, Any]:
        meta_path = self._sidecar_path(file_path)
        if meta_path.exists():
            try:
                return json.loads(meta_path.read_text(encoding="utf-8"))
            except Exception:
                pass
        return {}

    def _write_sidecar(self, file_path: Path, data: Dict[str, Any]) -> None:
        meta_path = self._sidecar_path(file_path)
        try:
            meta_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"[documents] failed writing sidecar: {e}")

    
    def _parse_resume_sections(self, text: str) -> Dict[str, Any]:
        """
        Heuristically split resume text into sections + bullets based on common headings
        and the SAFE_BULLET character.
        """
        headings = {
            "summary": "Summary",
            "skills": "Technical Skills",
            "technical skills": "Technical Skills",
            "experience": "Work Experience",
            "work experience": "Work Experience",
            "projects": "Projects",
            "education": "Education",
            "certifications": "Certifications",
            "achievements": "Achievements",
            "volunteering": "Volunteering",
            "languages": "Languages",
            "military": "Military Service",
            "military service": "Military Service",
        }

        lines = [ln.rstrip() for ln in text.splitlines()]
        # Try to read header (name + contact) from the first non-empty lines
        header_name = ""
        header_contacts: list[str] = []

        i = 0
        while i < len(lines) and not lines[i].strip():
            i += 1
        if i < len(lines):
            header_name = lines[i].strip()
            i += 1
        # collect next up-to-2 contact lines if they look like contacts/links
        while i < len(lines) and len(header_contacts) < 3 and lines[i].strip():
            header_contacts.append(lines[i].strip())
            i += 1

        # Section collection
        sections: Dict[str, Dict[str, Any]] = {}
        cur_key = "Summary"
        sections[cur_key] = {"header": cur_key, "body": [], "bullets": []}

        def push_line(line: str):
            if not line:
                return
            if line.lstrip().startswith(SAFE_BULLET) or line.lstrip().startswith("- "):
                sections[cur_key]["bullets"].append(line.lstrip().lstrip(SAFE_BULLET).lstrip("-").strip())
            else:
                sections[cur_key]["body"].append(line)

        # advance to first blank after header
        while i < len(lines) and not lines[i].strip():
            i += 1

        # parse remaining
        while i < len(lines):
            raw = lines[i].strip()
            low = raw.lower().rstrip(":")
            # detect heading lines
            if low in headings:
                cur_key = headings[low]
                if cur_key not in sections:
                    sections[cur_key] = {"header": cur_key, "body": [], "bullets": []}
            else:
                push_line(raw)
            i += 1

        return {
            "name": header_name,
            "contacts": header_contacts,
            "sections": [sections[k] for k in [
                "Summary", "Technical Skills", "Projects", "Education",
                "Work Experience", "Certifications", "Achievements",
                "Volunteering", "Languages", "Military Service"
            ] if k in sections]
        }
    
    @staticmethod
    def _tighten_lines(text: str) -> str:
        # Remove repeated blank lines, trim spaces
        lines = [ln.rstrip() for ln in (text or "").splitlines()]
        out = []
        prev_blank = False
        for ln in lines:
            is_blank = (ln.strip() == "")
            if is_blank and prev_blank:
                continue
            out.append(ln)
            prev_blank = is_blank
        return "\n".join(out).strip()

    @staticmethod
    def _heading_norm(s: str) -> str:
        return (s or "").strip().lower().replace(":", "")

    @staticmethod
    def _is_heading(line: str) -> bool:
        # Call the static method properly
        k = DocumentService._heading_norm(line)
        return k in {
            "summary", "professional summary",
            "skills", "technical skills", "tech skills",
            "experience", "work experience", "employment",
            "projects", 
            "education",
            "achievements", "awards",
            "military service"
        }

    @staticmethod
    def _parse_sections_from_text(text: str) -> Dict[str, List[str]]:
        """
        Parse LLM/deterministic text into sections keyed by canonical names.
        Keeps ordering similar to your current layout.
        """
        order = [
            "summary",
            "technical skills",
            "work experience", 
            "projects",
            "education",
            "achievements",
            "military service",
        ]
        sec_map = {k: [] for k in order}
        current = None
        for raw in (text or "").splitlines():
            line = raw.strip()
            if not line:
                continue
            if DocumentService._is_heading(line):
                k = DocumentService._heading_norm(line)
                if k in ("skills", "tech skills"): k = "technical skills"
                if k in ("experience", "employment"): k = "work experience"
                current = k
                continue
            if current is None:
                # before any heading -> assume this is header/summary; push to summary
                current = "summary"
            sec_map[current].append(line)
        # drop empties but preserve order
        return {k: v for k, v in sec_map.items() if v}

    @staticmethod
    def _limit_list(items, n):
        return list(items or [])[:n]

    # ============== Public API ==============

    def upload_document(
        self,
        db: Session,
        user_id: str,
        file_content: bytes,
        filename: str,
        document_type: DocumentType,
        display_name: Optional[str] = None,
        metadata: Dict[str, Any] | None = None,
    ) -> models.Resume:
        ext = Path(filename).suffix.lower() or ".bin"
        file_id = uuid.uuid4()
        unique_name = f"{file_id}{ext}"
        file_path = self.upload_dir / unique_name
        file_path.write_bytes(file_content)

        text_content = self._extract_text(file_path)
        safe_label = _sanitize_display_name(display_name or Path(filename).stem)

        row = models.Resume(
            id=file_id,
            user_id=uuid.UUID(user_id) if user_id else None,
            label=safe_label,
            file_path=str(file_path),
            text=text_content,
        )
        db.add(row)
        db.commit()
        db.refresh(row)

        side = {
            "document_id": str(row.id),
            "type": document_type.value,
            "name": safe_label,
            "original_filename": filename,
            "original_extension": ext,
            "status": DocumentStatus.ACTIVE.value,
            "metadata": metadata or {},
            "created_at": row.created_at.isoformat(),
        }
        self._write_sidecar(file_path, side)
        return row
    
    # ----------- List / Get / Delete / Status -----------

    def resolve_document_response(self, row: models.Resume) -> DocumentResponse:
        p = Path(row.file_path)
        side = self._read_sidecar(p)
        resolved_type = DocumentType(side.get("type", "resume"))
        resolved_name = side.get("name", row.label)
        resolved_meta = side.get("metadata", {})
        resolved_status = DocumentStatus(side.get("status", DocumentStatus.ACTIVE.value))
        raw_ext = (p.suffix[1:] if p.suffix else "txt").lower()
        ext = {"doc": "docx"}.get(raw_ext, raw_ext)  # normalize legacy .doc to docx
        fmt = DocumentFormat(ext if ext in {"pdf", "docx", "txt", "html"} else "txt")
        size = 0
        try:
            size = p.stat().st_size
        except Exception:
            if row.text:
                size = len(row.text.encode("utf-8"))
        return DocumentResponse(
            id=str(row.id),
            type=resolved_type,
            name=resolved_name,
            status=resolved_status,
            format=fmt,
            file_size=size,
            created_at=row.created_at,
            updated_at=row.created_at,
            tags=[],
            metadata=resolved_meta,
            ats_score=None,
        )

    def list_documents(
        self,
        db: Session,
        user_id: str,
        page: int,
        page_size: int,
        filter_type: Optional[DocumentType],
        filter_status: Optional[DocumentStatus],
        query: Optional[str] = None,
    ) -> DocumentListResponse:
        rows = (
            db.query(models.Resume)
            .filter(models.Resume.user_id == uuid.UUID(user_id))
            .order_by(models.Resume.created_at.desc())
            .all()
        )

        q_lower = (query or "").strip().lower()
        items: List[DocumentResponse] = []

        for r in rows:
            resp = self.resolve_document_response(r)

            if filter_type and resp.type != filter_type:
                continue
            if filter_status and resp.status != filter_status:
                continue

            if q_lower:
                side = self._read_sidecar(Path(r.file_path))
                haystack = " ".join([
                    resp.name or "",
                    r.label or "",
                    r.text or "",
                    json.dumps(side.get("metadata", {}), ensure_ascii=False),
                ]).lower()
                if q_lower not in haystack:
                    continue

            items.append(resp)

        total = len(items)
        start = max(0, (page - 1) * page_size)
        end = start + page_size
        pages = max(1, (total + page_size - 1) // page_size)

        return DocumentListResponse(
            documents=items[start:end],
            total=total,
            page=page,
            page_size=page_size,
            has_next=page < pages,
            has_prev=page > 1,
        )

    def get_document(self, db: Session, user_id: str, document_id: str) -> DocumentResponse:
        try:
            doc = (
                db.query(models.Resume)
                .filter(models.Resume.id == uuid.UUID(document_id), models.Resume.user_id == uuid.UUID(user_id))
                .first()
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid document ID")
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return self.resolve_document_response(doc)

    def delete_document(self, db: Session, user_id: str, document_id: str) -> None:
        doc = (
            db.query(models.Resume)
            .filter(models.Resume.id == uuid.UUID(document_id), models.Resume.user_id == uuid.UUID(user_id))
            .first()
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        try:
            Path(doc.file_path).unlink(missing_ok=True)
            self._sidecar_path(Path(doc.file_path)).unlink(missing_ok=True)
        except Exception:
            pass
        db.delete(doc)
        db.commit()

    def update_status(
        self, db: Session, user_id: str, document_id: str, status: DocumentStatus
    ) -> DocumentResponse:
        doc = (
            db.query(models.Resume)
            .filter(models.Resume.id == uuid.UUID(document_id), models.Resume.user_id == uuid.UUID(user_id))
            .first()
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        p = Path(doc.file_path)
        side = self._read_sidecar(p)
        side["status"] = status.value
        self._write_sidecar(p, side)
        return self.resolve_document_response(doc)

    # ----------- Download / Preview -----------

    def resolve_download(self, db: Session, user_id: str, document_id: str) -> Tuple[Path, str, str]:
        doc = (
            db.query(models.Resume)
            .filter(models.Resume.id == uuid.UUID(document_id), models.Resume.user_id == uuid.UUID(user_id))
            .first()
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        path = Path(doc.file_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail="Stored file missing")

        side = self._read_sidecar(path)
        display_name = (side.get("name") or doc.label or path.stem).strip()
        safe_name = "".join(c for c in display_name if c.isalnum() or c in " _-").strip() or "document"
        filename = f"{safe_name}{path.suffix}"
        media, _ = mimetypes.guess_type(str(path))
        if not media:
            media = "application/octet-stream"
        return path, filename, media

    def get_preview_payload(self, db: Session, user_id: str, document_id: str) -> Tuple[str, Dict[str, Any]]:
        doc = (
            db.query(models.Resume)
            .filter(models.Resume.id == uuid.UUID(document_id), models.Resume.user_id == uuid.UUID(user_id))
            .first()
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        p = Path(doc.file_path)
        ext = p.suffix.lower()

        # If it's a PDF, show it directly
        if ext == ".pdf" and p.exists():
            media, _ = mimetypes.guess_type(str(p))
            return "inline_file", {"path": str(p), "media": media or "application/pdf"}

        # For DOCX files, try to find or generate a preview
        if ext == ".docx":
            # First try to use an existing preview PDF
            preview_pdf = p.with_suffix(".preview.pdf")
            if preview_pdf.exists():
                return "inline_file", {"path": str(preview_pdf), "media": "application/pdf"}
            
            # If no preview exists and we have OpenAI, try to generate HTML preview
            if self._llm is not None:
                try:
                    html_content = self._generate_html_via_openai(doc.text or "")
                    return "html", {"content": html_content}
                except Exception as e:
                    print(f"[documents] Failed to generate HTML preview via OpenAI: {e}")
            
            # Fallback to basic HTML preview
            try:
                # Process the replacements before the f-string
                processed_text = doc.text.replace('•', '<div class="bullet">')
                processed_text = processed_text.replace('\n•', '</div>\n<div class="bullet">')
                processed_text = processed_text.replace('\n', '<br>')
                
                html_content = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Resume Preview</title>
                    <style>
                        body {{
                            font-family: 'Calibri', Arial, sans-serif;
                            line-height: 1.4;
                            padding: 40px;
                            max-width: 800px;
                            margin: 0 auto;
                            color: #333;
                        }}
                        h1 {{
                            font-size: 18px;
                            font-weight: bold;
                            border-bottom: 1px solid #ddd;
                            padding-bottom: 8px;
                            margin-top: 20px;
                        }}
                        .bullet {{
                            margin-left: 20px;
                            position: relative;
                        }}
                        .bullet:before {{
                            content: "•";
                            position: absolute;
                            left: -15px;
                        }}
                    </style>
                </head>
                <body>
                    <h1>Resume Preview</h1>
                    <div style="white-space: pre-wrap;">{processed_text}</div>
                </body>
                </html>
                """
                return "html", {"content": html_content}
            except Exception:
                pass

        # Default to text preview
        text = doc.text or ""
        return "text", {"text": text or "(no preview text available)"}


    # ============== Analysis ==============

    def analyze_document_ats(
        self,
        db: Session,
        document_id: str,
        job_id: Optional[str],
        user_id: Optional[str],
        use_ai: bool = False,
    ) -> DocumentAnalysis:
        q = db.query(models.Resume).filter(models.Resume.id == uuid.UUID(document_id))
        if user_id:
            q = q.filter(models.Resume.user_id == uuid.UUID(user_id))
        doc = q.first()
        if not doc:
            raise ValueError("Document not found or access denied")
        resume_text = doc.text or ""

        job_keywords: List[str] = []
        required_tech: List[str] = []
        req_phrases: List[str] = []
        if job_id:
            job = db.query(models.Job).filter(models.Job.id == uuid.UUID(job_id)).first()
            if job:
                required_tech = [(s or "").strip().lower() for s in (job.skills or []) if s]
                req_phrases = [(r or "").strip().lower() for r in (job.requirements or []) if r]
                job_keywords = list({*required_tech, *self._extract_keywords_from_job(job)})

        if job_id:
            analysis = self._analyze_against_job(
                resume_text=resume_text,
                required_tech=required_tech,
                requirements=req_phrases,
                extra_keywords=job_keywords,
                use_ai=use_ai and self._llm is not None,
            )
        else:
            analysis = self._perform_general_resume_analysis(resume_text)

        if job_id:
            ats = ATSScore(
                overall_score=analysis["overall_score"],
                formatting_score=analysis["formatting_score"],
                keyword_score=analysis["keyword_score"],
                readability_score=analysis["readability_score"],
                technical_skills_score=analysis["technical_skills_score"],
                soft_skills_score=analysis["soft_skills_score"],
                suggestions=analysis["recommendations"],
            )
            return DocumentAnalysis(
                word_count=analysis["word_count"],
                keyword_density=analysis.get("keyword_analysis", {}).get("keyword_density", {}),
                readability_score=analysis["readability_score"],
                ats_score=ats,
                suggested_improvements=analysis["recommendations"],
                missing_sections=[],
                job_match_summary={"summary": analysis.get("job_match_summary", "")},
                keyword_analysis=analysis.get("keyword_analysis"),
                missing_skills={"skills": analysis.get("missing_skills", [])},
            )
        else:
            ats = ATSScore(
                overall_score=analysis["overall_score"],
                formatting_score=analysis["formatting_score"],
                keyword_score=analysis["completeness_score"],
                readability_score=analysis["readability_score"],
                technical_skills_score=None,
                soft_skills_score=None,
                suggestions=analysis["suggestions"],
            )
            return DocumentAnalysis(
                word_count=analysis["word_count"],
                keyword_density={},
                readability_score=analysis["readability_score"],
                ats_score=ats,
                suggested_improvements=analysis["suggestions"],
                missing_sections=analysis["missing_sections"],
                job_match_summary={"summary": "General resume analysis - select a job for detailed matching"},
                keyword_analysis={"keywords_found": [], "keywords_missing": []},
                missing_skills={"skills": []},
            )

    def _normalize_tokens(self, text: str) -> List[str]:
        toks = re.findall(r"[a-zA-Z0-9\+\#\.]{2,}", text.lower())
        fix = {"nodejs": "node.js", "node": "node.js"}
        out = []
        for t in toks:
            out.append(fix.get(t, t))
        return out

    def _analyze_against_job(
        self,
        resume_text: str,
        required_tech: List[str],
        requirements: List[str],
        extra_keywords: List[str],
        use_ai: bool,
    ) -> Dict[str, Any]:
        text_lower = resume_text.lower()
        tokens = set(self._normalize_tokens(resume_text))

        req_tech_norm = [s.lower() for s in required_tech if s]
        found_tech = [s for s in req_tech_norm if s in text_lower]
        tech_score = (len(found_tech) / max(1, len(set(req_tech_norm)))) * 100

        req_keywords: List[str] = []
        for line in requirements:
            req_keywords.extend(self._normalize_tokens(line))
        req_keywords = list({k for k in req_keywords if len(k) >= 3})
        found_req = [k for k in req_keywords if k in tokens]
        req_score = (len(found_req) / max(1, len(req_keywords))) * 100

        extra_norm = [k.lower() for k in extra_keywords if k]
        found_extra = [k for k in extra_norm if k in text_lower]
        keyword_score = min(100.0, (len(set(found_extra)) / max(1, len(set(extra_norm)))) * 100)

        soft_lib = [
            "leadership", "communication", "teamwork", "collaboration",
            "problem solving", "analytical", "mentoring", "ownership",
        ]
        found_soft = [s for s in soft_lib if s in text_lower]
        soft_score = (len(found_soft) / len(soft_lib)) * 100

        formatting_score = 80.0 if SAFE_BULLET in resume_text or "-" in resume_text else 60.0
        readability_score = 85.0 if len(resume_text.split()) >= 200 else 60.0

        overall = (
            0.45 * tech_score
            + 0.25 * req_score
            + 0.20 * keyword_score
            + 0.10 * soft_score
        )

        recommendations: List[str] = []
        missing_tech = [s for s in set(req_tech_norm) if s not in text_lower]
        missing_soft = [s for s in soft_lib if s not in text_lower]
        if missing_tech:
            recommendations.append(f"Highlight these relevant skills if you have them: {', '.join(missing_tech[:8])}")
        if req_score < 60:
            recommendations.append("Mirror wording from the job’s requirements in your bullets where truthful.")
        if keyword_score < 60:
            recommendations.append("Add role/industry keywords from the job post (titles, domain terms).")

        if use_ai and self._llm is not None:
            try:
                prompt = (
                    "You are a resume-tailoring assistant. Your job is to produce 5–8 HIGH-IMPACT, TRUTH-PRESERVING suggestions.\n"
                    "Rules: no fabrications; suggestions only, each ≤ 220 chars."
                )
                msg = [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"RESUME:\n{resume_text[:6000]}"},
                    {"role": "user", "content": f"JOB SKILLS:\n{', '.join(required_tech)}\n\nREQUIREMENTS:\n" + "\n".join(requirements[:40])},
                ]
                resp = self._llm.chat.completions.create(
                    model=os.getenv("RESUME_MODEL", "gpt-4o-mini"),
                    temperature=0.2,
                    messages=msg,
                    max_tokens=500,
                )
                llm_suggestions = (resp.choices[0].message.content or "").strip()
                if llm_suggestions:
                    for line in re.split(r"[\r\n]+", llm_suggestions):
                        line = line.strip(" -•\t")
                        if 8 <= len(line) <= 220:
                            recommendations.append(line)
            except Exception as e:
                print(f"[documents] AI suggestion failed: {e}")

        job_match_summary = (
            f"Tech skills match: {tech_score:.0f}%, Requirements match: {req_score:.0f}%, "
            f"Keywords: {keyword_score:.0f}%"
        )

        return {
            "word_count": len(resume_text.split()),
            "overall_score": overall,
            "formatting_score": formatting_score,
            "readability_score": readability_score,
            "keyword_score": keyword_score,
            "technical_skills_score": tech_score,
            "soft_skills_score": soft_score,
            "recommendations": recommendations,
            "missing_sections": [],
            "job_match_summary": job_match_summary,
            "keyword_analysis": {
                "keywords_found": list({*found_tech, *found_extra}),
                "keywords_missing": missing_tech,
                "keyword_density": {k: resume_text.lower().count(k) for k in set(found_tech)},
            },
            "missing_skills": missing_tech + missing_soft,
        }

    def _perform_general_resume_analysis(self, text_content: str) -> dict:
        from .service import SAFE_BULLET
        import re
        lines = text_content.split("\n")
        words = text_content.split()
        word_count = len(words)

        contact_score, structure_score, content_score, formatting_score = 0, 0, 0, 0
        email_ok = bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', text_content))
        if email_ok: contact_score += 33
        phone_ok = bool(re.search(r'\+?\d[\d\s\-().]{7,}', text_content))
        if phone_ok: contact_score += 33
        name_ok = bool(re.search(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', text_content))
        if name_ok: contact_score += 34

        tl = text_content.lower()
        for key in ("experience", "education", "skills"):
            if key in tl: structure_score += 33.3

        if 200 <= word_count <= 1200: content_score += 35
        if SAFE_BULLET in text_content or "-" in text_content: content_score += 25
        if re.search(r'\b\d{4}\b', text_content): content_score += 20
        if any(v in tl for v in ("managed", "built", "developed", "designed")): content_score += 20

        non_ascii = [c for c in text_content if ord(c) > 126]
        if len(non_ascii) < 0.05 * max(1, len(text_content)): formatting_score += 40
        if len([ln for ln in lines if not ln.strip()]) < 0.35 * max(1, len(lines)): formatting_score += 35

        overall = (contact_score + structure_score + content_score + formatting_score) / 4.0
        return {
            "word_count": word_count,
            "overall_score": overall,
            "formatting_score": formatting_score,
            "readability_score": content_score,
            "completeness_score": (contact_score + structure_score) / 2.0,
            "suggestions": [
                *([] if email_ok else ["Add a professional email."]),
                *([] if phone_ok else ["Add a phone number."]),
                *([] if name_ok else ["Ensure your name is prominent at the top."]),
            ],
            "missing_sections": [s for s in ("experience", "education", "skills") if s not in tl],
        }

    def _extract_keywords_from_job(self, job) -> List[str]:
        import re
        kws = set()
        if job.title:
            kws.update([w.lower() for w in re.findall(r'\b[A-Za-z]{3,}\b', job.title)])
        if job.description:
            txt = job.description.lower()
            tech_patterns = [
                r'\b(python|javascript|java|c\+\+|c#|php|ruby|go|rust)\b',
                r'\b(react|angular|vue|node\.?js|express|django|flask|spring)\b',
                r'\b(sql|mysql|postgresql|mongodb|redis|elasticsearch)\b',
                r'\b(aws|azure|gcp|docker|kubernetes|jenkins|git)\b',
                r'\b(html|css|scss|sass|bootstrap|tailwind)\b',
                r'\b(api|rest|graphql|microservices|devops|ci/cd)\b',
            ]
            for pat in tech_patterns:
                kws.update(re.findall(pat, txt))
        return list(kws)

    # ============== Optimizer ==============

    def optimize_document(self, db: Session, request: DocumentOptimizationRequest) -> str:
        doc = db.query(models.Resume).filter(models.Resume.id == uuid.UUID(request.document_id)).first()
        if not doc:
            raise ValueError("Document not found")
        optimized = doc.text or ""
        for kw in request.target_keywords or []:
            if kw.lower() not in optimized.lower():
                optimized += f"\n{SAFE_BULLET} Experience with {kw}"
        notes = "\n\n[Optimization goals]\n" + "\n".join(f"{SAFE_BULLET} {g}" for g in (request.optimization_goals or []))
        return optimized + notes

    # ============== Cover letter ==============

    async def generate_cover_letter(self, db: Session, user_id: str, request: CoverLetterRequest) -> dict:
        resume_content = ""
        if request.resume_id:
            r = db.query(models.Resume).filter(models.Resume.id == uuid.UUID(request.resume_id)).first()
            if r:
                resume_content = r.text or ""

        if self.ai_cover_letter_service is not None:
            try:
                result = await self.ai_cover_letter_service.generate_intelligent_cover_letter(
                    db=db,
                    job_id=request.job_id,
                    resume_content=resume_content,
                    user_profile={},
                    tone=request.tone,
                    length=request.length,
                )
                if result.get("success"):
                    return result
            except Exception as e:
                print(f"[documents] AI cover letter failed, falling back: {e}")

        return self._generate_template_cover_letter(db, request, resume_content)

    def _generate_template_cover_letter(self, db: Session, request: CoverLetterRequest, resume_content: str) -> dict:
        q = (
            db.query(models.Job, models.Company.name.label("company_name"))
            .outerjoin(models.Company, models.Job.company_id == models.Company.id)
            .filter(models.Job.id == uuid.UUID(request.job_id))
        )
        result = q.first()
        if not result:
            raise ValueError("Job not found")
        job, company_name = result
        cover_letter = self._cover_letter_text(
            job_title=job.title,
            company_name=company_name or "the company",
            tone=request.tone,
            length=request.length,
            focus_areas=request.focus_areas,
            custom_intro=request.custom_intro,
        )
        wc = len(cover_letter.split())
        return {
            "success": True,
            "cover_letter": cover_letter,
            "word_count": wc,
            "estimated_reading_time": f"{max(1, wc // 200)} minutes",
            "model_used": "template_fallback",
        }

    def _cover_letter_text(self, job_title: str, company_name: str, tone: str, length: str,
                           focus_areas: List[str], custom_intro: Optional[str]) -> str:
        intro = custom_intro or f"I am writing to express my strong interest in the {job_title} position at {company_name}."
        if tone == "enthusiastic":
            body_tone = "I am excited about the opportunity to contribute to your team and bring my passion to this role."
        elif tone == "confident":
            body_tone = "With my proven track record and expertise, I am confident I would be a valuable addition to your team."
        else:
            body_tone = "I believe my background and experience make me well-suited for this position."
        focus = f"\n\nI am particularly drawn to this role because of my experience in {', '.join(focus_areas)}." if focus_areas else ""
        conclusion = f"Thank you for considering my application. I look forward to the opportunity to discuss how I can contribute to {company_name}'s success."
        return f"""Dear Hiring Manager,

{intro}

{body_tone}{focus}

Based on the job requirements, I have relevant experience that aligns well with what you're looking for. My background includes the skills and qualifications mentioned in the job posting.

{conclusion}

Sincerely,
[Your Name]"""

    # ============== Templates (added) ==============

    def get_document_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Return a lightweight, hard-coded set of templates.
        You can replace this with DB-backed templates later.
        """
        templates = [
            {
                "id": "basic-resume-1",
                "name": "Clean Resume",
                "description": "Simple, ATS-friendly layout.",
                "type": "resume",
                "category": "resume",
                "preview_url": None,
                "is_premium": False,
            },
            {
                "id": "modern-resume-1",
                "name": "Modern Resume",
                "description": "Subtle typography, clear sections.",
                "type": "resume",
                "category": "resume",
                "preview_url": None,
                "is_premium": True,
            },
            {
                "id": "classic-cover-1",
                "name": "Classic Cover Letter",
                "description": "Professional tone and structure.",
                "type": "cover_letter",
                "category": "cover_letter",
                "preview_url": None,
                "is_premium": False,
            },
        ]
        if category:
            templates = [t for t in templates if t["category"] == category]
        return templates
