from __future__ import annotations
import re
from bs4 import BeautifulSoup
from readability import Document
from ...domain.jobs.extraction.ports import MainContentExtractor
from ..logging import get_logger

logger = get_logger(__name__)

class ReadabilityMainContent(MainContentExtractor):
    def extract(self, html: str) -> str:
        html_len = len(html or '')
        logger.debug("HTML content extraction started", extra={"html_length": html_len})
        
        # Handle empty or minimal HTML content
        if not html or len(html.strip()) < 10:
            logger.debug("HTML too short, returning empty string", extra={"html_length": html_len})
            return ""
        
        logger.debug("Attempting readability extraction")
        try:
            doc = Document(html)
            summary_html = doc.summary(html_partial=True)
            soup = BeautifulSoup(summary_html, "lxml")
            text = soup.get_text("\n")
            logger.debug("Readability extraction successful", extra={"text_length": len(text)})
        except Exception as e:
            logger.warning("Readability extraction failed, falling back to BeautifulSoup", extra={"error": str(e)})
            try:
                soup = BeautifulSoup(html, "lxml")
                text = soup.get_text("\n")
                logger.debug("BeautifulSoup extraction successful", extra={"text_length": len(text)})
            except Exception as e2:
                logger.error("BeautifulSoup extraction also failed", extra={"error": str(e2)})
                return ""
        
        text = text.replace("\u00A0", " ")
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        result = text.strip()
        
        logger.debug("HTML extraction complete", extra={
            "final_length": len(result),
            "preview": result[:200]
        })
        return result
