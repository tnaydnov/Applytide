import re
from typing import List, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

word_re = re.compile(r"[A-Za-z][A-Za-z0-9+.-]{1,}")

def _clean(s: str) -> str:
    return " ".join(word_re.findall((s or "").lower()))

def tfidf_score(resume_text: str, job_text: str) -> float:
    texts = [_clean(resume_text), _clean(job_text)]
    vec = TfidfVectorizer(stop_words="english", min_df=1)
    X = vec.fit_transform(texts)
    sim = cosine_similarity(X[0:1], X[1:2])[0][0]
    return float(sim)  # 0..1

def top_keywords(job_text: str, top_n: int = 20) -> List[Tuple[str, float]]:
    vec = TfidfVectorizer(stop_words="english", ngram_range=(1,2), min_df=1)
    X = vec.fit_transform([_clean(job_text)])
    weights = X.toarray()[0]
    feats = vec.get_feature_names_out()
    pairs = sorted(zip(feats, weights), key=lambda p: p[1], reverse=True)
    return [(k, w) for (k, w) in pairs[:top_n]]

def present_missing(resume_text: str, keywords: List[str]) -> Tuple[List[str], List[str]]:
    text = _clean(resume_text)
    present, missing = [], []
    for k in keywords:
        k2 = _clean(k)
        if k2 and k2 in text:
            present.append(k)
        else:
            missing.append(k)
    return present, missing
