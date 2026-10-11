"""Public GitHub stats for a fighter, plus the deterministic open-source round score."""
import math
import os
import re
import time
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional, Tuple

import httpx
from pydantic import BaseModel

API = 'https://api.github.com'
CACHE_TTL_S = 3600

# github.com/<user> only: a repo link (github.com/<user>/<repo>) still yields the user
_GITHUB_URL = re.compile(r'github\.com/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))(?=[/?#\s)]|$)', re.I)
_RESERVED = {'orgs', 'about', 'features', 'topics', 'collections', 'sponsors', 'settings', 'marketplace', 'apps'}
_USERNAME = re.compile(r'^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$')


class TopRepo(BaseModel):
    name: str
    stars: int
    language: Optional[str] = None
    url: str


class GithubStats(BaseModel):
    username: str
    avatar_url: str
    profile_url: str
    followers: int
    original_repos: int
    stars: int
    forks: int
    active_repos_90d: int
    account_age_years: float
    top_languages: List[Tuple[str, int]]
    top_repos: List[TopRepo]
    contributions_last_year: Optional[int] = None


def valid_username(name: str) -> bool:
    return bool(_USERNAME.match(name or ''))


def find_github_username(links: Iterable[str], text: str) -> Optional[str]:
    """Prefer a bare profile link (github.com/<user>) over a repo link, which may be someone else's project.
    Links are checked before text: they're exact, while extracted PDF text can break URLs across lines."""
    sources = [*links, text]
    for profile_only in (True, False):
        for source in sources:
            for match in _GITHUB_URL.finditer(source or ''):
                name = match.group(1)
                rest = (source or '')[match.end():]
                is_repo = bool(re.match(r'/[A-Za-z0-9._-]+', rest))
                if name.lower() not in _RESERVED and (not profile_only or not is_repo):
                    return name
    return None


def compute_stats(user: Dict, repos: List[Dict], now: Optional[datetime] = None) -> GithubStats:
    now = now or datetime.now(timezone.utc)
    own = [r for r in repos if not r.get('fork')]
    langs = Counter(r['language'] for r in own if r.get('language'))
    cutoff = now - timedelta(days=90)

    def pushed(r: Dict) -> Optional[datetime]:
        value = r.get('pushed_at')
        return datetime.fromisoformat(value.replace('Z', '+00:00')) if value else None

    created = user.get('created_at')
    age = (now - datetime.fromisoformat(created.replace('Z', '+00:00'))).days / 365.25 if created else 0.0
    top = sorted(own, key=lambda r: r.get('stargazers_count', 0), reverse=True)[:3]
    return GithubStats(
        username=user['login'],
        avatar_url=user.get('avatar_url', ''),
        profile_url=user.get('html_url', f"https://github.com/{user['login']}"),
        followers=user.get('followers', 0),
        original_repos=len(own),
        stars=sum(r.get('stargazers_count', 0) for r in own),
        forks=sum(r.get('forks_count', 0) for r in own),
        active_repos_90d=sum(1 for r in own if (p := pushed(r)) and p >= cutoff),
        account_age_years=round(age, 1),
        top_languages=langs.most_common(5),
        top_repos=[
            TopRepo(name=r['name'], stars=r.get('stargazers_count', 0), language=r.get('language'), url=r['html_url'])
            for r in top
        ],
    )


def open_source_score(stats: Optional[GithubStats]) -> int:
    """0-100. Log scales so one viral repo doesn't swamp sustained, broad work."""
    if stats is None:
        return 0
    stars = min(1.0, math.log10(1 + stats.stars) / math.log10(1 + 200))        # 200★ = full marks
    repos = min(1.0, math.log10(1 + stats.original_repos) / math.log10(1 + 40))  # 40 repos
    active = min(1.0, stats.active_repos_90d / 8)                                # 8 repos touched in 90 days
    langs = min(1.0, len(stats.top_languages) / 5)
    followers = min(1.0, math.log10(1 + stats.followers) / math.log10(1 + 100))
    score = 30 * stars + 25 * repos + 25 * active + 10 * langs + 10 * followers
    return round(score)


class GithubClient:
    def __init__(self, token: Optional[str] = None, transport: Optional[httpx.BaseTransport] = None):
        token = token if token is not None else os.getenv('GITHUB_TOKEN')
        headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'portfolio-duel'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        self.has_token = bool(token)
        self.http = httpx.Client(base_url=API, headers=headers, timeout=10, transport=transport)
        self._cache: Dict[str, Tuple[float, Optional[GithubStats]]] = {}

    def stats(self, username: str) -> Optional[GithubStats]:
        """None when the user doesn't exist or GitHub is unavailable; the duel goes on without it."""
        if not valid_username(username):
            return None
        key = username.lower()
        hit = self._cache.get(key)
        if hit and time.monotonic() - hit[0] < CACHE_TTL_S:
            return hit[1]
        try:
            stats = self._fetch(username)
        except httpx.HTTPError:
            return None  # rate limit / outage: don't cache, so the next duel retries
        self._cache[key] = (time.monotonic(), stats)
        return stats

    def _fetch(self, username: str) -> Optional[GithubStats]:
        user = self.http.get(f'/users/{username}')
        if user.status_code == 404:
            return None
        user.raise_for_status()
        repos = self.http.get(f'/users/{username}/repos', params={'per_page': 100, 'type': 'owner', 'sort': 'pushed'})
        repos.raise_for_status()
        stats = compute_stats(user.json(), repos.json())
        if self.has_token:
            stats.contributions_last_year = self._contributions(username)
        return stats

    def _contributions(self, username: str) -> Optional[int]:
        query = 'query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{totalContributions}}}}'
        try:
            r = self.http.post('/graphql', json={'query': query, 'variables': {'u': username}})
            r.raise_for_status()
            return r.json()['data']['user']['contributionsCollection']['contributionCalendar']['totalContributions']
        except (httpx.HTTPError, KeyError, TypeError):
            return None
