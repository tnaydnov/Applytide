# backend/app/domain/documents/service.py
from __future__ import annotations

from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import uuid
import json
import os
import mimetypes
import re
from fastapi import HTTPException

from ...db import models
from ...infra.files.document_store import DocumentStore, sanitize_display_name
from ...infra.extractors.text_extractor import TextExtractor, SAFE_BULLET
from ...api.schemas.documents import (
    DocumentType, DocumentStatus, DocumentFormat,
    DocumentAnalysis, ATSScore, CoverLetterRequest, DocumentOptimizationRequest,
    DocumentResponse, DocumentListResponse
)

# Optional OpenAI (sync) for resume analysis details
try:
    from openai import OpenAI  # type: ignore
    _OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
except Exception:
    OpenAI = None  # type: ignore
    _OPENAI_API_KEY = ""

class DocumentService:
    """
    Same public methods as the old DocumentService, but with clean adapters.
    - File IO & sidecars via DocumentStore
    - Text extraction via TextExtractor (PDF extractor provided by infra)
    - Reuses existing ai_cover_letter and pdf_extractor services
    """

    def __init__(self, store: DocumentStore, extractor: TextExtractor):
        self.store = store
        self.extractor = extractor

        # AI cover letter (optional)
        self.ai_cover_letter_service = None
        try:
            from ...infra.external.ai_cover_letter_provider import AICoverLetterService
            self.ai_cover_letter_service = AICoverLetterService()
        except Exception as e:
            print(f"[documents] AI cover letter unavailable: {e}")

        # optional LLM
        self._llm = None
        if OpenAI and _OPENAI_API_KEY:
            try:
                self._llm = OpenAI(api_key=_OPENAI_API_KEY)
            except Exception as e:
                print(f"[documents] OpenAI init failed: {e}")
                self._llm = None

    # ---------------- Core helpers ----------------

    def _sidecar(self, file_path: Path) -> Dict[str, Any]:
        return self.store.read_sidecar(file_path)

    def _write_sidecar(self, file_path: Path, data: Dict[str, Any]) -> None:
        self.store.write_sidecar(file_path, data)

    # ---------------- Upload / CRUD ----------------

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
        # save content
        file_path = self.store.save_bytes(file_content, filename)

        # extract text
        text_content = self.extractor.extract_text(file_path)
        safe_label = sanitize_display_name(display_name or Path(filename).stem)

        row = models.Resume(
            id=file_id,
            user_id=uuid.UUID(user_id) if user_id else None,
            label=safe_label,
            file_path=str(file_path),
            text=text_content,
        )
        db.add(row); db.commit(); db.refresh(row)

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

    def resolve_document_response(self, row: models.Resume) -> DocumentResponse:
        p = Path(row.file_path)
        side = self._sidecar(p)
        resolved_type = DocumentType(side.get("type", "resume"))
        resolved_name = side.get("name", row.label)
        resolved_meta = side.get("metadata", {})
        resolved_status = DocumentStatus(side.get("status", DocumentStatus.ACTIVE.value))
        raw_ext = (p.suffix[1:] if p.suffix else "txt").lower()
        ext = {"doc": "docx"}.get(raw_ext, raw_ext)
        audio_exts = {"mp3", "m4a", "aac", "wav", "flac", "ogg", "opus"}
        if ext in {"pdf", "docx", "txt", "html"}:
            fmt = DocumentFormat(ext)
        elif ext in audio_exts:
            fmt = DocumentFormat.AUDIO
        else:
            fmt = DocumentFormat.TXT
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
                side = self._sidecar(Path(r.file_path))
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
            Path(doc.file_path).with_suffix(Path(doc.file_path).suffix + ".meta.json").unlink(missing_ok=True)
        except Exception:
            pass
        db.delete(doc); db.commit()

    def update_status(self, db: Session, user_id: str, document_id: str, status: DocumentStatus) -> DocumentResponse:
        doc = (
            db.query(models.Resume)
            .filter(models.Resume.id == uuid.UUID(document_id), models.Resume.user_id == uuid.UUID(user_id))
            .first()
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        p = Path(doc.file_path)
        side = self._sidecar(p)
        side["status"] = status.value
        self._write_sidecar(p, side)
        return self.resolve_document_response(doc)

    # ---------------- Download / Preview ----------------

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

        side = self._sidecar(path)
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

        if ext == ".pdf" and p.exists():
            media, _ = mimetypes.guess_type(str(p))
            return "inline_file", {"path": str(p), "media": media or "application/pdf"}

        if ext in {".mp3", ".m4a", ".aac", ".wav", ".flac", ".ogg", ".opus"} and p.exists():
            media, _ = mimetypes.guess_type(str(p))
            return "inline_file", {"path": str(p), "media": media or "audio/mpeg"}

        if ext == ".docx":
            preview_pdf = p.with_suffix(".preview.pdf")
            if preview_pdf.exists():
                return "inline_file", {"path": str(preview_pdf), "media": "application/pdf"}

            if self._llm is not None:
                try:
                    html_content = self._generate_html_via_openai(doc.text or "")
                    return "html", {"content": html_content}
                except Exception as e:
                    print(f"[documents] Failed to generate HTML preview via OpenAI: {e}")

            try:
                processed = (doc.text or "")
                processed = processed.replace('•', '<div class="bullet">')
                processed = processed.replace('\n•', '</div>\n<div class="bullet">')
                processed = processed.replace('\n', '<br>')
                html_content = f"""<!DOCTYPE html>
<html><head><title>Resume Preview</title>
<style>
body {{ font-family: 'Calibri', Arial, sans-serif; line-height:1.4; padding:40px; max-width:800px; margin:0 auto; color:#333; }}
h1 {{ font-size:18px; font-weight:bold; border-bottom:1px solid #ddd; padding-bottom:8px; margin-top:20px; }}
.bullet {{ margin-left:20px; position:relative; }}
.bullet:before {{ content:"•"; position:absolute; left:-15px; }}
</style></head><body>
<h1>Resume Preview</h1>
<div style="white-space: pre-wrap;">{processed}</div>
</body></html>"""
                return "html", {"content": html_content}
            except Exception:
                pass

        text = doc.text or ""
        return "text", {"text": text or "(no preview text available)"}

    # ---------------- Analysis / Optimization ----------------

    def _generate_html_via_openai(self, text: str) -> str:
        if self._llm is None:
            raise RuntimeError("OpenAI not configured")
        resp = self._llm.chat.completions.create(
            model=os.getenv("RESUME_MODEL", "gpt-4o-mini"),
            temperature=0.2,
            messages=[
                {"role": "system", "content": "You are a formatter that turns plain resume text into simple semantic HTML. Do not invent content."},
                {"role": "user", "content": text[:6000]},
            ],
        )
        return resp.choices[0].message.content or "<div>(no preview)</div>"

    def _normalize_tokens(self, text: str) -> List[str]:
        toks = re.findall(r"[a-zA-Z0-9\+\#\.]{2,}", text.lower())
        fix = {"nodejs": "node.js", "node": "node.js"}
        return [fix.get(t, t) for t in toks]

    def _log_analysis_data(self, job_meta, requirements, required_tech, resume_text):
        try:
            from pathlib import Path as _P
            from datetime import datetime as _Dt
            log_dir = _P.home() / "Desktop" / "ApplytideLogs"
            log_dir.mkdir(parents=True, exist_ok=True)
            timestamp = _Dt.now().strftime("%Y%m%d_%H%M%S")
            log_file = log_dir / f"job_analysis_{timestamp}.txt"
            with open(log_file, "w", encoding="utf-8") as f:
                f.write("===== JOB META =====\n")
                f.write(f"{job_meta}\n\n")
                f.write("===== REQUIREMENTS =====\n")
                f.write("\n".join(requirements) + "\n\n")
                f.write("===== REQUIRED TECH =====\n")
                f.write("\n".join(required_tech) + "\n\n")
                f.write("===== RESUME TEXT =====\n")
                f.write(f"{resume_text}\n\n")
            return str(log_file)
        except Exception as e:
            print(f"Error writing analysis to log file: {str(e)}")
            return None

    def _extract_keywords_from_job(self, job) -> List[str]:
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

    def _perform_general_resume_analysis(self, text_content: str) -> dict:
        lines = text_content.split("\n")
        words = text_content.split()
        word_count = len(words)

        contact_score = 0
        email_ok = bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', text_content))
        if email_ok: contact_score += 33
        phone_ok = bool(re.search(r'\+?\d[\d\s\-().]{7,}', text_content))
        if phone_ok: contact_score += 33
        name_ok = bool(re.search(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', text_content))
        if name_ok: contact_score += 34

        # quick structure/missing sections proxy
        missing_sections = []
        critical = ["Technical Skills", "Work Experience", "Education"]
        for c in critical:
            if c.lower() not in text_content.lower():
                missing_sections.append(c)

        action_verbs = ["managed", "led", "built", "created", "developed", "designed", "implemented",
                        "achieved", "improved", "increased", "reduced", "negotiated", "coordinated"]
        action_verb_count = sum(1 for v in action_verbs if v in text_content.lower())
        action_verb_score = min(100, action_verb_count * 10)
        bullet_count = text_content.count(SAFE_BULLET)
        bullet_score = min(100, bullet_count * 5)
        has_dates = bool(re.search(r'\b(19|20)\d{2}\b', text_content))
        date_score = 80 if has_dates else 0
        content_score = (action_verb_score * 0.4 + bullet_score * 0.3 + date_score * 0.3)

        non_ascii = [c for c in text_content if ord(c) > 126]
        formatting_score = 0
        if len(non_ascii) < 0.05 * max(1, len(text_content)): formatting_score += 40
        if len([ln for ln in lines if not ln.strip()]) < 0.35 * max(1, len(lines)): formatting_score += 35
        if bullet_count > 0: formatting_score += 25
        formatting_score = min(100, formatting_score)

        suggestions = []
        if not email_ok: suggestions.append("Add a professional email address")
        if not phone_ok: suggestions.append("Include a phone number for contact")
        if not name_ok: suggestions.append("Make your full name prominent at the top")
        for s in missing_sections:
            suggestions.append(f"Add a {s} section")
        if action_verb_count < 5:
            suggestions.append("Use more action verbs like 'achieved', 'implemented', or 'developed'")
        if bullet_count < 5:
            suggestions.append("Use bullet points to make accomplishments stand out")
        if not has_dates:
            suggestions.append("Include dates for your experiences and education")

        overall = (contact_score * 0.25 + (100 - 25*len(missing_sections)) * 0.25 + content_score * 0.25 + formatting_score * 0.25)

        return {
            "word_count": word_count,
            "overall_score": overall,
            "formatting_score": formatting_score,
            "readability_score": content_score,
            "completeness_score": (contact_score + (100 - 25*len(missing_sections))) / 2.0,
            "suggestions": suggestions,
            "missing_sections": missing_sections,
            "section_quality": {},
            "action_verb_count": action_verb_count
        }

    def _analyze_against_job(
        self,
        resume_text: str,
        required_tech: List[str],
        requirements: List[str],
        extra_keywords: List[str],
        use_ai: bool,
        job_meta: str,
    ) -> Dict[str, Any]:
        text_lower = resume_text.lower()
        tokens = set(self._normalize_tokens(resume_text))

        tech_keywords = [k.lower() for k in required_tech]
        general_keywords = [k.lower() for k in extra_keywords if k.lower() not in tech_keywords]
        found_tech = [s for s in tech_keywords if s in text_lower]
        tech_score = (len(found_tech) / max(1, len(set(tech_keywords)))) * 100

        req_keywords: List[str] = []
        for line in requirements:
            req_keywords.extend(self._normalize_tokens(line))
        req_keywords = list({k for k in req_keywords if len(k) >= 3})
        found_req = [k for k in req_keywords if k in tokens]
        req_score = (len(found_req) / max(1, len(req_keywords))) * 100

        extra_norm = [k.lower() for k in extra_keywords if k]
        found_extra = [k for k in extra_norm if k in text_lower]
        keyword_score = min(100.0, (len(set(found_extra)) / max(1, len(set(extra_norm)))) * 100)

        # soft skills (only if explicitly present in job)
        job_description = "\n".join(requirements)
        common_soft_skills = {
            "leadership": ["lead", "leadership", "manage", "oversee", "direct"],
            "communication": ["communicate", "presentation", "articulate", "write", "speak"],
            "teamwork": ["team", "collaborate", "cooperation", "group"],
            "problem solving": ["solve", "solution", "resolve", "troubleshoot"],
            "adaptability": ["adapt", "flexible", "versatile", "agile"],
            "time management": ["deadline", "time management", "prioritize", "schedule"],
        }
        relevant_soft_skills = [s for s, kws in common_soft_skills.items() if any(k in job_description.lower() for k in kws)]
        if relevant_soft_skills:
            found_soft = [s for s in relevant_soft_skills if s in text_lower]
            soft_score = (len(found_soft) / len(relevant_soft_skills)) * 100
        else:
            soft_score = 100
        soft_weight = 0.1 if len(relevant_soft_skills) >= 2 else 0.05

        formatting_score = 80.0 if SAFE_BULLET in resume_text or "-" in resume_text else 60.0
        readability_score = 85.0 if len(resume_text.split()) >= 200 else 60.0

        overall = (0.45 * tech_score + 0.25 * req_score + (0.30 - soft_weight) * keyword_score + soft_weight * soft_score)

        recommendations: List[str] = []
        missing_tech = [k for k in tech_keywords if k not in text_lower]
        missing_keywords = [k for k in general_keywords if k not in text_lower]
        if missing_tech:
            recommendations.append(f"Highlight these relevant skills if you have them: {', '.join(missing_tech[:8])}")
        if req_score < 60:
            recommendations.append("Mirror wording from the job’s requirements in your bullets where truthful.")
        if keyword_score < 60:
            recommendations.append("Add role/industry keywords from the job post (titles, domain terms).")

        analysis_result = {}
        if use_ai and self._llm is not None:
            try:
                prompt = "You are an expert resume analyzer. Respond with valid JSON as instructed."
                msg = [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"JOB INFO:\n{job_meta}\n\nREQUIREMENTS:\n" + "\n".join(requirements[:40])},
                    {"role": "user", "content": f"REQUIRED TECH (parsed):\n{', '.join(required_tech)}"},
                    {"role": "user", "content": f"RESUME TEXT:\n{resume_text[:6000]}"},
                ]
                resp = self._llm.chat.completions.create(
                    model=os.getenv("RESUME_MODEL", "gpt-4o-mini"),
                    temperature=0.2,
                    messages=msg,
                    response_format={"type": "json_object"},
                    max_tokens=2000,
                )
                try:
                    ai_analysis = json.loads(resp.choices[0].message.content)
                    for improvement in ai_analysis.get("technical_skills", {}).get("improvements", []):
                        if improvement.get("suggestion"):
                            recommendations.append(f"**{improvement['suggestion']}**")
                    for improvement in ai_analysis.get("keywords", {}).get("improvements", []):
                        if improvement.get("suggestion"):
                            recommendations.append(f"**{improvement['suggestion']}**")
                    for improvement in ai_analysis.get("overall_suggestions", []):
                        recommendations.append(f"**{improvement}**")
                    analysis_result["ai_detailed_analysis"] = ai_analysis
                except Exception as e:
                    print(f"[documents] Failed to parse AI response: {e}")
            except Exception as e:
                print(f"[documents] AI suggestion failed: {e}")

        job_match_summary = f"Tech skills match: {tech_score:.0f}%, Requirements match: {req_score:.0f}%, Keywords: {keyword_score:.0f}%"

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
                "keywords_found": list({*found_extra}),
                "keywords_missing": missing_keywords,
                "keyword_density": {k: resume_text.lower().count(k) for k in set(found_extra)},
            },
            "tech_analysis": {
                "tech_found": found_tech,
                "tech_missing": missing_tech,
            },
            "missing_skills": missing_tech,
            "ai_detailed_analysis": analysis_result.get("ai_detailed_analysis", {})
        }

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
        job = None
        if job_id:
            job = db.query(models.Job).filter(models.Job.id == uuid.UUID(job_id)).first()
            if job:
                required_tech = [(s or "").strip().lower() for s in (job.skills or []) if s]
                req_phrases = [(r or "").strip().lower() for r in (job.requirements or []) if r]
                job_keywords = list({*required_tech, *self._extract_keywords_from_job(job)})

        if job_id and job:
            job_title = job.title or ""
            job_location = getattr(job, "location", "") or ""
            company_name = None
            if job.company_id:
                comp = db.get(models.Company, job.company_id)
                company_name = comp.name if comp else ""
            job_meta = f"TITLE: {job_title}\nLOCATION: {job_location}\nCOMPANY: {company_name or ''}"
            analysis = self._analyze_against_job(
                resume_text=resume_text,
                required_tech=required_tech,
                requirements=req_phrases,
                extra_keywords=job_keywords,
                use_ai=use_ai and self._llm is not None,
                job_meta=job_meta,
            )
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
                ai_detailed_analysis=analysis.get("ai_detailed_analysis"),
                section_quality=None,
                action_verb_count=None,
            )
        else:
            gen = self._perform_general_resume_analysis(resume_text)
            ats = ATSScore(
                overall_score=gen["overall_score"],
                formatting_score=gen["formatting_score"],
                keyword_score=gen["completeness_score"],
                readability_score=gen["readability_score"],
                technical_skills_score=None,
                soft_skills_score=None,
                suggestions=gen["suggestions"],
            )
            # optional AI “detailed” general analysis (no job)
            ai_detailed = {}
            if self._llm is not None and use_ai:
                try:
                    ai_detailed = {
                        "detected_headers": [],
                        "expected_sections": [],
                        "technical_skills": {"strengths": [], "weaknesses": [], "missing_elements": [], "improvements": []},
                        "keywords": {"strengths": [], "weaknesses": [], "missing_elements": [], "improvements": []},
                        "soft_skills": {"relevant_skills": [], "missing_elements": [], "improvements": []},
                        "formatting": {"strengths": [], "weaknesses": [], "improvements": []},
                        "overall_suggestions": [],
                    }
                except Exception:
                    pass
            return DocumentAnalysis(
                word_count=gen["word_count"],
                keyword_density={},
                readability_score=gen["readability_score"],
                ats_score=ats,
                suggested_improvements=gen["suggestions"],
                missing_sections=gen["missing_sections"],
                job_match_summary={"summary": "General resume analysis - select a job for detailed matching"},
                keyword_analysis=None,
                missing_skills={"skills": []},
                ai_detailed_analysis=ai_detailed,
                section_quality=gen.get("section_quality"),
                action_verb_count=gen.get("action_verb_count"),
            )

    def optimize_document(self, db: Session, request: DocumentOptimizationRequest) -> str:
        doc = db.query(models.Resume).filter(models.Resume.id == uuid.UUID(request.document_id)).first()
        if not doc:
            raise ValueError("Document not found")
        optimized = doc.text or ""
        for kw in request.target_keywords or []:
            if kw.lower() not in (optimized or "").lower():
                optimized += f"\n{SAFE_BULLET} Experience with {kw}"
        notes = "\n\n[Optimization goals]\n" + "\n".join(f"{SAFE_BULLET} {g}" for g in (request.optimization_goals or []))
        return (optimized or "") + notes

    # ---------------- Cover letters / Templates ----------------

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

    def get_document_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        templates = [
            {"id": "basic-resume-1","name": "Clean Resume","description": "Simple, ATS-friendly layout.",
             "type": "resume","category": "resume","preview_url": None,"is_premium": False},
            {"id": "modern-resume-1","name": "Modern Resume","description": "Subtle typography, clear sections.",
             "type": "resume","category": "resume","preview_url": None,"is_premium": True},
            {"id": "classic-cover-1","name": "Classic Cover Letter","description": "Professional tone and structure.",
             "type": "cover_letter","category": "cover_letter","preview_url": None,"is_premium": False},
        ]
        if category:
            templates = [t for t in templates if t["category"] == category]
        return templates
