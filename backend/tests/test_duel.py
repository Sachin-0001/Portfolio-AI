import json
import os
import random
import sys
from datetime import date, datetime, timezone
from types import SimpleNamespace

import httpx
import pytest

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from duel import judge as judge_mod  # noqa: E402
from duel.github import GithubClient, GithubStats, compute_stats, find_github_username, open_source_score  # noqa: E402
from duel.pdf import MAX_BYTES, ResumeError, extract_resume  # noqa: E402
from duel.profiles import Fighter, Project, Role, months_between, sachin_fighter  # noqa: E402
from duel.service import DuelService, RateLimiter  # noqa: E402
from synthetic_resume import build  # noqa: E402

SACHIN_PDF = os.path.join(BACKEND, '..', 'frontend', 'public', 'Sachin_Suresh.pdf')
with open(os.path.join(BACKEND, 'portfolio_data.json'), encoding='utf-8') as f:
    DATA = json.load(f)


# ---------- fakes ----------

def side(score, evidence=()):
    return {'score': score, 'evidence': list(evidence)}


def verdict(a_scores, b_scores, a_ev=(), b_ev=()):
    rounds = {}
    for i, (key, _, _) in enumerate(judge_mod.LLM_ROUNDS):
        rounds[key] = {'red': side(a_scores[i], a_ev), 'blue': side(b_scores[i], b_ev), 'commentary': 'Red edges Blue.'}
    return {**rounds, 'announcer': 'In the Red corner versus the Blue corner!', 'red_learn_from_blue': 'Red learns', 'blue_learn_from_red': 'Blue learns'}


EXTRACTED = {
    'name': 'Aarav Mehta',
    'headline': 'ML Intern at Nimbus Analytics',
    'education': [{'institution': 'Northfield Institute of Technology', 'degree': 'B.Tech CS', 'score': '9.1', 'end': '2026'}],
    'experience': [{'company': 'Nimbus Analytics', 'role': 'Machine Learning Intern', 'start': '2025-01', 'end': '2025-12',
                    'highlights': ['cut stock-outs by 18% across 40 stores']}],
    'projects': [{'name': 'DocuMind', 'summary': 'RAG assistant with LangChain and FAISS', 'tech': ['LangChain', 'FAISS']}],
    'skills': ['Python', 'PyTorch', 'NextJS', 'Postgres'],
    'achievements': ['Winner, Smart India Hackathon 2024'],
}


class FakeLLM:
    def __init__(self, judge_reply=None, extract_reply=None):
        self.judge_reply = judge_reply or verdict([60] * 4, [60] * 4)
        self.extract_reply = extract_reply or EXTRACTED
        self.calls = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def with_options(self, **_):
        return self

    def _create(self, **kw):
        self.calls.append(kw)
        name = kw['response_format']['json_schema']['name']
        reply = self.extract_reply if name == 'resume_profile' else self.judge_reply
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(reply)))])


def github_transport(users):
    """users: {login: (user_json, repos_json)}; anything else is a 404."""
    def handler(request: httpx.Request):
        parts = request.url.path.strip('/').split('/')
        if parts[0] == 'users' and parts[1] in users:
            user, repos = users[parts[1]]
            return httpx.Response(200, json=repos if len(parts) == 3 else user)
        return httpx.Response(404, json={'message': 'Not Found'})
    return httpx.MockTransport(handler)


def gh_user(login, **kw):
    return {'login': login, 'avatar_url': 'https://avatars/x', 'html_url': f'https://github.com/{login}',
            'followers': 10, 'created_at': '2022-01-01T00:00:00Z', **kw}


def gh_repo(name, stars=0, fork=False, lang='Python', pushed='2026-10-01T00:00:00Z'):
    return {'name': name, 'stargazers_count': stars, 'forks_count': 1, 'fork': fork, 'language': lang,
            'pushed_at': pushed, 'html_url': f'https://github.com/x/{name}'}


def fighter(name='Aarav Mehta', **kw):
    return Fighter(name=name, headline='Engineer', **kw)


# ---------- pdf ----------

def test_extracts_text_and_link_annotations_from_real_resume():
    with open(SACHIN_PDF, 'rb') as f:
        text, links = extract_resume(f.read())
    assert 'SACHIN SURESH' in text
    assert 'https://github.com/Sachin-0001' in links


def test_extracts_synthetic_resume():
    text, links = extract_resume(build())
    assert 'Aarav Mehta' in text and 'https://github.com/aarav-mehta-demo' in links


@pytest.mark.parametrize('data, message', [
    (b'hello, not a pdf' * 20, 'as a PDF'),
    (b'%PDF' + b'0' * MAX_BYTES, 'over 5 MB'),
    (build(text=False), 'looks scanned'),
    (build(pages=7), '7 pages'),
    (b'%PDF-1.4 garbage', "Couldn't read"),
])
def test_rejects_bad_uploads(data, message):
    with pytest.raises(ResumeError, match=message):
        extract_resume(data)


# ---------- github ----------

@pytest.mark.parametrize('links, text, expected', [
    (['https://github.com/facebook/react', 'https://github.com/alice'], '', 'alice'),  # profile beats repo
    (['https://github.com/facebook/react'], '', 'facebook'),
    ([], 'Find me at github.com/bob-dev | linkedin', 'bob-dev'),
    (['https://github.com/orgs/acme'], '', None),  # an org page isn't the candidate's account
    (['https://linkedin.com/in/x'], 'no github here', None),
])
def test_finds_github_username(links, text, expected):
    assert find_github_username(links, text) == expected


def test_compute_stats_ignores_forks_and_counts_recent_activity():
    now = datetime(2026, 10, 11, tzinfo=timezone.utc)
    repos = [gh_repo('a', 10), gh_repo('b', 5, pushed='2025-01-01T00:00:00Z', lang='Go'), gh_repo('fork', 999, fork=True)]
    s = compute_stats(gh_user('x'), repos, now=now)
    assert (s.original_repos, s.stars, s.active_repos_90d) == (2, 15, 1)
    assert s.top_languages == [('Python', 1), ('Go', 1)]
    assert [r.name for r in s.top_repos] == ['a', 'b']


def test_open_source_score_is_bounded_and_monotonic():
    base = dict(username='x', avatar_url='', profile_url='', followers=0, forks=0, account_age_years=1,
                top_languages=[], top_repos=[])
    small = GithubStats(**base, original_repos=2, stars=1, active_repos_90d=1)
    big = GithubStats(**{**base, 'followers': 500, 'top_languages': [('a', 1)] * 5}, original_repos=100, stars=5000, active_repos_90d=20)
    assert open_source_score(None) == 0
    assert 0 < open_source_score(small) < open_source_score(big) == 100


def test_github_client_handles_missing_users_and_outages():
    gh = GithubClient(token='', transport=github_transport({'alice': (gh_user('alice'), [gh_repo('r', 3)])}))
    assert gh.stats('alice').stars == 3
    assert gh.stats('nobody') is None
    assert gh.stats('not a valid/name') is None

    def boom(request):
        raise httpx.ConnectError('down')
    down = GithubClient(token='', transport=httpx.MockTransport(boom))
    assert down.stats('alice') is None
    assert 'alice' not in down._cache  # outages aren't cached


# ---------- profiles ----------

def test_months_between():
    today = date(2026, 10, 1)
    assert months_between('2025-01', '2025-12') == 12
    assert months_between('Jun 2026', 'Present', today) == 5
    assert months_between('2025-01', '') == 0  # unknown end is unknown, not "present"
    assert months_between('garbage', '2025-01') == 0
    assert months_between('2025-06', '2025-01') == 0


def test_sachin_fighter_maps_portfolio_data():
    f = sachin_fighter(DATA, today=date(2026, 10, 1))
    assert f.name == 'Sachin Suresh'
    assert [r.company for r in f.experience] == ['Capmob Financial Services', 'XTrail Consulting Services']
    assert f.experience_months == 5 + 6
    assert len(f.projects) == len(DATA['projects'])


# ---------- judging ----------

@pytest.mark.parametrize('challenger_is_a', [True, False])
def test_blind_scores_map_back_to_the_right_side_in_either_order(challenger_is_a):
    challenger = fighter(skills=['Python'])
    sachin = sachin_fighter(DATA)
    rng = SimpleNamespace(random=lambda: 0.1 if challenger_is_a else 0.9)
    a, b = [80, 70, 60, 50], [40, 30, 20, 10]
    llm = FakeLLM(judge_reply=verdict(a, b))
    result = judge_mod.judge(llm, challenger, sachin, model='m', fallback_model=None, rng=rng)

    c_scores = [r['challenger']['score'] for r in result['rounds'] if r['key'] != 'open_source']
    expected = a if challenger_is_a else b
    assert c_scores == [expected[0], expected[1], expected[2], expected[3]]

    prompt = llm.calls[0]['messages'][1]['content']
    assert 'Sachin' not in prompt and 'Aarav' not in prompt  # names stripped

    first, second = ('Aarav', 'Sachin') if challenger_is_a else ('Sachin', 'Aarav')
    assert result['announcer'] == f'In {first} versus {second}!'


def test_order_is_randomised():
    seen = set()
    for seed in range(20):
        llm = FakeLLM()
        judge_mod.judge(llm, fighter(), sachin_fighter(DATA), model='m', fallback_model=None, rng=random.Random(seed))
        fighter_a = llm.calls[0]['messages'][1]['content'].split('</red_corner>')[0]
        seen.add('Capmob' in fighter_a)  # is Sachin Fighter A this time?
    assert seen == {True, False}


def test_fabricated_evidence_is_dropped():
    profile = {'experience': [{'highlights': ['Cut stock-outs by 18% across 40 stores.']}]}
    quotes = ['cut stock-outs by 18% across 40 stores', 'Led a team of 50 engineers at Google', 'ok']
    assert judge_mod.verified_evidence(quotes, profile) == ['cut stock-outs by 18% across 40 stores']


def test_scores_are_clamped():
    llm = FakeLLM(judge_reply=verdict([150, -5, 50, 50], [50] * 4))
    r = judge_mod.judge(llm, fighter(), sachin_fighter(DATA), model='m', fallback_model=None, rng=random.Random(0))
    scores = [x['challenger']['score'] for x in r['rounds']] + [x['sachin']['score'] for x in r['rounds']]
    assert all(0 <= s <= 100 for s in scores)


@pytest.mark.parametrize('c, s, expected', [
    (60, 58, ('draw', 'draw')),
    (60, 50, ('challenger', 'decision')),
    (40, 60, ('sachin', 'ko')),
])
def test_decision_thresholds(c, s, expected):
    assert judge_mod.decide(c, s) == expected


def test_skills_overlap_uses_aliases():
    c = fighter(skills=['NextJS', 'Postgres', 'Rust'], projects=[Project(name='p', summary='s', tech=['PyTorch'])])
    s = fighter('Sachin', skills=['Next.js', 'PostgreSQL', 'PyTorch', 'Go'])
    o = judge_mod.skills_overlap(c, s)
    assert o['shared'] == ['Next.js', 'PostgreSQL', 'PyTorch']
    assert o['only_challenger'] == ['Rust'] and o['only_sachin'] == ['Go']


def test_open_source_round_no_show():
    r = judge_mod.open_source_round(fighter(), fighter('Sachin'))
    assert r['winner'] == 'tie' and 'no-contest' in r['commentary']


# ---------- service ----------

def make_service(llm=FakeLLM()):
    users = {'aarav-mehta-demo': (gh_user('aarav-mehta-demo'), [gh_repo('documind', 12)]),
             'Sachin-0001': (gh_user('Sachin-0001'), [gh_repo('Harness', 3)])}
    return DuelService(DATA, llm, github=GithubClient(token='', transport=github_transport(users)), rng=random.Random(1))


def test_sachin_is_extracted_from_his_resume_once_and_falls_back_to_portfolio_data(tmp_path):
    llm = FakeLLM()
    svc = make_service(llm)
    first, second = svc.sachin(), svc.sachin()
    extractions = [c for c in llm.calls if c['response_format']['json_schema']['name'] == 'resume_profile']
    assert len(extractions) == 1  # cached
    assert first.name == second.name == 'Sachin Suresh'
    assert first is not second  # callers get copies, so setting .github can't leak between duels

    broken = make_service(FakeLLM())
    broken.sachin_resume_path = str(tmp_path / 'missing.pdf')
    assert [r.company for r in broken.sachin().experience][0] == 'Capmob Financial Services'


def test_em_dashes_are_removed_from_judge_text():
    assert judge_mod._rename('Red wins\u2014easily', 'Aarav', 'Sachin') == 'Aarav wins, easily'


@pytest.mark.parametrize('text, expected', [
    ('The Red corner edges Blue.', 'Aarav edges Sachin.'),
    ("Blue's stack beats Red fighter's", "Sachin's stack beats Aarav's"),
    ('Fighter A vs Fighter B', 'Aarav vs Sachin'),
    ('No red flags for Blue', 'No red flags for Sachin'),  # lowercase words are untouched
])
def test_corner_labels_become_names(text, expected):
    assert judge_mod._rename(text, 'Aarav', 'Sachin') == expected


def test_run_streams_stages_then_result():
    events = list(make_service().run(build()))
    assert [e['stage'] for e in events] == ['reading', 'github', 'judging', 'done']
    assert events[1]['username'] == 'aarav-mehta-demo'
    result = events[-1]['result']
    assert result['github_lookup'] == {'username': 'aarav-mehta-demo', 'found': True}
    assert [r['key'] for r in result['rounds']] == judge_mod.ROUND_ORDER
    assert result['fighters']['challenger']['stats']['experience_months'] == 12


def test_github_override_wins_over_resume_link():
    events = list(make_service().run(build(), '@Sachin-0001'))
    assert events[1]['username'] == 'Sachin-0001'


def test_bad_upload_and_offline_llm_end_in_error():
    assert list(make_service().run(b'nope'))[-1]['stage'] == 'error'
    assert [e['stage'] for e in make_service(llm=None).run(build())] == ['error']


def test_rate_limiter_window():
    rl = RateLimiter(limit=2, window_s=10)
    assert rl.allow('ip', 0) and rl.allow('ip', 1) and not rl.allow('ip', 2)
    assert rl.allow('other', 2)
    assert rl.allow('ip', 11.5)


# ---------- API ----------

def test_api_streams_ndjson_and_rate_limits(monkeypatch):
    from fastapi.testclient import TestClient

    import main

    monkeypatch.setattr(main, 'duel_service', make_service())
    monkeypatch.setattr(main, 'duel_limiter', RateLimiter(limit=1, window_s=600))
    client = TestClient(main.app)  # no lifespan: the real RAG/embedding model isn't loaded

    r = client.post('/api/duel', files={'file': ('cv.pdf', build(), 'application/pdf')}, headers={'x-forwarded-for': '1.2.3.4'})
    assert r.status_code == 200 and r.headers['content-type'].startswith('application/x-ndjson')
    lines = [json.loads(line) for line in r.text.splitlines()]
    assert lines[-1]['stage'] == 'done'

    again = client.post('/api/duel', files={'file': ('cv.pdf', build(), 'application/pdf')}, headers={'x-forwarded-for': '1.2.3.4'})
    assert again.status_code == 429


def test_schema_slip_is_retried_once():
    import httpx as _httpx
    from groq import BadRequestError

    from llm import complete_json

    def slip():
        response = _httpx.Response(400, request=_httpx.Request('POST', 'https://api.groq.com'))
        return BadRequestError("json_validate_failed: missing properties", response=response, body=None)

    attempts = []

    class Flaky(FakeLLM):
        def _create(self, **kw):
            attempts.append(kw)
            if len(attempts) == 1:
                raise slip()
            return super()._create(**kw)

    out = complete_json(Flaky(), [], {}, name='resume_profile', model='m')
    assert out['name'] == 'Aarav Mehta' and len(attempts) == 2


# ---------- public history ----------

from duel.history import display_name, summarize  # noqa: E402


class FakeHistory:
    enabled = True

    def __init__(self, fail=False):
        self.rows, self.fail = [], fail
        self.keys = {}  # identity_hash -> index into rows, like the partial unique index

    def record(self, row, identity_hash=None):
        if self.fail:
            raise RuntimeError('db down')
        if identity_hash is not None and identity_hash in self.keys:
            i = self.keys[identity_hash]
            self.rows[i] = {**row, 'id': self.rows[i]['id'], 'duel_count': self.rows[i]['duel_count'] + 1}
            return {'id': self.rows[i]['id'], 'rematch': True}
        self.rows.append({**row, 'id': f'id-{len(self.rows) + 1}', 'duel_count': 1})
        if identity_hash is not None:
            self.keys[identity_hash] = len(self.rows) - 1
        return {'id': self.rows[-1]['id'], 'rematch': False}

    def recent(self, limit=24):
        return {'enabled': True, 'duels': self.rows[:limit], 'record': {'wins': 0, 'losses': 0, 'draws': 0, 'total': len(self.rows)}}


@pytest.mark.parametrize('full, shown', [
    ('Aarav Mehta', 'Aarav M.'),
    ('Priya', 'Priya'),
    ('Ana María de la Cruz', 'Ana C.'),
    ('   ', 'Challenger'),
])
def test_display_name_keeps_first_name_and_last_initial(full, shown):
    assert display_name(full) == shown


def test_summary_holds_headline_facts_only():
    result = list(make_service().run(build()))[-1]['result']
    result['fighters']['challenger']['headline'] = 'x' * 200
    row = summarize(result)
    assert row['challenger_name'] == 'Aarav M.'
    assert len(row['challenger_headline']) == 90
    assert row['challenger_github'] == 'aarav-mehta-demo'
    flat = json.dumps(row)
    for leak in ('evidence', 'commentary', 'announcer', 'learn', 'cut stock-outs', 'Mehta'):
        assert leak not in flat
    assert set(row['rounds'][0]) == {'key', 'title', 'challenger', 'sachin', 'winner'}


def test_service_shares_only_when_asked():
    history = FakeHistory()
    svc = make_service()
    svc.history = history
    assert list(svc.run(build()))[-1]['result']['shared'] is None
    assert history.rows == []
    assert list(svc.run(build(), share=True))[-1]['result']['shared'] == {'id': 'id-1', 'rematch': False}
    assert len(history.rows) == 1


def test_database_failure_still_returns_the_result():
    svc = make_service()
    svc.history = FakeHistory(fail=True)
    last = list(svc.run(build(), share=True))[-1]
    assert last['stage'] == 'done' and last['result']['shared'] is None


def test_api_always_shares_and_serves_the_public_wall(monkeypatch):
    from fastapi.testclient import TestClient

    import main

    history = FakeHistory()
    svc = make_service()
    svc.history = history
    monkeypatch.setattr(main, 'duel_service', svc)
    monkeypatch.setattr(main, 'duel_history', history)
    monkeypatch.setattr(main, 'duel_limiter', RateLimiter(limit=5, window_s=600))
    client = TestClient(main.app)

    r = client.post('/api/duel', files={'file': ('cv.pdf', build(), 'application/pdf')})  # no opt-in field
    assert json.loads(r.text.splitlines()[-1])['result']['shared'] == {'id': 'id-1', 'rematch': False}
    wall = client.get('/api/duels?limit=5').json()
    assert wall['record']['total'] == 1 and wall['duels'][0]['challenger_name'] == 'Aarav M.'
    assert client.get('/api/duels?limit=500').status_code == 422

    monkeypatch.setattr(main, 'duel_history', SimpleNamespace(enabled=False))
    assert client.get('/api/duels').json() == {'enabled': False, 'duels': [], 'record': None}


def test_rematch_with_same_email_updates_the_one_wall_entry():
    history = FakeHistory()
    svc = make_service()
    svc.history = history
    first = list(svc.run(build(), share=True))[-1]['result']['shared']
    second = list(svc.run(build(), share=True))[-1]['result']['shared']
    assert first == {'id': 'id-1', 'rematch': False}
    assert second == {'id': 'id-1', 'rematch': True}
    assert len(history.rows) == 1 and history.rows[0]['duel_count'] == 2
    assert 'aarav.mehta@example.com' not in json.dumps(history.rows) + json.dumps(list(history.keys))


def test_different_email_gets_its_own_wall_entry(monkeypatch):
    import synthetic_resume

    history = FakeHistory()
    svc = make_service()
    svc.history = history
    list(svc.run(build(), share=True))
    other = [(line.replace('aarav.mehta@example.com', 'someone.else@example.org'), size)
             for line, size in synthetic_resume.LINES]
    monkeypatch.setattr(synthetic_resume, 'LINES', other)
    shared = list(svc.run(build(), share=True))[-1]['result']['shared']
    assert shared == {'id': 'id-2', 'rematch': False}
    assert len(history.rows) == 2 and [r['duel_count'] for r in history.rows] == [1, 1]


class FakeConn:
    """Stands in for a psycopg connection so the real DuelHistory SQL can be checked offline."""

    def __init__(self, log, reply):
        self.log, self.reply = log, reply

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=()):
        self.log.append((sql, params))
        reply = self.reply

        class Cursor:
            def fetchone(self):
                return reply

            def fetchall(self):
                return []
        return Cursor()


@pytest.mark.parametrize('inserted, rematch', [(True, False), (False, True)])
def test_history_upserts_on_identity_and_never_selects_it_for_the_wall(monkeypatch, inserted, rematch):
    from duel.history import DuelHistory

    calls = []
    h = DuelHistory('postgresql://fake')
    monkeypatch.setattr(h, '_connect', lambda: FakeConn(calls, {'id': 'abc', 'inserted': inserted}))
    row = summarize(list(make_service().run(build()))[-1]['result'])
    assert h.record(row, 'k' * 64) == {'id': 'abc', 'rematch': rematch}
    sql, params = calls[0]
    assert 'on conflict (identity_hash) where identity_hash is not null do update' in sql
    assert 'duel_count = public.duels.duel_count + 1' in sql and 'created_at' not in sql
    assert params[-1] == 'k' * 64

    h.recent(5)
    wall_sql = calls[1][0]
    assert 'identity_hash' not in wall_sql and 'order by updated_at desc' in wall_sql
    assert 'duel_count' in wall_sql and 'updated_at' in wall_sql
