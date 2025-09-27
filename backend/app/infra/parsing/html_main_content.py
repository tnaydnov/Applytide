from __future__ import annotations
import re
from bs4 import BeautifulSoup
from readability import Document
from ...domain.jobs.extraction.ports import MainContentExtractor

class ReadabilityMainContent(MainContentExtractor):
    def extract(self, html: str) -> str:
        try:
            doc = Document(html)
            summary_html = doc.summary(html_partial=True)
            soup = BeautifulSoup(summary_html, "lxml")
            text = soup.get_text("\n")
        except Exception:
            soup = BeautifulSoup(html, "lxml")
            text = soup.get_text("\n")
        text = text.replace("\u00A0", " ")
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()
