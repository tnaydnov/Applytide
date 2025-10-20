"""AI-powered document analysis and ATS scoring."""
from __future__ import annotations

from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pathlib import Path
import uuid
import re
import json
import os

from ....db import models
from ....api.schemas.documents import DocumentAnalysis as DocumentAnalysisSchema, ATSScore
from ....infra.logging import get_logger
from ....infra.extractors.text_extractor import SAFE_BULLET

logger = get_logger(__name__)


class DocumentAnalysisModule:
    """Handles AI-powered document analysis and ATS scoring."""
    
    def __init__(self, utils, cache):
        self.utils = utils
        self.cache = cache
    
    def extract_keywords_from_job(self, job) -> List[str]:
        """Extract relevant keywords from job posting."""
        text = " ".join(filter(None, [job.title or "", job.description or ""])).strip()
        if not text:
            return []
        
        # LLM-first approach (if available)
        if self.utils._llm is not None:
            try:
                resp = self.utils._llm.chat.completions.create(
                    model=os.getenv("RESUME_MODEL", "gpt-4o-mini"),
                    temperature=0.0,
                    response_format={"type": "json_object"},
                    messages=[
                        {
                            "role": "system",
                            "content": "Extract 15–40 domain-relevant keywords/phrases (hard skills, tools, certifications, domain terms). "
                                      "Return JSON: {\"keywords\": [\"...\"]}. Do not invent."
                        },
                        {"role": "user", "content": text[:8000]},
                    ],
                    max_tokens=600,
                )
                data = json.loads(resp.choices[0].message.content or "{}")
                kws = [k.strip() for k in (data.get("keywords") or []) if k and isinstance(k, str)]
                return list(dict.fromkeys(kws))
            except Exception as e:
                logger.warning("LLM keyword extraction failed", extra={"error": str(e)})
        
        # Domain-agnostic fallback: proper nouns + frequent terms
        blob = text.lower()
        stop = set(("the","and","for","with","to","of","in","on","at","a","an","our","we","you","as","by","from","or"))
        words = re.findall(r"[a-z][a-z0-9\-\./+]{2,}", blob)
        freq = {}
        for w in words:
            if w in stop:
                continue
            freq[w] = freq.get(w, 0) + 1
        
        # Grab top unigrams + simple proper-noun phrases from original text
        caps = re.findall(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b", job.description or "")
        candidates = list(dict.fromkeys([*sorted(freq, key=freq.get, reverse=True)[:25], *caps]))
        return [c for c in candidates if c]
    
    def perform_general_resume_analysis(self, text_content: str) -> dict:
        """Perform general resume analysis without job context."""
        if self.utils._llm is not None:
            try:
                j = self.llm_analyze_general_first(resume_text=text_content or "")
                return j
            except Exception as e:
                logger.warning("LLM general analysis failed, using fallback", extra={"error": str(e)})
        
        # Fallback to heuristic analysis
        lines = text_content.split("\n")
        words = text_content.split()
        word_count = len(words)
        
        # Contact information scoring
        contact_score = 0
        email_ok = bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', text_content))
        if email_ok: contact_score += 33
        phone_ok = bool(re.search(r'\+?\d[\d\s\-().]{7,}', text_content))
        if phone_ok: contact_score += 33
        name_ok = bool(re.search(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', text_content))
        if name_ok: contact_score += 34
        
        # Check for critical sections
        missing_sections = []
        critical = ["Technical Skills", "Work Experience", "Education"]
        for c in critical:
            if c.lower() not in text_content.lower():
                missing_sections.append(c)
        
        # Action verbs analysis
        action_verbs = ["managed", "led", "built", "created", "developed", "designed", 
                       "implemented", "achieved", "improved", "increased", "reduced", 
                       "negotiated", "coordinated"]
        action_verb_count = sum(1 for v in action_verbs if v in text_content.lower())
        action_verb_score = min(100, action_verb_count * 10)
        
        # Formatting analysis
        bullet_count = text_content.count(SAFE_BULLET)
        bullet_score = min(100, bullet_count * 5)
        has_dates = bool(re.search(r'\b(19|20)\d{2}\b', text_content))
        date_score = 80 if has_dates else 0
        
        content_score = (action_verb_score * 0.4 + bullet_score * 0.3 + date_score * 0.3)
        
        # Formatting quality
        non_ascii = [c for c in text_content if ord(c) > 126]
        formatting_score = 0
        if len(non_ascii) < 0.05 * max(1, len(text_content)):
            formatting_score += 40
        if len([ln for ln in lines if not ln.strip()]) < 0.35 * max(1, len(lines)):
            formatting_score += 35
        if bullet_count > 0:
            formatting_score += 25
        formatting_score = min(100, formatting_score)
        
        # Generate suggestions
        suggestions = []
        if not email_ok: suggestions.append("Add a professional email address")
        if not phone_ok: suggestions.append("Include a phone number for contact")
        if not name_ok: suggestions.append("Make your full name prominent at the top")
        for s in missing_sections: suggestions.append(f"Add a {s} section")
        if action_verb_count < 5: 
            suggestions.append("Use more action verbs like 'achieved', 'implemented', or 'developed'")
        if bullet_count < 5: 
            suggestions.append("Use bullet points to make accomplishments stand out")
        if not has_dates: 
            suggestions.append("Include dates for your experiences and education")
        
        overall = (contact_score * 0.25 + (100 - 25*len(missing_sections)) * 0.25 + 
                  content_score * 0.25 + formatting_score * 0.25)
        
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
            "ai_detailed_analysis": self.utils.normalize_ai_detailed_analysis({})
        }
    
    def llm_analyze_general_first(self, *, resume_text: str) -> Dict[str, Any]:
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
        
        j = self.utils.llm_call(system=system, user=user)
        scores = j.get("scores", {}) if isinstance(j.get("scores"), dict) else {}
        formatting = self.utils.clamp_pct(scores.get("formatting"), 70.0)
        readability = self.utils.clamp_pct(scores.get("readability"), 70.0)
        overall = self.utils.clamp_pct(scores.get("overall"), (0.55 * readability + 0.45 * formatting))
        
        sections = j.get("section_scores") if isinstance(j.get("section_scores"), dict) else {}
        section_quality = {}
        for k, v in (sections or {}).items():
            if not isinstance(v, dict):
                continue
            section_quality[k] = {
                "score": self.utils.clamp_pct(v.get("score"), 0.0),
                "improvement_needed": bool(v.get("improvement_needed", False)),
                **({"notes": str(v.get("notes"))} if v.get("notes") else {}),
            }
        
        lang = j.get("language", {}) if isinstance(j.get("language"), dict) else {}
        action_count = int(lang.get("action_verb_count") or 0)
        
        return {
            "word_count": len((resume_text or "").split()),
            "overall_score": overall,
            "formatting_score": formatting,
            "readability_score": readability,
            "completeness_score": overall,
            "suggestions": self.utils.coerce_list(j.get("suggestions")),
            "missing_sections": self.utils.coerce_list(j.get("missing_sections")),
            "section_quality": section_quality,
            "action_verb_count": action_count,
            "ai_detailed_analysis": self.utils.normalize_ai_detailed_analysis(
                j.get("ai_detailed_analysis", {}) if isinstance(j.get("ai_detailed_analysis"), dict) else {}
            ),
        }
    
    def llm_analyze_job_first(self, *, resume_text: str, job_meta: str,
                            requirements: List[str], required_tech: List[str],
                            extra_keywords: List[str]) -> Dict[str, Any]:
        """
        Ask the LLM to do end-to-end job matching across ANY domain.
        'technical_skills' == 'hard skills relevant to this role' (non-tech friendly).
        """
        # Keep prompt compact but strict; cap resume text length for token safety
        resume_snip = (resume_text or "")[:12000]
        job_req_blobs = "\n".join([f"- {r}" for r in (requirements or [])][:60])
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
        
        j = self.utils.llm_call(system=system, user=user)
        
        # Defensive coercion & defaults
        scores = j.get("scores", {}) if isinstance(j.get("scores"), dict) else {}
        formatting_score = self.utils.clamp_pct(scores.get("formatting"), 70.0)
        readability_score = self.utils.clamp_pct(scores.get("readability"), 70.0)
        keyword_score = self.utils.clamp_pct(scores.get("keyword"), 60.0)
        tech_score = self.utils.clamp_pct(scores.get("technical_skills"), 60.0)
        soft_score = self.utils.clamp_pct(scores.get("soft_skills"), 70.0)
        
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
        overall = self.utils.clamp_pct(overall, 65.0)
        
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
        norm_sections = {}
        for k, v in (section_scores or {}).items():
            if not isinstance(v, dict):
                continue
            norm_sections[k] = {
                "score": self.utils.clamp_pct(v.get("score"), 0.0),
                "improvement_needed": bool(v.get("improvement_needed", False)),
                **({"notes": str(v.get("notes"))} if v.get("notes") else {}),
            }
        
        return {
            "word_count": len((resume_text or "").split()),
            "overall_score": overall,
            "formatting_score": formatting_score,
            "readability_score": readability_score,
            "keyword_score": keyword_score,
            "technical_skills_score": tech_score,
            "soft_skills_score": soft_score,
            "recommendations": self.utils.coerce_list(j.get("recommendations")),
            "missing_sections": [],
            "job_match_summary": j.get("job_match_summary") or
                f"Tech skills match: {tech_score:.0f}%, Keywords: {keyword_score:.0f}%",
            "keyword_analysis": {
                "keywords_found": self.utils.coerce_list(j.get("keyword_analysis", {}).get("keywords_found")),
                "keywords_missing": self.utils.coerce_list(j.get("keyword_analysis", {}).get("keywords_missing")),
                "keyword_density": kd_map,
            },
            "tech_analysis": {
                "tech_found": self.utils.coerce_list(j.get("tech_analysis", {}).get("tech_found")),
                "tech_missing": self.utils.coerce_list(j.get("tech_analysis", {}).get("tech_missing")),
            },
            "missing_skills": self.utils.coerce_list(j.get("tech_analysis", {}).get("tech_missing")),
            "ai_detailed_analysis": self.utils.normalize_ai_detailed_analysis(
                j.get("ai_detailed_analysis", {}) if isinstance(j.get("ai_detailed_analysis"), dict) else {}
            ),
            "section_quality": norm_sections,
        }
    
    def analyze_against_job(
        self,
        resume_text: str,
        required_tech: List[str],
        requirements: List[str],
        extra_keywords: List[str],
        use_ai: bool,
        job_meta: str,
    ) -> Dict[str, Any]:
        """Analyze resume against specific job requirements."""
        # If LLM available, use LLM-first universal scoring
        if self.utils._llm is not None and use_ai:
            try:
                return self.llm_analyze_job_first(
                    resume_text=resume_text,
                    job_meta=job_meta,
                    requirements=requirements,
                    required_tech=required_tech,
                    extra_keywords=extra_keywords,
                )
            except Exception as e:
                logger.warning("LLM job analysis failed, using fallback", extra={
                    "error": str(e),
                    "job_meta_length": len(job_meta)
                })
        
        # Fallback to deterministic approach
        text_lower = resume_text.lower()
        tokens = set(self.utils.normalize_tokens(resume_text))
        
        tech_keywords = [k.lower() for k in required_tech]
        general_keywords = [k.lower() for k in extra_keywords if k.lower() not in tech_keywords]
        
        found_tech = [s for s in tech_keywords if s in text_lower]
        tech_score = (len(found_tech) / max(1, len(set(tech_keywords)))) * 100
        
        req_keywords: List[str] = []
        for line in requirements:
            req_keywords.extend(self.utils.normalize_tokens(line))
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
        
        relevant_soft_skills = [s for s, kws in common_soft_skills.items() 
                               if any(k in job_description.lower() for k in kws)]
        if relevant_soft_skills:
            found_soft = [s for s in relevant_soft_skills if s in text_lower]
            soft_score = (len(found_soft) / len(relevant_soft_skills)) * 100
        else:
            soft_score = 100
        
        soft_weight = 0.1 if len(relevant_soft_skills) >= 2 else 0.05
        formatting_score = 80.0 if SAFE_BULLET in resume_text or "-" in resume_text else 60.0
        readability_score = 85.0 if len(resume_text.split()) >= 200 else 60.0
        
        overall = (0.45 * tech_score + 0.25 * req_score + 
                  (0.30 - soft_weight) * keyword_score + soft_weight * soft_score)
        
        recommendations: List[str] = []
        missing_tech = [k for k in tech_keywords if k not in text_lower]
        missing_keywords = [k for k in general_keywords if k not in text_lower]
        
        if missing_tech:
            recommendations.append(f"Highlight these relevant skills if you have them: {', '.join(missing_tech[:8])}")
        if req_score < 60:
            recommendations.append("Mirror wording from the job's requirements in your bullets where truthful.")
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
            "ai_detailed_analysis": self.utils.normalize_ai_detailed_analysis({}),
            "section_quality": {},
        }
    
    def analyze_document_ats(
        self,
        db: Session,
        document_id: str,
        job_id: Optional[str],
        user_id: Optional[str],
        use_ai: bool = False,
    ) -> models.DocumentAnalysis:
        """Main entry point for document ATS analysis."""
        q = db.query(models.Resume).filter(models.Resume.id == uuid.UUID(document_id))
        if user_id:
            q = q.filter(models.Resume.user_id == uuid.UUID(user_id))
        doc = q.first()
        if not doc:
            raise ValueError("Document not found or access denied")
        
        resume_text = doc.text or ""
        file_path = Path(doc.file_path)
        
        # Prepare job context for cache key (WITHOUT expensive LLM calls)
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
                job_context = f"{job.title or ''}\n{job.description or ''}"
        
        # Check cache
        cache_key = self.cache.compute_cache_key(document_id, job_id, resume_text, job_context)
        cached = self.cache.read_analysis_cache(file_path, cache_key)
        if cached:
            # Reconstruct nested ATSScore model from dict
            if isinstance(cached.get("ats_score"), dict):
                cached["ats_score"] = ATSScore(**cached["ats_score"])
            return DocumentAnalysisSchema(**cached)
        
        # Cache miss - NOW extract keywords (after cache check to avoid unnecessary LLM calls)
        if job_id and job:
            job_keywords = list({*required_tech, *self.extract_keywords_from_job(job)})
        
        # Perform analysis
        if job_id and job:
            job_title = job.title or ""
            job_location = getattr(job, "location", "") or ""
            company_name = None
            if job.company_id:
                comp = db.get(models.Company, job.company_id)
                company_name = comp.name if comp else ""
            job_meta = f"TITLE: {job_title}\nLOCATION: {job_location}\nCOMPANY: {company_name or ''}"
            
            analysis = self.analyze_against_job(
                resume_text=resume_text,
                required_tech=required_tech,
                requirements=req_phrases,
                extra_keywords=job_keywords,
                use_ai=use_ai and self.utils._llm is not None,
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
            
            result = DocumentAnalysisSchema(
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
            gen = self.perform_general_resume_analysis(resume_text)
            
            ats = ATSScore(
                overall_score=gen["overall_score"],
                formatting_score=gen["formatting_score"],
                keyword_score=gen.get("completeness_score", gen.get("readability_score", 0.0)),
                readability_score=gen["readability_score"],
                technical_skills_score=None,
                soft_skills_score=None,
                suggestions=gen["suggestions"],
            )
            
            result = DocumentAnalysisSchema(
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
        if hasattr(result, 'model_dump'):
            result_dict = result.model_dump()
        else:
            result_dict = result.dict()
        self.cache.write_analysis_cache(file_path, cache_key, result_dict)
        
        return result
