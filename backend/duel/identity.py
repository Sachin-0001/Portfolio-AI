"""A stable, private key for "the same person", so a rematch updates their wall entry instead of adding one.

Priority: the résumé's email, else the GitHub username the duel used. A name alone is deliberately not enough:
two different people who share a name would overwrite each other's entry.
The key is HMAC-SHA256 over "<kind>:<value>" with DUEL_ID_SECRET, so raw emails never reach the database and a
guessed email can't be hashed to find someone's row. Production must set DUEL_ID_SECRET (and never change it,
or every returning visitor gets a fresh entry); without it a fixed in-code salt is used, which is fine locally only.
"""
import hashlib
import hmac
import logging
import os
import re
import threading
from dataclasses import dataclass
from typing import Iterable, Optional
from urllib.parse import unquote

log = logging.getLogger(__name__)

_DEV_SALT = 'portfolio-duel-identity-dev-salt-v1'
_warned = False
_warn_lock = threading.Lock()

EMAIL_RE = re.compile(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}')
_GMAIL = {'gmail.com', 'googlemail.com'}


@dataclass(frozen=True)
class Identity:
    kind: str  # 'email' | 'github'
    key: str  # hex HMAC digest; safe to store

    def __repr__(self) -> str:
        return f'Identity(kind={self.kind!r}, key={self.key[:8]}...)'


def normalize_email(email: str) -> Optional[str]:
    email = (email or '').strip().strip('.').lower()
    local, sep, domain = email.rpartition('@')
    if not sep or not local or not domain:
        return None
    if domain in _GMAIL:
        local = local.split('+', 1)[0].replace('.', '')
        domain = 'gmail.com'  # googlemail.com is the same mailbox
        if not local:
            return None
    return f'{local}@{domain}'


def find_email(links: Iterable[str], text: str) -> Optional[str]:
    """First email in the résumé: mailto: link annotations first (the clickable one is the deliberate one)."""
    for link in links or []:
        if isinstance(link, str) and link.lower().startswith('mailto:'):
            m = EMAIL_RE.search(unquote(link[7:].split('?', 1)[0]))
            if m and (email := normalize_email(m.group(0))):
                return email
    for m in EMAIL_RE.finditer(text or ''):
        if email := normalize_email(m.group(0)):
            return email
    return None


def _secret() -> bytes:
    global _warned
    secret = os.getenv('DUEL_ID_SECRET', '').strip()
    if secret:
        return secret.encode()
    with _warn_lock:
        if not _warned:
            log.warning('DUEL_ID_SECRET is not set; using the built-in development salt. Set it in production.')
            _warned = True
    return _DEV_SALT.encode()


def _digest(kind: str, value: str) -> str:
    return hmac.new(_secret(), f'{kind}:{value}'.encode(), hashlib.sha256).hexdigest()


def challenger_identity(text: str, links: Iterable[str], github_username: Optional[str] = None) -> Optional[Identity]:
    """None when there's nothing to go on; the duel is then stored as a one-off entry."""
    email = find_email(links, text)
    if email:
        return Identity('email', _digest('email', email))
    username = (github_username or '').strip().lstrip('@').lower()
    if username:
        return Identity('github', _digest('github', username))
    return None
