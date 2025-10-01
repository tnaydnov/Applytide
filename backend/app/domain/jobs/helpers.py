from __future__ import annotations
from typing import List, Optional

def build_final_description(description: Optional[str]) -> Optional[str]:
    parts: List[str] = []
    if description:
        parts.append(description)

    return "\n".join(parts) if parts else None
