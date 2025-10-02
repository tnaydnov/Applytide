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
import hashlib
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
    
    # === LLM-first analysis helpers =============================================

    def _clamp_pct(self, x, default=0.0):
        try:
            x = float(x)
        except Exception:
            return float(default)
        return max(0.0, min(100.0, x))

    def _coerce_list(self, v):
        if not v:
            return []
        if isinstance(v, list):
            return [str(x) for x in v if x is not None]
        return [str(v)]

    def _normalize_ai_detailed_analysis(self, ai_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ensure ai_detailed_analysis always has complete structure with all keys.
        Fills missing keys with empty arrays/objects so frontend doesn't need fallbacks.
        """
        if not isinstance(ai_data, dict):
            ai_data = {}
        
        # Start with complete skeleton
        normalized = {
            "detected_headers": self._coerce_list(ai_data.get("detected_headers")),
            "expected_sections": self._coerce_list(ai_data.get("expected_sections")),
            "technical_skills": {
                "strengths": self._coerce_list(ai_data.get("technical_skills", {}).get("strengths")),
                "weaknesses": self._coerce_list(ai_data.get("technical_skills", {}).get("weaknesses")),
                "missing_elements": self._coerce_list(ai_data.get("technical_skills", {}).get("missing_elements")),
                "improvements": ai_data.get("technical_skills", {}).get("improvements") or [],
            },
            "keywords": {
                "strengths": self._coerce_list(ai_data.get("keywords", {}).get("strengths")),
                "weaknesses": self._coerce_list(ai_data.get("keywords", {}).get("weaknesses")),
                "missing_elements": self._coerce_list(ai_data.get("keywords", {}).get("missing_elements")),
                "keywords_found": self._coerce_list(ai_data.get("keywords", {}).get("keywords_found")),
                "keywords_missing": self._coerce_list(ai_data.get("keywords", {}).get("keywords_missing")),
                "improvements": ai_data.get("keywords", {}).get("improvements") or [],
            },
            "soft_skills": {
                "relevant_skills": self._coerce_list(ai_data.get("soft_skills", {}).get("relevant_skills")),
                "missing_elements": self._coerce_list(ai_data.get("soft_skills", {}).get("missing_elements")),
                "improvements": ai_data.get("soft_skills", {}).get("improvements") or [],
            },
            "formatting": {
                "strengths": self._coerce_list(ai_data.get("formatting", {}).get("strengths")),
                "weaknesses": self._coerce_list(ai_data.get("formatting", {}).get("weaknesses")),
                "improvements": ai_data.get("formatting", {}).get("improvements") or [],
            },
            "overall_suggestions": self._coerce_list(ai_data.get("overall_suggestions")),
        }
        return normalized

    def _llm_call(self, *, system: str, user: str, max_tokens: int = 2600) -> dict:
        """Safe LLM call that always returns a JSON object or {}."""
        if self._llm is None:
            return {}
        resp = self._llm.chat.completions.create(
            model=os.getenv("RESUME_MODEL", "gpt-4o-mini"),
            temperature=0.0,
            top_p=1.0,
            presence_penalty=0,
            frequency_penalty=0,
            response_format={"type": "json_object"},
            messages=[{"role": "system", "content": system},
                    {"role": "user", "content": user}],
            max_tokens=max_tokens,
        )
        try:
            content = resp.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception:
            return {}

    def _compute_cache_key(self, document_id: str, job_id: Optional[str], 
                          resume_text: str, job_context: str = "") -> str:
        """
        Generate cache key: (document_id, job_id or "general", sha256(resume_text), sha256(job_context))
        """
        resume_hash = hashlib.sha256(resume_text.encode('utf-8')).hexdigest()[:16]
        job_hash = hashlib.sha256(job_context.encode('utf-8')).hexdigest()[:16] if job_context else "none"
        job_key = job_id or "general"
        return f"{document_id}_{job_key}_{resume_hash}_{job_hash}"

    def _read_analysis_cache(self, file_path: Path, cache_key: str) -> Optional[Dict[str, Any]]:
        """Read cached analysis from sidecar if exists and matches key."""
        try:
            side = self._sidecar(file_path)
            cache = side.get("analysis_cache", {})
            
            if not cache:
                print(f"[cache] MISS: No cache found for {file_path.name}")
                return None
                
            stored_key = cache.get("cache_key")
            if stored_key != cache_key:
                print(f"[cache] MISS: Key mismatch for {file_path.name}")
                print(f"[cache]   Expected: {cache_key[:50]}...")
                print(f"[cache]   Found: {stored_key[:50] if stored_key else 'None'}...")
                return None
            
            cached_data = cache.get("data")
            if not cached_data:
                print(f"[cache] MISS: No data in cache for {file_path.name}")
                return None
                
            # Validate it has minimum required structure
            if not isinstance(cached_data, dict):
                print(f"[cache] MISS: Invalid cache data type for {file_path.name}")
                return None
                
            if "ats_score" not in cached_data:
                print(f"[cache] MISS: Missing ats_score in cache for {file_path.name}")
                return None
            
            cached_at = cache.get("cached_at")
            print(f"[cache] HIT: Loaded from cache (cached at: {cached_at})")
            return cached_data
            
        except Exception as e:
            print(f"[cache] ERROR: Cache read failed: {e}")
            import traceback
            traceback.print_exc()
        return None

    def _write_analysis_cache(self, file_path: Path, cache_key: str, analysis_data: Dict[str, Any]) -> None:
        """Write analysis to sidecar cache."""
        try:
            from datetime import datetime
            
            side = self._sidecar(file_path)
            side["analysis_cache"] = {
                "cache_key": cache_key,
                "data": analysis_data,
                "cached_at": datetime.now().isoformat()
            }
            self._write_sidecar(file_path, side)
            print(f"[cache] WRITE: Cached analysis for {file_path.name}")
            print(f"[cache]   Key: {cache_key[:50]}...")
        except Exception as e:
            print(f"[cache] ERROR: Cache write failed: {e}")
            import traceback
            traceback.print_exc()

    def _llm_analyze_job_first(self, *, resume_text: str, job_meta: str,
                            requirements: List[str], required_tech: List[str],
                            extra_keywords: List[str]) -> Dict[str, Any]:
        """
        Ask the LLM to do end-to-end job matching across ANY domain.
        'technical_skills' == 'hard skills relevant to this role' (non-tech friendly).
        """
        # Keep prompt compact but strict; cap resume text length for token safety
        resume_snip = (resume_text or "")[:12000]
        job_req_blobs = "\n".join([f"- {r}" for r in (requirements or [])][:60])  # plenty
        job_skills = ", ".join(required_tech or [])
        job_keywords = ", ".join(sorted(set(extra_keywords or []))[:60])

        system = (
            "You are a strict, domain-agnostic resume-to-job assessor. "
            "Return ONLY valid JSON. Never invent facts not present in the RESUME. "
            "First, infer the industry/domain from the job title and description (e.g., healthcare, tech, retail, finance, education, hospitality, construction, etc.). "
            "Then treat 'technical_skills' as 'role-specific hard skills' for that domain. "
            "For example: clinical skills for nursing, POS systems for retail, programming languages for tech, financial modeling for finance. "
            "All percentages are 0–100."
        )
        user = f"""
    JOB META:
    {job_meta}

    REQUIREMENTS (bullets):
    {job_req_blobs or "(none)"}

    JOB SKILLS (from posting):
    {job_skills or "(none)"}

    EXTRA KEYWORDS (from title/desc):
    {job_keywords or "(none)"}

    RESUME (source of truth):
    <<<RESUME>>>
    {resume_snip}
    <<<END RESUME>>>

    Return JSON with exactly these keys:
    - scores: {{
        overall, technical_skills, soft_skills, keyword, formatting, readability
    }}  # all 0-100
    - job_match_summary: string  # concise, like "Tech skills match: 72%, Requirements: 64%, Keywords: 58%"
    - keyword_analysis: {{
        keywords_found: string[],
        keywords_missing: string[],
        keyword_density: Array<{{term: string, count: number}}>
    }}
    - tech_analysis: {{
        tech_found: string[],
        tech_missing: string[]
    }}  # 'tech' means 'hard skills' for the role
    - recommendations: string[]  # prioritized, 1 sentence each
    - ai_detailed_analysis: {{
        detected_headers: string[],
        technical_skills: {{
        strengths: string[], weaknesses: string[], missing_elements: string[],
        improvements: Array<{{suggestion: string, example_before?: string, example_after?: string, example?: string}}>
        }},
        keywords: {{
        strengths: string[], weaknesses: string[], missing_elements: string[],
        improvements: Array<{{suggestion: string, example_before?: string, example_after?: string, example?: string}}>
        }},
        soft_skills: {{
        relevant_skills: string[], missing_elements: string[],
        improvements: Array<{{suggestion: string, example?: string}}>
        }},
        formatting: {{
        strengths: string[], weaknesses: string[],
        improvements: Array<{{suggestion: string}}>
        }},
        overall_suggestions: string[]
    }}
    - section_scores: Record<string, {{score: number, improvement_needed: boolean, notes?: string}}>
        # e.g. "Experience": {{score: 82, improvement_needed: false}}

    Rules:
    - Only mark a hard skill as 'found' if present in RESUME.
    - Prefer concise bullets. No markdown. Keep arrays short but useful.
    """

        j = self._llm_call(system=system, user=user)
        # Defensive coercion & defaults
        scores = j.get("scores", {}) if isinstance(j.get("scores"), dict) else {}
        formatting_score = self._clamp_pct(scores.get("formatting"), 70.0)
        readability_score = self._clamp_pct(scores.get("readability"), 70.0)
        keyword_score = self._clamp_pct(scores.get("keyword"), 60.0)
        tech_score = self._clamp_pct(scores.get("technical_skills"), 60.0)
        soft_score = self._clamp_pct(scores.get("soft_skills"), 70.0)

        # If overall missing, synthesize with mild weights (LLM-first mindset)
        overall = scores.get("overall")
        if overall is None:
            overall = (
                0.45 * tech_score
                + 0.25 * keyword_score
                + 0.15 * soft_score
                + 0.10 * formatting_score
                + 0.05 * readability_score
            )
        overall = self._clamp_pct(overall, 65.0)

        # Keyword density => flatten to mapping
        kd_list = j.get("keyword_analysis", {}).get("keyword_density") or []
        kd_map = {}
        for entry in kd_list if isinstance(kd_list, list) else []:
            try:
                term = str(entry.get("term", "")).lower().strip()
                cnt = int(entry.get("count", 0))
                if term:
                    kd_map[term] = int(max(0, cnt))
            except Exception:
                pass

        section_scores = j.get("section_scores") if isinstance(j.get("section_scores"), dict) else {}
        # Normalize section scores
        norm_sections = {}
        for k, v in (section_scores or {}).items():
            if not isinstance(v, dict):
                continue
            norm_sections[k] = {
                "score": self._clamp_pct(v.get("score"), 0.0),
                "improvement_needed": bool(v.get("improvement_needed", False)),
                **({"notes": str(v.get("notes"))} if v.get("notes") else {}),
            }

        out = {
            "word_count": len(resume_text.split()),
            "overall_score": overall,
            "formatting_score": formatting_score,
            "readability_score": readability_score,
            "keyword_score": keyword_score,
            "technical_skills_score": tech_score,
            "soft_skills_score": soft_score,
            "recommendations": self._coerce_list(j.get("recommendations")),
            "missing_sections": [],
            "job_match_summary": j.get("job_match_summary") or
                f"Tech skills match: {tech_score:.0f}%, Keywords: {keyword_score:.0f}%",
            "keyword_analysis": {
                "keywords_found": self._coerce_list(j.get("keyword_analysis", {}).get("keywords_found")),
                "keywords_missing": self._coerce_list(j.get("keyword_analysis", {}).get("keywords_missing")),
                "keyword_density": kd_map,
            },
            "tech_analysis": {
                "tech_found": self._coerce_list(j.get("tech_analysis", {}).get("tech_found")),
                "tech_missing": self._coerce_list(j.get("tech_analysis", {}).get("tech_missing")),
            },
            "missing_skills": self._coerce_list(j.get("tech_analysis", {}).get("tech_missing")),
            "ai_detailed_analysis": self._normalize_ai_detailed_analysis(
                j.get("ai_detailed_analysis", {}) if isinstance(j.get("ai_detailed_analysis"), dict) else {}
            ),
            "section_quality": norm_sections,
        }
        return out

    def _llm_analyze_general_first(self, *, resume_text: str) -> Dict[str, Any]:
        """General, job-agnostic LLM analysis for ANY profession."""
        resume_snip = (resume_text or "")[:12000]
        system = (
            "You are an ATS-aware resume reviewer across ALL professions. "
            "Return ONLY valid JSON. No markdown. All percentages 0–100."
        )
        user = f"""
    RESUME (source of truth):
    <<<RESUME>>>
    {resume_snip}
    <<<END RESUME>>>

    Return JSON with:
    - scores: {{ overall, formatting, readability }}  # 0-100
    - missing_sections: string[]  # optional/soft; only if obviously absent
    - section_scores: Record<string, {{score: number, improvement_needed: boolean, notes?: string}}>
    - suggestions: string[]  # prioritized, concise
    - language: {{ action_verb_count: number }}
    - ai_detailed_analysis: {{
        detected_headers: string[],
        keywords: {{ strengths: string[], weaknesses: string[], missing_elements: string[], improvements: Array<{{suggestion: string, example?: string}}>}}, 
        soft_skills: {{ relevant_skills: string[], missing_elements: string[], improvements: Array<{{suggestion: string}}>}}, 
        formatting: {{ strengths: string[], weaknesses: string[], improvements: Array<{{suggestion: string}}>}}, 
        overall_suggestions: string[]
    }}

    Rules:
    - Do not fabricate content not present in resume.
    - 'section_scores' keys can be any sections present or expected (e.g., Summary, Experience, Education, Certifications).
    """

        j = self._llm_call(system=system, user=user)
        scores = j.get("scores", {}) if isinstance(j.get("scores"), dict) else {}
        formatting = self._clamp_pct(scores.get("formatting"), 70.0)
        readability = self._clamp_pct(scores.get("readability"), 70.0)
        overall = self._clamp_pct(scores.get("overall"), (0.55 * readability + 0.45 * formatting))

        sections = j.get("section_scores") if isinstance(j.get("section_scores"), dict) else {}
        section_quality = {}
        for k, v in (sections or {}).items():
            if not isinstance(v, dict):
                continue
            section_quality[k] = {
                "score": self._clamp_pct(v.get("score"), 0.0),
                "improvement_needed": bool(v.get("improvement_needed", False)),
                **({"notes": str(v.get("notes"))} if v.get("notes") else {}),
            }

        lang = j.get("language", {}) if isinstance(j.get("language"), dict) else {}
        action_count = int(lang.get("action_verb_count") or 0)

        return {
            "word_count": len(resume_text.split()),
            "overall_score": overall,
            "formatting_score": formatting,
            "readability_score": readability,
            "completeness_score": overall,  # simple proxy
            "suggestions": self._coerce_list(j.get("suggestions")),
            "missing_sections": self._coerce_list(j.get("missing_sections")),
            "section_quality": section_quality,
            "action_verb_count": action_count,
            "ai_detailed_analysis": self._normalize_ai_detailed_analysis(
                j.get("ai_detailed_analysis", {}) if isinstance(j.get("ai_detailed_analysis"), dict) else {}
            ),
        }


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
        text = " ".join(filter(None, [job.title or "", job.description or ""])).strip()
        if not text:
            return []

        # LLM-first (only if available and allowed)
        if self._llm is not None:
            try:
                resp = self._llm.chat.completions.create(
                    model=os.getenv("RESUME_MODEL", "gpt-4o-mini"),
                    temperature=0.0,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content":
                        "Extract 15–40 domain-relevant keywords/phrases (hard skills, tools, certifications, domain terms). "
                        "Return JSON: {\"keywords\": [\"...\"]}. Do not invent."},
                        {"role": "user", "content": text[:8000]},
                    ],
                    max_tokens=600,
                )
                data = json.loads(resp.choices[0].message.content or "{}")
                kws = [k.strip() for k in (data.get("keywords") or []) if k and isinstance(k, str)]
                return list(dict.fromkeys(kws))
            except Exception:
                pass

        # Domain-agnostic fallback: proper nouns + frequent terms
        import re
        blob = text.lower()
        # keep words / 1–3-grams, remove stopwords quickly
        stop = set(("the","and","for","with","to","of","in","on","at","a","an","our","we","you","as","by","from","or"))
        words = re.findall(r"[a-z][a-z0-9\-\./+]{2,}", blob)
        freq = {}
        for w in words:
            if w in stop:
                continue
            freq[w] = freq.get(w, 0) + 1
        # grab top unigrams + simple proper-noun phrases from original text
        caps = re.findall(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b", job.description or "")
        candidates = list(dict.fromkeys([*sorted(freq, key=freq.get, reverse=True)[:25], *caps]))
        return [c for c in candidates if c]


    def _perform_general_resume_analysis(self, text_content: str) -> dict:
        if self._llm is not None:
            try:
                j = self._llm_analyze_general_first(resume_text=text_content or "")
                return j
            except Exception as e:
                print(f"[documents] LLM-first general analysis failed, using fallback: {e}")

        # ---- Fallback to your previous heuristic version ----
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
        missing_sections = []
        critical = ["Technical Skills", "Work Experience", "Education"]
        for c in critical:
            if c.lower() not in text_content.lower():
                missing_sections.append(c)
        action_verbs = ["managed", "led", "built", "created", "developed", "designed", "implemented", "achieved", "improved", "increased", "reduced", "negotiated", "coordinated"]
        action_verb_count = sum(1 for v in action_verbs if v in text_content.lower())
        action_verb_score = min(100, action_verb_count * 10)
        bullet_count = text_content.count(SAFE_BULLET)
        bullet_score = min(100, bullet_count * 5)
        has_dates = bool(re.search(r'\b(19|20)\d{2}\b', text_content))
        date_score = 80 if has_dates else 0
        content_score = (action_verb_score * 0.4 + bullet_score * 0.3 + date_score * 0.3)
        non_ascii = [c for c in text_content if ord(c) > 126]
        formatting_score = 0
        if len(non_ascii) < 0.05 * max(1, len(text_content)):
            formatting_score += 40
        if len([ln for ln in lines if not ln.strip()]) < 0.35 * max(1, len(lines)):
            formatting_score += 35
        if bullet_count > 0:
            formatting_score += 25
        formatting_score = min(100, formatting_score)
        suggestions = []
        if not email_ok: suggestions.append("Add a professional email address")
        if not phone_ok: suggestions.append("Include a phone number for contact")
        if not name_ok: suggestions.append("Make your full name prominent at the top")
        for s in missing_sections: suggestions.append(f"Add a {s} section")
        if action_verb_count < 5: suggestions.append("Use more action verbs like 'achieved', 'implemented', or 'developed'")
        if bullet_count < 5: suggestions.append("Use bullet points to make accomplishments stand out")
        if not has_dates: suggestions.append("Include dates for your experiences and education")
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
            "action_verb_count": action_verb_count,
            "ai_detailed_analysis": self._normalize_ai_detailed_analysis({})
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
        # If LLM available (or user asked for it), use LLM-first universal scoring
        if self._llm is not None and (use_ai or True):  # default to LLM since you want LLM-based
            try:
                return self._llm_analyze_job_first(
                    resume_text=resume_text,
                    job_meta=job_meta,
                    requirements=requirements,
                    required_tech=required_tech,
                    extra_keywords=extra_keywords,
                )
            except Exception as e:
                print(f"[documents] LLM-first job analysis failed, using fallback: {e}")

        # ---- Fallback to your existing deterministic approach (unchanged) ----
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
            "tech_analysis": {"tech_found": found_tech, "tech_missing": missing_tech},
            "missing_skills": missing_tech,
            "ai_detailed_analysis": self._normalize_ai_detailed_analysis({}),
            "section_quality": {},
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
        file_path = Path(doc.file_path)

        # Prepare job context for cache key
        job_context = ""
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
                # Build context string for hashing
                job_context = f"{job.title or ''}\n{job.description or ''}"

        # Check cache
        cache_key = self._compute_cache_key(document_id, job_id, resume_text, job_context)
        cached = self._read_analysis_cache(file_path, cache_key)
        if cached:
            # Reconstruct nested ATSScore model from dict
            if isinstance(cached.get("ats_score"), dict):
                cached["ats_score"] = ATSScore(**cached["ats_score"])
            # Return cached DocumentAnalysis
            return DocumentAnalysis(**cached)

        # Cache miss - perform analysis
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
            result = DocumentAnalysis(
                word_count=analysis["word_count"],
                keyword_density=analysis.get("keyword_analysis", {}).get("keyword_density", {}),
                readability_score=analysis["readability_score"],
                ats_score=ats,
                suggested_improvements=analysis["recommendations"],
                missing_sections=analysis.get("missing_sections", []),
                job_match_summary={"summary": analysis.get("job_match_summary", "")},
                keyword_analysis=analysis.get("keyword_analysis"),
                missing_skills={"skills": analysis.get("missing_skills", [])},
                ai_detailed_analysis=analysis.get("ai_detailed_analysis"),
                section_quality=analysis.get("section_quality"),
                action_verb_count=None,
            )
        else:
            gen = self._perform_general_resume_analysis(resume_text)

            ats = ATSScore(
                overall_score=gen["overall_score"],
                formatting_score=gen["formatting_score"],
                keyword_score=gen.get("completeness_score", gen.get("readability_score", 0.0)),
                readability_score=gen["readability_score"],
                technical_skills_score=None,
                soft_skills_score=None,
                suggestions=gen["suggestions"],
            )

            result = DocumentAnalysis(
                word_count=gen["word_count"],
                keyword_density={},
                readability_score=gen["readability_score"],
                ats_score=ats,
                suggested_improvements=gen["suggestions"],
                missing_sections=gen.get("missing_sections", []),
                job_match_summary={"summary": "General resume analysis - select a job for detailed matching"},
                keyword_analysis=None,
                missing_skills={"skills": []},
                ai_detailed_analysis=gen.get("ai_detailed_analysis", {}),
                section_quality=gen.get("section_quality"),
                action_verb_count=gen.get("action_verb_count"),
            )

        # Write to cache
        # Use model_dump() for Pydantic v2, dict() for v1
        if hasattr(result, 'model_dump'):
            result_dict = result.model_dump()
        else:
            result_dict = result.dict()
        self._write_analysis_cache(file_path, cache_key, result_dict)
        
        return result

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
