import json
import os
import sys

import pytest

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from duel import identity as identity_mod  # noqa: E402
from duel.identity import challenger_identity, find_email, normalize_email  # noqa: E402
from duel.pdf import extract_resume  # noqa: E402
from synthetic_resume import build  # noqa: E402


@pytest.fixture(autouse=True)
def secret(monkeypatch):
    monkeypatch.setenv('DUEL_ID_SECRET', 'test-secret')


def test_mailto_link_wins_over_text():
    links = ['https://github.com/x', 'mailto:Link.Person@Example.com?subject=Hi']
    assert find_email(links, 'reach me at text.person@example.com') == 'link.person@example.com'


def test_text_email_used_when_there_is_no_mailto():
    assert find_email(['https://linkedin.com/in/x'], 'Phone 123 |  Text.Person@Example.COM | Pune') == 'text.person@example.com'
    assert find_email([], 'no contact here') is None


def test_url_encoded_mailto():
    assert find_email(['mailto:%20someone%40example.com'], '') == 'someone@example.com'


@pytest.mark.parametrize('raw, expected', [
    ('A.Ar.Av+jobs@Gmail.com', 'aarav@gmail.com'),
    ('aarav@googlemail.com', 'aarav@gmail.com'),
    ('  first.last+x@company.io ', 'first.last+x@company.io'),  # only gmail ignores dots and +tags
    ('not-an-email', None),
])
def test_email_normalisation(raw, expected):
    assert normalize_email(raw) == expected


def test_gmail_variants_share_a_key():
    a = challenger_identity('a.ar.av+duel@gmail.com', [])
    b = challenger_identity('', ['mailto:AARAV@googlemail.com'])
    assert a.kind == b.kind == 'email' and a.key == b.key


def test_github_fallback():
    ident = challenger_identity('no email in this one', [], 'Aarav-Mehta-Demo')
    assert ident.kind == 'github'
    assert ident.key == challenger_identity('', [], 'aarav-mehta-demo').key


def test_a_name_alone_is_not_an_identity():
    # Namesakes would otherwise overwrite each other's wall entry; with no email or GitHub it's a one-off entry
    assert challenger_identity('Aarav Mehta, ML engineer, Pune', [], None) is None
    assert challenger_identity('', [], '   ') is None


def test_email_and_github_kinds_never_collide():
    assert challenger_identity('', [], 'aarav').key != challenger_identity('mail: aarav@example.com', [], None).key


def test_same_input_same_key_and_secret_changes_it(monkeypatch):
    text, links = extract_resume(build())
    first = challenger_identity(text, links, 'aarav-mehta-demo')
    assert first.kind == 'email'
    assert first == challenger_identity(text, links, 'aarav-mehta-demo')
    assert len(first.key) == 64 and int(first.key, 16) >= 0

    monkeypatch.setenv('DUEL_ID_SECRET', 'another-secret')
    assert challenger_identity(text, links).key != first.key


def test_missing_secret_falls_back_with_one_warning(monkeypatch, caplog):
    monkeypatch.delenv('DUEL_ID_SECRET')
    monkeypatch.setattr(identity_mod, '_warned', False)
    with caplog.at_level('WARNING', logger='duel.identity'):
        a = challenger_identity('x@example.com', [])
        b = challenger_identity('x@example.com', [])
    assert a == b
    assert len([r for r in caplog.records if 'DUEL_ID_SECRET' in r.getMessage()]) == 1
    assert 'x@example.com' not in caplog.text


def test_raw_email_never_leaks_into_the_key_or_the_public_row():
    from test_duel import make_service

    from duel.history import summarize

    pdf = build()
    text, links = extract_resume(pdf)
    ident = challenger_identity(text, links)
    for part in ('aarav.mehta@example.com', 'aarav.mehta', 'example.com'):
        assert part not in ident.key and part not in repr(ident)

    row = summarize(list(make_service().run(pdf))[-1]['result'])
    flat = json.dumps(row)
    assert '@' not in flat and 'identity' not in flat
