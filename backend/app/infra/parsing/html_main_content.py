from __future__ import annotations
import re
from bs4 import BeautifulSoup
from readability import Document
from ...domain.jobs.extraction.ports import MainContentExtractor

class ReadabilityMainContent(MainContentExtractor):
    def extract(self, html: str) -> str:
        print("\n=== HTML MAIN CONTENT EXTRACTOR ===")
        print(f"HTML Extractor: Received HTML length = {len(html or '')}")
        
        # Handle empty or minimal HTML content
        if not html or len(html.strip()) < 10:
            print("HTML Extractor: HTML is empty or too short, returning empty string")
            return ""
        
        print(f"HTML Extractor: Attempting readability extraction...")
        try:
            doc = Document(html)
            summary_html = doc.summary(html_partial=True)
            soup = BeautifulSoup(summary_html, "lxml")
            text = soup.get_text("\n")
            print(f"HTML Extractor: Readability extraction successful, text length = {len(text)}")
        except Exception as e:
            print(f"HTML Extractor ERROR: Readability extraction failed: {str(e)}")
            print(f"HTML Extractor: Falling back to BeautifulSoup...")
            try:
                soup = BeautifulSoup(html, "lxml")
                text = soup.get_text("\n")
                print(f"HTML Extractor: BeautifulSoup extraction successful, text length = {len(text)}")
            except Exception as e2:
                print(f"HTML Extractor ERROR: BeautifulSoup extraction also failed: {str(e2)}")
                return ""
        
        text = text.replace("\u00A0", " ")
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        result = text.strip()
        print(f"HTML Extractor: Final cleaned text length = {len(result)}")
        print(f"HTML Extractor: Text preview = {repr(result[:200])}")
        print("=== HTML EXTRACTOR COMPLETE ===")
        return result
