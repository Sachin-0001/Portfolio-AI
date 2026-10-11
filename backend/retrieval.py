"""Hybrid retrieval over the portfolio: BM25 (lexical) + dense embeddings (semantic), fused with RRF."""
import os
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Protocol, Tuple

import numpy as np
from rank_bm25 import BM25Okapi


@dataclass
class Document:
    id: str
    type: str
    title: str
    content: str
    metadata: Dict = field(default_factory=dict)


def slugify(text: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def build_documents(data: Dict) -> List[Document]:
    """One document per entity, so every retrieved chunk is a self-contained fact."""
    docs: List[Document] = []

    profile = data.get('profile')
    if profile:
        docs.append(Document(
            id='profile',
            type='profile',
            title=f"About {profile['name']}",
            content=(
                f"About {profile['name']}, {profile['title']}. {profile['headline']}\n"
                f"{profile['summary']}\n"
                f"Currently: {profile.get('status', 'N/A')}. Location: {profile.get('location', 'N/A')}. "
                f"Email: {profile.get('email', 'N/A')}."
            ),
            metadata=profile,
        ))

    for edu in data.get('education', []):
        docs.append(Document(
            id=f"education:{slugify(edu['institution'])}",
            type='education',
            title=edu['institution'],
            content=(
                f"Education: {edu['degree']} at {edu['institution']}, {edu.get('location', '')} "
                f"({edu['start_date']} - {edu['end_date']}). CGPA {edu.get('cgpa', 'N/A')}."
            ),
            metadata=edu,
        ))

    for exp in data.get('experience', []):
        highlights = '\n'.join(f"- {h}" for h in exp.get('highlights', []))
        docs.append(Document(
            id=f"experience:{slugify(exp['company'])}",
            type='experience',
            title=f"{exp['role']} at {exp['company']}",
            content=(
                f"Work experience: {exp['role']} at {exp['company']} "
                f"({exp['start_date']} - {exp.get('end_date', 'Present')}, {exp.get('mode', '')}).\n"
                f"{exp['description']}\n{highlights}\n"
                f"Technologies: {', '.join(exp.get('tags', []))}"
            ),
            metadata=exp,
        ))

    for project in data.get('projects', []):
        highlights = '\n'.join(f"- {h}" for h in project.get('highlights', []))
        links = ', '.join(
            f"{label}: {project[key]}"
            for key, label in (('link', 'Live'), ('github', 'GitHub'), ('npm', 'npm'))
            if project.get(key)
        )
        docs.append(Document(
            id=f"project:{slugify(project['name'])}",
            type='project',
            title=project['name'],
            content=(
                f"Project: {project['name']} - {project.get('tagline', '')}"
                f"{' (' + project['date'] + ')' if project.get('date') else ''}.\n"
                f"{project['description']}\n{highlights}\n"
                f"Technologies: {', '.join(project['tags'])}\n{links}"
            ),
            metadata=project,
        ))

    groups = data.get('skill_groups', [])
    if groups or data.get('skills'):
        grouped = '\n'.join(f"{g['category']}: {', '.join(g['items'])}" for g in groups)
        docs.append(Document(
            id='skills',
            type='skills',
            title='Technical skills',
            content=f"Technical skills and tech stack:\n{grouped or ', '.join(data.get('skills', []))}",
            metadata={'skills': data.get('skills', []), 'groups': groups},
        ))

    for achievement in data.get('achievements', []):
        docs.append(Document(
            id=f"achievement:{slugify(achievement['title'])}",
            type='achievement',
            title=achievement['title'],
            content=f"Achievement: {achievement['title']} ({achievement['date']}). {achievement['description']}",
            metadata=achievement,
        ))

    socials = data.get('socials', [])
    if socials:
        docs.append(Document(
            id='socials',
            type='socials',
            title='Contact & social links',
            content='Contact and social profiles:\n' + '\n'.join(f"{s['platform']}: {s['link']}" for s in socials),
            metadata={'socials': socials},
        ))

    return docs


class Retriever(Protocol):
    def search(self, query: str, top_k: int) -> List[Tuple[int, float]]:
        """Return (document index, score) pairs, best first."""
        ...


_STOPWORDS = frozenset(
    'a an and are as at be by did do does for from has have how i in is it its me my of on or so '
    'tell that the their this to was were what when where which who why with you your'.split()
)


def tokenize(text: str) -> List[str]:
    return [t for t in re.findall(r'[a-z0-9]+', text.lower()) if t not in _STOPWORDS]


class BM25Retriever:
    def __init__(self, docs: List[Document]):
        # Titles are repeated so a name match ("UnBind") outweighs a passing mention
        self.bm25 = BM25Okapi([tokenize(f"{d.title} {d.title} {d.content}") for d in docs])

    def search(self, query: str, top_k: int) -> List[Tuple[int, float]]:
        tokens = tokenize(query)
        if not tokens:
            return []
        scores = self.bm25.get_scores(tokens)
        order = np.argsort(scores)[::-1][:top_k]
        return [(int(i), float(scores[i])) for i in order if scores[i] > 0]


DEFAULT_EMBEDDING_MODEL = 'BAAI/bge-small-en-v1.5'
# Inside the project so a build-time prefetch (prefetch_models.py) ships with the deploy instead of
# re-downloading on every cold start
DEFAULT_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.cache', 'fastembed')


def embedding_cache_dir() -> str:
    return os.getenv('FASTEMBED_CACHE_PATH') or DEFAULT_CACHE_DIR


class DenseRetriever:
    """Semantic search with a small ONNX embedding model (no torch). ~350 MB peak RSS with these settings."""

    def __init__(self, docs: List[Document], model_name: Optional[str] = None):
        from fastembed import TextEmbedding

        # One thread and small batches: embedding all docs in one batch with every core peaked at ~520 MB,
        # over a 512 MB instance; this peaks at ~350 MB for the same vectors.
        self.model = TextEmbedding(
            model_name or os.getenv('EMBEDDING_MODEL', DEFAULT_EMBEDDING_MODEL),
            cache_dir=embedding_cache_dir(),
            threads=int(os.getenv('EMBEDDING_THREADS', '1')),
        )
        vectors = self.model.passage_embed([d.content for d in docs], batch_size=4)
        self.matrix = self._normalize(np.array(list(vectors)))

    @staticmethod
    def _normalize(m: np.ndarray) -> np.ndarray:
        return m / np.linalg.norm(m, axis=-1, keepdims=True)

    def search(self, query: str, top_k: int) -> List[Tuple[int, float]]:
        q = self._normalize(np.array(list(self.model.query_embed([query])))[0])
        scores = self.matrix @ q
        order = np.argsort(scores)[::-1][:top_k]
        return [(int(i), float(scores[i])) for i in order]


class HybridRetriever:
    """Reciprocal Rank Fusion: robust to the two retrievers' incomparable score scales."""

    def __init__(self, retrievers: List[Retriever], k: int = 60, candidates: int = 20):
        self.retrievers = retrievers
        self.k = k
        self.candidates = candidates

    def search(self, query: str, top_k: int) -> List[Tuple[int, float]]:
        fused: Dict[int, float] = {}
        for retriever in self.retrievers:
            for rank, (idx, _) in enumerate(retriever.search(query, self.candidates)):
                fused[idx] = fused.get(idx, 0.0) + 1.0 / (self.k + rank + 1)
        return sorted(fused.items(), key=lambda kv: kv[1], reverse=True)[:top_k]
