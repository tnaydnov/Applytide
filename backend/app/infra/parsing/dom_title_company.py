from __future__ import annotations
from bs4 import BeautifulSoup
from ...domain.jobs.extraction.ports import TitleCompanyExtractor

class GenericTitleCompany(TitleCompanyExtractor):
    def extract(self, html: str) -> dict[str, str]:
        soup = BeautifulSoup(html or "", "lxml")

        def pick(selectors: list[str]) -> str:
            for sel in selectors:
                el = soup.select_one(sel)
                if el:
                    t = " ".join(el.get_text(" ").split())
                    if len(t) > 2:
                        return t
            return ""

        title = pick(["h1", "[itemprop='title']", "header h1", "article h1"])
        company = pick([
            "[itemprop='hiringOrganization'] [itemprop='name']",
            ".company, .company-name, .employer, [data-company]",
            "a[href*='/company/']",
        ])
        return {"title": title, "company_name": company}
