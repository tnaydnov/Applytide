from __future__ import annotations
from typing import List, Optional

def build_final_description(description: Optional[str],
                            requirements: Optional[List[str]],
                            skills: Optional[List[str]]) -> Optional[str]:
    parts: List[str] = []
    if description:
        parts.append(description)

    if requirements:
        req_lines = [f"• {r.strip()}" for r in requirements if r and r.strip()]
        if req_lines:
            parts.append("\n\n**Requirements:**\n" + "\n".join(req_lines))

    if skills:
        skills_text = ", ".join([s.strip() for s in skills if s and s.strip()])
        if skills_text:
            parts.append("\n\n**Required Skills:**\n" + skills_text)

    return "\n".join(parts) if parts else None
