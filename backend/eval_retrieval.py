"""Retrieval eval: compares TF-IDF (old), BM25, dense and hybrid retrieval on labelled questions.

Run:  python eval_retrieval.py
"""
import json
import sys
from typing import Dict, List, Tuple

from retrieval import BM25Retriever, DenseRetriever, Document, HybridRetriever, build_documents

TOP_K = 6

# (question, ids of documents that answer it). Many are paraphrased on purpose, with no shared keywords.
CASES: List[Tuple[str, List[str]]] = [
    ("Who is Sachin?", ["profile"]),
    ("Where are you working right now?", ["experience:capmob-financial-services", "profile"]),
    ("Have you built a credit risk model?", ["experience:capmob-financial-services"]),
    ("What cloud infrastructure have you managed?", ["experience:capmob-financial-services"]),
    ("Have you integrated with a CRM or e-signature tool?", ["experience:capmob-financial-services"]),
    ("Did you build dashboards for factories?", ["experience:xtrail-consulting-services"]),
    ("What workflow automation have you done?", ["experience:xtrail-consulting-services"]),
    ("Have you written an agent framework without LangGraph?", ["project:harness"]),
    ("How does your agent remember earlier conversations?", ["project:harness"]),
    ("How do you stop an AI agent from doing something unsafe?", ["project:harness"]),
    ("Have you worked with legal documents?", ["project:unbind"]),
    ("Can it read a photo of a contract?", ["project:unbind"]),
    ("How did you secure payments?", ["project:unbind"]),
    ("How thoroughly do you test your code?", ["project:unbind", "experience:capmob-financial-services"]),
    ("Have you published a package to a registry?", ["project:unbind"]),
    ("Have you built a text summarizer?", ["project:ragsum"]),
    ("Can I upload a PDF and ask questions about it?", ["project:chat-with-docs", "project:unbind"]),
    ("Anything to do with ride hailing?", ["project:fairfare"]),
    ("Predicting whether a bank will approve a loan", ["project:loan-approval-prediction"]),
    ("Real estate valuation model", ["project:house-price-prediction"]),
    ("Music recommendations", ["project:song-recommendation-system"]),
    ("Personal budgeting tool", ["project:finance-dashboard"]),
    ("Do you know PyTorch?", ["skills"]),
    ("Have you fine-tuned LLMs efficiently?", ["skills"]),
    ("Which vector databases have you used?", ["skills"]),
    ("What's your GPA?", ["education:dayananda-sagar-college-of-engineering"]),
    ("Which university do you attend and when do you graduate?", ["education:dayananda-sagar-college-of-engineering"]),
    ("Have you won any competitions?", ["achievement:runner-up-botcraft", "achievement:shortlisted-great-bengaluru-hackathon"]),
    ("Do you do competitive programming?", ["achievement:codechef-100-days-streak-peak-rating-1210", "achievement:leetcode-daily-challenge-badges"]),
    ("Built anything for Discord?", ["achievement:runner-up-botcraft"]),
    ("How can I get in touch with you?", ["socials", "profile"]),
    ("Do you have a Kaggle account?", ["socials"]),
    ("Have you built anything for bank reconciliation?", ["project:solvent"]),
    ("Did you take part in a buildathon?", ["project:solvent"]),
    ("Have you trained forecasting models?", ["project:solvent"]),
    ("A marketplace matching borrowers with banks", ["project:fundbridge", "experience:capmob-financial-services"]),
    ("Have you built a reinforcement learning environment?", ["project:finsight"]),
    ("How do you reward an agent without an LLM judge?", ["project:finsight"]),
    # Exact-term lookups (added after the first run, to test lexical matching on names and acronyms)
    ("Semgrep and Gitleaks", ["experience:capmob-financial-services", "project:unbind"]),
    ("HMAC-SHA256", ["project:unbind"]),
    ("gpt-oss-safeguard-20b", ["project:harness"]),
    ("HyDE", ["project:unbind"]),
    ("Fargate", ["experience:capmob-financial-services"]),
    ("DagsHub", ["skills"]),
    ("Razorpay", ["project:unbind"]),
    ("n8n", ["experience:xtrail-consulting-services", "skills"]),
]


class TfidfRetriever:
    """The previous production retriever, kept here only as a baseline."""

    def __init__(self, docs: List[Document]):
        from sklearn.feature_extraction.text import TfidfVectorizer

        self.vectorizer = TfidfVectorizer(max_features=500, stop_words='english')
        self.matrix = self.vectorizer.fit_transform([d.content for d in docs])

    def search(self, query, top_k):
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np

        scores = cosine_similarity(self.vectorizer.transform([query]), self.matrix)[0]
        order = np.argsort(scores)[::-1][:top_k]
        return [(int(i), float(scores[i])) for i in order if scores[i] > 0]


def evaluate(name: str, retriever, docs: List[Document]) -> Dict[str, float]:
    hits1 = hits3 = hitsk = mrr = 0.0
    misses = []
    for question, expected in CASES:
        ranked = [docs[i].id for i, _ in retriever.search(question, TOP_K)]
        first = next((r for r, doc_id in enumerate(ranked) if doc_id in expected), None)
        if first is None:
            misses.append(question)
            continue
        mrr += 1 / (first + 1)
        hits1 += first < 1
        hits3 += first < 3
        hitsk += 1
    n = len(CASES)
    return {
        'name': name,
        'hit@1': hits1 / n,
        'hit@3': hits3 / n,
        f'hit@{TOP_K}': hitsk / n,
        'MRR': mrr / n,
        'misses': misses,
    }


def main() -> int:
    with open('portfolio_data.json', encoding='utf-8') as f:
        docs = build_documents(json.load(f))
    known = {d.id for d in docs}
    unknown = {i for _, ids in CASES for i in ids} - known
    if unknown:
        print(f"Eval references unknown doc ids: {sorted(unknown)}")
        return 1

    bm25 = BM25Retriever(docs)
    dense = DenseRetriever(docs)
    results = [
        evaluate('TF-IDF (old)', TfidfRetriever(docs), docs),
        evaluate('BM25', bm25, docs),
        evaluate('Dense (bge-small)', dense, docs),
        evaluate('Hybrid RRF', HybridRetriever([bm25, dense]), docs),
    ]

    print(f"{len(CASES)} questions, {len(docs)} documents\n")
    print(f"{'retriever':<20}{'hit@1':>8}{'hit@3':>8}{f'hit@{TOP_K}':>8}{'MRR':>8}")
    for r in results:
        print(f"{r['name']:<20}{r['hit@1']:>8.2f}{r['hit@3']:>8.2f}{r[f'hit@{TOP_K}']:>8.2f}{r['MRR']:>8.2f}")
    for r in results:
        if r['misses']:
            print(f"\n{r['name']} missed (not in top {TOP_K}):")
            for q in r['misses']:
                print(f"  - {q}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
