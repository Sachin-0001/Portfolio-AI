"""Public duel history in Postgres (Supabase). Every duel is stored, but only headline facts:
a display name, headline, GitHub avatar and scores. Never résumé text, evidence quotes or commentary."""
import logging
import threading
import time
from decimal import Decimal
from typing import Dict, List, Optional

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

log = logging.getLogger(__name__)

NAME_MAX = 40
HEADLINE_MAX = 90
CACHE_TTL_S = 15

# Idempotent, so it runs on every boot. RLS on with no policies: Supabase's public REST API (anon key)
# can neither read nor write this table; only this backend's direct connection (the table owner) can.
SCHEMA = """
create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  challenger_name text not null check (char_length(challenger_name) between 1 and 40),
  challenger_headline text not null default '' check (char_length(challenger_headline) <= 90),
  challenger_github text,
  challenger_avatar text,
  challenger_total numeric(4,1) not null,
  sachin_total numeric(4,1) not null,
  winner text not null check (winner in ('challenger', 'sachin', 'draw')),
  decision text not null check (decision in ('ko', 'decision', 'draw')),
  rounds jsonb not null
);
create index if not exists duels_created_at_idx on public.duels (created_at desc);
alter table public.duels enable row level security;
"""


def display_name(full: str) -> str:
    """'Aarav Mehta' -> 'Aarav M.': enough to recognise yourself, not enough to identify someone."""
    parts = full.split()
    if not parts:
        return 'Challenger'
    name = parts[0] if len(parts) == 1 else f'{parts[0]} {parts[-1][0].upper()}.'
    return name[:NAME_MAX]


def _clip(text: str, limit: int) -> str:
    text = ' '.join((text or '').split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + '…'


def summarize(result: Dict) -> Dict:
    """The public row for a duel result: headline facts only."""
    c = result['fighters']['challenger']
    gh = c.get('github') or {}
    return {
        'challenger_name': display_name(c['name']),
        'challenger_headline': _clip(c.get('headline', ''), HEADLINE_MAX),
        'challenger_github': gh.get('username'),
        'challenger_avatar': gh.get('avatar_url'),
        'challenger_total': result['totals']['challenger'],
        'sachin_total': result['totals']['sachin'],
        'winner': result['winner'],
        'decision': result['decision'],
        'rounds': [
            {
                'key': r['key'],
                'title': r['title'],
                'challenger': r['challenger']['score'],
                'sachin': r['sachin']['score'],
                'winner': r['winner'],
            }
            for r in result['rounds']
        ],
    }


def _jsonable(row: Dict) -> Dict:
    out = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            v = float(v)
        elif hasattr(v, 'isoformat'):
            v = v.isoformat()
        elif k == 'id':
            v = str(v)
        out[k] = v
    return out


class DuelHistory:
    def __init__(self, dsn: Optional[str]):
        self.dsn = dsn
        self._cache: Dict[int, tuple] = {}
        self._lock = threading.Lock()

    @property
    def enabled(self) -> bool:
        return bool(self.dsn)

    def _connect(self):
        return psycopg.connect(self.dsn, connect_timeout=5, row_factory=dict_row)

    def ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(SCHEMA)

    def record(self, row: Dict) -> str:
        cols = list(row)
        values = [Jsonb(row[c]) if c == 'rounds' else row[c] for c in cols]
        sql = f"insert into public.duels ({', '.join(cols)}) values ({', '.join(['%s'] * len(cols))}) returning id"
        with self._connect() as conn:
            new_id = conn.execute(sql, values).fetchone()['id']
        with self._lock:
            self._cache.clear()
        return str(new_id)

    def recent(self, limit: int = 24) -> Dict:
        with self._lock:
            hit = self._cache.get(limit)
            if hit and time.monotonic() - hit[0] < CACHE_TTL_S:
                return hit[1]
        with self._connect() as conn:
            duels = conn.execute(
                """select id, created_at, challenger_name, challenger_headline, challenger_github, challenger_avatar,
                          challenger_total, sachin_total, winner, decision, rounds
                   from public.duels order by created_at desc limit %s""",
                (limit,),
            ).fetchall()
            record = conn.execute(
                """select count(*) filter (where winner = 'sachin') as wins,
                          count(*) filter (where winner = 'challenger') as losses,
                          count(*) filter (where winner = 'draw') as draws,
                          count(*) as total
                   from public.duels"""
            ).fetchone()
        data = {'enabled': True, 'duels': [_jsonable(d) for d in duels], 'record': dict(record)}
        with self._lock:
            self._cache[limit] = (time.monotonic(), data)
        return data
