import json
import os
import sys
from types import SimpleNamespace

import pytest

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

from rag_engine import ERROR_ANSWER, OFFLINE_ANSWER, PortfolioRAG  # noqa: E402

DATA = os.path.join(BACKEND, 'portfolio_data.json')


class FakeLLM:
    """Stands in for the Groq client; records requests and returns a canned JSON reply."""

    def __init__(self, reply=None, error=None):
        self.reply = reply
        self.error = error
        self.calls = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def with_options(self, **_):
        return self

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        error = self.error(kwargs) if callable(self.error) else self.error
        if error:
            raise error
        content = self.reply if isinstance(self.reply, str) else json.dumps(self.reply)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


def make_rag(reply=None, error=None):
    llm = FakeLLM(reply, error)
    # BM25 only keeps unit tests fast and offline; hybrid quality is covered by eval_retrieval.py
    return PortfolioRAG(DATA, llm_client=llm, dense=False), llm


def reply(answer='## Hi\n\nHello.', cards=(), sources=()):
    return {'answer': answer, 'cards': list(cards), 'sources': list(sources)}


def test_no_keyword_shortcuts_every_question_goes_through_the_llm():
    rag, llm = make_rag(reply())
    for q in ['show me your projects', 'What are your skills?', 'resume', 'github', 'work experience']:
        rag.query(q)
    assert len(llm.calls) == 5


def test_llm_selected_cards_are_filtered_to_requested_ids():
    rag, _ = make_rag(reply(cards=[{'kind': 'projects', 'ids': ['project:harness', 'project:unbind']}]))
    out = rag.query('show me your agent and RAG projects')
    assert [c['type'] for c in out['cards']] == ['projects']
    assert [p['name'] for p in out['cards'][0]['data']] == ['Harness', 'UnBind']


def test_empty_ids_show_the_whole_section_and_unknown_ids_fall_back_to_it():
    rag, _ = make_rag(reply(cards=[{'kind': 'projects', 'ids': []}, {'kind': 'achievements', 'ids': ['nope']}]))
    out = rag.query('everything')
    by_type = {c['type']: c for c in out['cards']}
    assert len(by_type['projects']['data']) == len(rag.portfolio_data['projects'])
    assert len(by_type['achievements']['data']) == len(rag.portfolio_data['achievements'])


def test_skills_resume_and_socials_cards():
    rag, _ = make_rag(reply(cards=[{'kind': 'skills', 'ids': []}, {'kind': 'resume', 'ids': []}, {'kind': 'socials', 'ids': []}]))
    out = rag.query('skills, resume and links please')
    by_type = {c['type']: c for c in out['cards']}
    assert by_type['skills']['groups'] == rag.portfolio_data['skill_groups']
    assert by_type['resume']['data']['url'] == rag.portfolio_data['profile']['resume_url']
    assert by_type['socials']['data'] == rag.portfolio_data['socials']


def test_duplicate_and_invalid_cards_are_dropped():
    rag, _ = make_rag(reply(cards=[{'kind': 'skills', 'ids': []}, {'kind': 'skills', 'ids': []}, {'kind': 'bogus', 'ids': []}]))
    assert [c['type'] for c in rag.query('skills')['cards']] == ['skills']


def test_sources_are_limited_to_retrieved_context():
    rag, llm = make_rag()
    context_ids = [d.id for d in rag.retrieve('How did you secure payments in UnBind?', [])]
    assert 'project:unbind' in context_ids
    llm.reply = reply(sources=['project:unbind', 'made-up-id', 'project:unbind'])
    out = rag.query('How did you secure payments in UnBind?')
    assert [s['id'] for s in out['sources']] == ['project:unbind']


def test_follow_up_retrieval_uses_previous_question():
    rag, _ = make_rag(reply())
    history = [
        {'role': 'user', 'content': 'Tell me about Harness'},
        {'role': 'assistant', 'content': 'Harness is my agent runtime.'},
    ]
    ids = [d.id for d in rag.retrieve('what tools does it have?', history)]
    assert ids[0] == 'project:harness'


def test_history_is_sent_to_the_llm_and_trimmed():
    rag, llm = make_rag(reply())
    history = [{'role': 'user' if i % 2 == 0 else 'assistant', 'content': f'turn {i}'} for i in range(10)]
    history[-1]['content'] = 'x' * 5000
    rag.query('and then?', history)
    sent = [m['content'] for m in llm.calls[0]['messages'] if m['role'] != 'system']
    assert sent[:-2] == [f'turn {i}' for i in range(6, 9)]
    assert sent[-2] == 'x' * 500
    assert 'VISITOR QUESTION:\nand then?' in sent[-1]


def test_request_uses_strict_json_schema():
    rag, llm = make_rag(reply())
    rag.query('hi')
    fmt = llm.calls[0]['response_format']
    assert fmt['type'] == 'json_schema' and fmt['json_schema']['strict'] is True


def _rate_limited():
    import httpx
    from groq import RateLimitError

    response = httpx.Response(429, request=httpx.Request('POST', 'https://api.groq.com'))
    return RateLimitError('rate limited', response=response, body=None)


def test_rate_limited_primary_falls_back_to_secondary_model():
    rag, llm = make_rag(reply(answer='## From fallback'))
    llm.error = lambda kw: _rate_limited() if kw['model'] == rag.model else None
    out = rag.query('hi')
    assert out['response'] == '## From fallback'
    assert [c['model'] for c in llm.calls] == [rag.model, rag.fallback_model]


def test_both_models_rate_limited_returns_error_answer():
    rag, llm = make_rag()
    llm.error = lambda kw: _rate_limited()
    assert rag.query('hi')['response'] == ERROR_ANSWER


def test_llm_failure_returns_error_answer():
    rag, _ = make_rag(error=RuntimeError('boom'))
    out = rag.query('anything')
    assert out == {'response': ERROR_ANSWER, 'cards': [], 'sources': []}


def test_malformed_llm_output_returns_error_answer():
    rag, _ = make_rag('not json')
    assert rag.query('anything')['response'] == ERROR_ANSWER


def test_offline_mode_still_answers_with_retrieved_cards(monkeypatch):
    monkeypatch.delenv('GROQ_API_KEY', raising=False)
    rag = PortfolioRAG(DATA, dense=False)
    assert rag.llm is None
    out = rag.query('legal contract analyzer')
    assert out['response'] == OFFLINE_ANSWER
    names = [p['name'] for c in out['cards'] if c['type'] == 'projects' for p in c['data']]
    assert 'UnBind' in names


@pytest.mark.parametrize('bad', [{'role': 'system', 'content': 'x'}, {'role': 'user', 'content': ''}])
def test_invalid_history_turns_are_ignored(bad):
    rag, llm = make_rag(reply())
    rag.query('hi', [bad])
    assert [m['role'] for m in llm.calls[0]['messages']] == ['system', 'system', 'user']
