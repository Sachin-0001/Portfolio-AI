"""Runs a duel as a stream of progress events. Nothing about the résumé is stored or logged."""
import logging
import os
import random
import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Iterator, Optional

from .github import GithubClient, find_github_username, valid_username
from .judge import judge
from .pdf import ResumeError, extract_resume
from .profiles import Fighter, extract_fighter, sachin_fighter

log = logging.getLogger(__name__)

SACHIN_GITHUB = 'Sachin-0001'
# Sachin goes through the same résumé pipeline as the challenger, so the judges compare like with like
SACHIN_RESUME = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'Sachin_Suresh.pdf')


class RateLimiter:
    """Sliding window per client key. In-memory, so it's per process: a soft guard, not a security boundary."""

    def __init__(self, limit: int, window_s: float):
        self.limit, self.window_s = limit, window_s
        self.hits: Dict[str, Deque[float]] = defaultdict(deque)
        self.lock = threading.Lock()

    def allow(self, key: str, now: Optional[float] = None) -> bool:
        now = time.monotonic() if now is None else now
        with self.lock:
            q = self.hits[key]
            while q and now - q[0] > self.window_s:
                q.popleft()
            if len(q) >= self.limit:
                return False
            q.append(now)
            return True


class DuelService:
    def __init__(self, portfolio_data: Dict, llm, github: Optional[GithubClient] = None, rng: Optional[random.Random] = None):
        self.data = portfolio_data
        self.llm = llm
        self.github = github or GithubClient()
        self.rng = rng
        self.extract_model = os.getenv('DUEL_EXTRACT_MODEL', 'openai/gpt-oss-20b')
        self.judge_model = os.getenv('DUEL_JUDGE_MODEL', os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b'))
        self.fallback_model = os.getenv('GROQ_FALLBACK_MODEL', 'openai/gpt-oss-20b')
        self.sachin_resume_path = SACHIN_RESUME
        self._sachin: Optional[Fighter] = None
        self._sachin_lock = threading.Lock()

    def _sachin_profile(self) -> Fighter:
        """Extracted once per process from Sachin's own résumé; falls back to portfolio data if that fails."""
        with self._sachin_lock:
            if self._sachin is None:
                try:
                    with open(self.sachin_resume_path, 'rb') as f:
                        text, links = extract_resume(f.read())
                    self._sachin = extract_fighter(
                        self.llm, text, links, model=self.extract_model, fallback_model=self.fallback_model
                    )
                    self._sachin.name = self.data['profile']['name']
                except Exception as e:
                    log.warning("Couldn't extract Sachin's résumé, using portfolio data instead: %s", e)
                    return sachin_fighter(self.data)  # not cached, so the next duel retries the résumé
            return self._sachin.model_copy(deep=True)

    def sachin(self) -> Fighter:
        f = self._sachin_profile()
        f.github = self.github.stats(SACHIN_GITHUB)
        return f

    def run(self, pdf_bytes: bytes, github_override: str = '') -> Iterator[Dict]:
        if self.llm is None:
            yield {'stage': 'error', 'message': "The duel judges are offline right now (the AI isn't configured). Try again later."}
            return
        try:
            yield {'stage': 'reading'}
            text, links = extract_resume(pdf_bytes)
            challenger = extract_fighter(
                self.llm, text, links, model=self.extract_model, fallback_model=self.fallback_model
            )

            override = github_override.strip().lstrip('@')
            username = override if valid_username(override) else find_github_username(links, text)
            yield {'stage': 'github', 'username': username}
            challenger.github = self.github.stats(username) if username else None
            sachin = self.sachin()

            yield {'stage': 'judging', 'challenger': challenger.name}
            result = judge(
                self.llm, challenger, sachin, model=self.judge_model, fallback_model=self.fallback_model, rng=self.rng
            )
            result['github_lookup'] = {'username': username, 'found': challenger.github is not None}
            yield {'stage': 'done', 'result': result}
        except ResumeError as e:
            yield {'stage': 'error', 'message': str(e)}
        except Exception:
            # Log the failure type only: the traceback could carry résumé content
            log.error('Duel failed', exc_info=False)
            yield {'stage': 'error', 'message': 'The judges hit a snag scoring this one. Please try again in a minute.'}
