"""Prompt-injection guard for untrusted text (chat messages, uploaded résumés) before it reaches an LLM.

Layers, cheapest first:
1. sanitize / neutralize: Unicode normalisation, invisible-character stripping, and removal of anything that
   imitates our prompt delimiters or chat-role markup. Deterministic, always on.
2. scan: curated regexes for common injection phrasings, grouped into reason codes. Microseconds per line.
3. Classifier: Meta's Prompt Guard 2 on Groq. Optional and fail-open: any error or timeout means heuristics only.

Never log or return the offending text itself, only reason codes.
"""
import logging
import os
import re
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple
from urllib.parse import unquote

log = logging.getLogger(__name__)

DEFAULT_MODEL = 'meta-llama/llama-prompt-guard-2-86m'
DEFAULT_THRESHOLD = 0.8
DEFAULT_TIMEOUT_S = 3.0
DEFAULT_MAX_CALLS = 6
# Prompt Guard 2 has a 512-token window (Groq answers 400 beyond it) and long chunks dilute a single bad line,
# so chunks stay small: ~3.5 chars per token puts 500 chars near 150 tokens.
CHUNK_CHARS = 500
CHAT_CHUNK_CHARS = 1000
MAX_FLAGGED_SHARE = 0.4

# ---------- 1. sanitising ----------

# Invisible letters that NFKC keeps and that are not format characters (Hangul fillers)
_INVISIBLE_LETTERS = {'\u115f', '\u1160', '\u3164', '\uffa0'}


def _visible(ch: str) -> bool:
    if ch in '\n\t':
        return True
    if ch in _INVISIBLE_LETTERS or '\U000e0100' <= ch <= '\U000e01ef':  # also variation selectors used to smuggle bytes
        return False
    # Cc control, Cf format (zero-width, bidi overrides, tag characters), Cs lone surrogates, Co private use
    return unicodedata.category(ch) not in ('Cc', 'Cf', 'Cs', 'Co')


def sanitize(text: str) -> str:
    """NFKC-normalise and drop invisible/control characters, keeping newlines and tabs."""
    text = (text or '').replace('\r\n', '\n').replace('\r', '\n').replace(' ', '\n').replace(' ', '\n')
    # Strip before NFKC so a zero-width joiner can't sit between characters that would otherwise compose
    text = ''.join(ch for ch in text if _visible(ch))
    text = unicodedata.normalize('NFKC', text)
    return ''.join(ch for ch in text if _visible(ch))


_TAG_NAMES = (
    r'resume|r[eé]sum[eé]|red_corner|blue_corner|fighter(?:_[a-z])?|profile|context|catalog|system|assistant|user|'
    r'developer|tool|instructions?|sys|im_start|im_end|im_sep|endoftext|eot_id|start_header_id|end_header_id|s'
)
# Anything that could open or close one of our prompt sections, or a chat template's role turns
_MARKUP = re.compile(
    rf"""
      <\|[^|<>\n]{{0,40}}\|>                                    # <|im_start|>, <|eot_id|>
    | </?\s*(?:{_TAG_NAMES})\b[^<>\n]{{0,80}}>                  # <resume>, </red_corner>, <system role="x">
    | \[\s*/?\s*(?:INST|SYS|SYSTEM|ASSISTANT|USER)\s*\]        # [INST] ... [/INST]
    | <<\s*/?\s*SYS\s*>>                                       # <<SYS>>
    | ^[ \t]*\#{{1,6}}[ \t]*(?:system|assistant|user|developer|instructions?)\b[ \t]*:?   # ### System
    """,
    re.I | re.M | re.X,
)
# Our own section labels in the chat prompt and upper-case role labels; case-sensitive so "System design" is safe
_LABELS = re.compile(
    r'^[ \t]*(?:CONTEXT|CATALOG|VISITOR QUESTION|SYSTEM|ASSISTANT|DEVELOPER)(?:[ \t]+(?:PROMPT|MESSAGE|NOTE|OVERRIDE))?[ \t]*(?:\([^)\n]*\))?[ \t]*:',
    re.M,
)


def neutralize(text: str) -> str:
    """Remove delimiter and role markup so untrusted text can't open or close our prompt sections."""
    text = _MARKUP.sub(' ', text)
    return _LABELS.sub(' ', text)


def clean(text: str) -> str:
    return neutralize(sanitize(text))


# ---------- 2. heuristic detector ----------

_QUAL = (
    r'(?:all|any|the|your|my|these|those|every|previous|prior|above|earlier|preceding|foregoing|original|initial|'
    r'existing|system|current|old|given|said|of|whatever|default|judging|scoring|grading)'
)
_RULES = (
    r'(?:instructions?|prompts?|rules|guidelines|directions|directives|rubrics?|criteria|guardrails|programming|'
    r'system\s+(?:prompt|message))'
)
_TARGET = (
    r'(?:me|us|him|her|them|myself|challenger|'
    r'this\s+(?:candidate|applicant|person|profile|r[eé]sum[eé]|cv|fighter|contestant|submission|individual|engineer|student)|'
    r'the\s+(?:candidate|applicant|challenger)|(?:the\s+)?(?:red|blue)(?:\s+(?:corner|fighter|side))?)'
)
_AI = (
    r'(?:ai|a\.i\.|llms?|language\s+models?|gpt[-\w]*|chatgpt|claude|gemini|llama|copilot|assistants?|chatbots?|'
    r'models?|judges?|panel|graders?|evaluators?|ats|screening\s+(?:bot|software|tool)|'
    r'(?:ai|llm|automated|model|bot|machine)\s+(?:reviewers?|judges?|graders?|screeners?|evaluators?|readers?|systems?|tools?))'
)

_FAMILIES: Dict[str, List[str]] = {
    'instruction_override': [
        rf'\b(?:ignore|disregard|forget|override|bypass|discard|abandon)\s+(?:{_QUAL}\s+){{0,4}}{_RULES}\b',
        r'\b(?:ignore|disregard|forget)\s+(?:everything|anything|all)\s+(?:(?:that\s+)?you(?:\'ve|\s+have)?\s+(?:been\s+)?(?:told|given|read|seen)|above|before|prior|previously|so\s+far|earlier)',
        rf'\b(?:do\s+not|don\'t|never|stop)\s+(?:follow(?:ing)?|obey(?:ing)?|apply(?:ing)?)\s+(?:{_QUAL}\s+){{0,3}}{_RULES}\b',
        r'\bnew\s+(?:system\s+)?instructions?\s*(?::|follow|below|are\b|apply)',
        r'\b(?:updated|revised|real|actual|true|secret|hidden)\s+(?:system\s+)?instructions?\s*:',
    ],
    'role_reassignment': [
        r'\byou\s+are\s+(?:now|no\s+longer)\b',
        r'\byou\'re\s+(?:now|no\s+longer)\b',
        r'\bfrom\s+now\s+on\b\s*,?\s*(?:you|act|respond|answer|reply|ignore|always|only|treat|behave|your)\b',
        r'\bpretend\s+(?:to\s+be|that\s+you|you\s+are|you\'re|you\s+were)\b',
        r'\brole-?play\s+as\b',
        r'\bact\s+as\s+(?:if\s+you\b|dan\b|an?\s+(?:\w+\s+)?(?:ai|assistant|chatbot|language\s+model|jailbroken)\b)',
        r'\b(?:enable|enter|activate|switch\s+to|turn\s+on)\s+(?:the\s+)?(?:developer|dev|god|dan|jailbreak|jailbroken|unrestricted|admin)\s+mode\b',
        r'\bdo\s+anything\s+now\b',
        r'\byou\s+have\s+no\s+(?:rules|restrictions|limits|filters|guidelines)\b',
        r'\byour\s+(?:new|real|true|actual)\s+(?:role|task|job|purpose|goal|instructions?)\s+(?:is|are)\b',
    ],
    'prompt_extraction': [
        r'\b(?:reveal|print|repeat|output|display|leak|dump|expose|recite|disclose|show|tell|give|share|write\s+out|spell\s+out)\s+(?:me\s+|us\s+)?(?:all\s+|exactly\s+|verbatim\s+)?(?:of\s+)?your\s+(?:(?:full|entire|complete|original|initial|hidden|secret|exact|current|first|system)\s+)*(?:prompts?|instructions|system\s+message|rules|guidelines|configuration)\b',
        r'\b(?:reveal|print|repeat|output|display|leak|dump|expose|recite|disclose|show|tell|give|share)\s+(?:me\s+|us\s+)?(?:all\s+)?(?:of\s+)?the\s+(?:(?:full|entire|complete|original|exact)\s+)*(?:system|initial|original|hidden|secret|developer)\s+(?:prompts?|instructions|message)\b',
        r'\bwhat\s+(?:is|are|was|were|\'s)\s+your\s+(?:(?:system|initial|original|hidden|secret|exact|full|first)\s+)*(?:prompt|instructions)\b',
        r'\b(?:repeat|print|output|recite)\s+(?:everything|all|the\s+(?:text|words|content|messages?))\s+(?:above|before|preceding|prior)\b',
    ],
    'score_manipulation': [
        rf'\b(?:give|assign|award|grant)\s+{_TARGET}\s+(?:a\s+|an\s+|the\s+)?(?:(?:perfect|full|maximum|max|highest|top|winning|best)\s+(?:scores?|ratings?|marks|points|grades?)|(?:score|rating|marks|points|grade)\s+of\s+\d{{2,3}}|100\b|10/10|the\s+(?:win|victory)\b)',
        rf'\b(?:score|rate|rank|grade|mark|judge|evaluate|declare|crown|name|consider|pick|choose|select)\s+{_TARGET}\s+(?:as\s+)?(?:the\s+|a\s+)?(?:\d{{2,3}}\b|perfect|highest|top|best|first|max(?:imum)?|winner|higher|above|stronger|better|superior|number\s+one|#1)',
        r'\b(?:this|the)\s+(?:candidate|applicant|challenger|fighter|contestant|profile|r[eé]sum[eé]|cv)\s+(?:is|was|should\s+be|must\s+be|deserves(?:\s+to\s+be)?)\s+(?:clearly\s+|obviously\s+|definitely\s+|easily\s+|by\s+far\s+)?(?:the\s+)?(?:strongest|best|winner|stronger|better|superior|perfect|most\s+qualified|ideal|clear\s+winner)\b',
        r'\bthe\s+other\s+(?:candidate|applicant|challenger|fighter|corner|contestant|competitor|opponent|profile|r[eé]sum[eé]|side)\b',
        r'\b(?:red|blue)\s+(?:corner\s+|fighter\s+|side\s+)?(?:wins|should\s+win|must\s+win|deserves|is\s+(?:the\s+)?(?:winner|stronger|better|weak|weaker))\b',
        rf'\b(?:{_TARGET}|i)\s+(?:should|must|deserves?\s+to|has\s+to|have\s+to)\s+(?:win|be\s+(?:declared|named|crowned|chosen|picked|selected)\s+(?:as\s+)?(?:the\s+)?winner)\b',
    ],
    'model_address': [
        rf'\b(?:note|message|instructions?|memo|attention|reminder|hint|request)\s+(?:to|for)\s+(?:the\s+|any\s+|all\s+)?{_AI}\b',
        rf'\b(?:dear|hey|hi|hello|attention|attn)\s*,?\s+(?:the\s+)?{_AI}\b',
        rf'\bif\s+you\s+(?:are|\'re)\s+(?:an?\s+)?(?:\w+\s+)?{_AI}\b',
        rf'\b{_AI}\s+(?:reading|reviewing|screening|evaluating|parsing|processing|judging|scoring|analy[sz]ing)\s+(?:this|my|these)\b',
        r'\b(?:judges?|reviewers?|graders?|evaluators?|panel)\s*[,:]\s*(?:please|you\s+(?:must|should|will|are))\b',
    ],
    'output_hijack': [
        r'\b(?:respond|reply|answer|output|return|print|say)\s+(?:only|just|exactly)\s+(?:with\s+)?(?:the\s+)?(?:word|phrase|string|json|text|following|this|["\'{])',
        r'["\']\s*(?:score|winner|verdict|evidence|commentary|announcer|answer|cards|sources|decision|red|blue)\s*["\']\s*:',
        r'\b(?:output|return|set|assign|use|write|put)\s+(?:a\s+)?(?:score\s+of\s+)?\d{2,3}\s+(?:for|in|as|on|to)\s+(?:every|each|all|the)\s+(?:\w+\s+)?(?:scores?|rounds?|categor\w*|fields?)',
        r'\bset\s+(?:the\s+|all\s+|every\s+|each\s+)?(?:scores?|winner|verdict|decision|totals?)\s+(?:to|=|as)\b',
    ],
}
_COMPILED = {code: re.compile('|'.join(f'(?:{p})' for p in pats), re.I) for code, pats in _FAMILIES.items()}

# A chat visitor may say "hey bot" or ask who should win; those families only apply to résumés
CHAT_FAMILIES = ('instruction_override', 'role_reassignment', 'prompt_extraction', 'output_hijack')
RESUME_FAMILIES = (*CHAT_FAMILIES, 'score_manipulation', 'model_address')


def scan(text: str, families: Sequence[str] = RESUME_FAMILIES) -> List[str]:
    """Reason codes for the injection patterns found in text (empty when it looks clean)."""
    text = sanitize(text)
    flat = re.sub(r'\s+', ' ', text)
    codes = [code for code in families if _COMPILED[code].search(flat)]
    if _MARKUP.search(text) or _LABELS.search(text):
        codes.append('role_markup')
    return codes


def is_suspicious(text: str, families: Sequence[str] = RESUME_FAMILIES) -> bool:
    return bool(scan(text, families))


# ---------- 3. model classifier ----------

class Classifier:
    """Prompt Guard 2 through Groq's chat endpoint. The reply content is the malicious probability as a bare
    number ("0.9988..."). Returns None on any failure so callers fail open."""

    def __init__(self, client, model: str = DEFAULT_MODEL, threshold: float = DEFAULT_THRESHOLD,
                 timeout: float = DEFAULT_TIMEOUT_S, max_calls: int = DEFAULT_MAX_CALLS):
        self.client = client.with_options(timeout=timeout, max_retries=0) if hasattr(client, 'with_options') else client
        self.model, self.threshold, self.max_calls = model, threshold, max_calls

    def score(self, text: str) -> Optional[float]:
        try:
            reply = self.client.chat.completions.create(model=self.model, messages=[{'role': 'user', 'content': text}])
            value = float((reply.choices[0].message.content or '').strip())
        except Exception as e:
            log.warning('Prompt Guard unavailable (%s), using heuristics only', type(e).__name__)
            return None
        return value if 0.0 <= value <= 1.0 else None

    def scores(self, texts: Sequence[str]) -> List[Optional[float]]:
        if len(texts) <= 1:
            return [self.score(t) for t in texts]
        with ThreadPoolExecutor(max_workers=min(4, len(texts))) as pool:
            return list(pool.map(self.score, texts))

    def flagged(self, value: Optional[float]) -> bool:
        return value is not None and value >= self.threshold


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except ValueError:
        return default


def classifier_from_env(client) -> Optional[Classifier]:
    """The real Groq client only (test fakes get heuristics); PROMPT_GUARD_MODEL=none switches it off."""
    model = os.getenv('PROMPT_GUARD_MODEL', DEFAULT_MODEL).strip()
    if client is None or model.lower() in ('', 'none', 'off', 'false', '0'):
        return None
    try:
        from groq import Groq
    except ImportError:
        return None
    if not isinstance(client, Groq):
        return None
    return Classifier(
        client,
        model,
        threshold=_env_float('PROMPT_GUARD_THRESHOLD', DEFAULT_THRESHOLD),
        timeout=_env_float('PROMPT_GUARD_TIMEOUT', DEFAULT_TIMEOUT_S),
        max_calls=max(1, int(_env_float('PROMPT_GUARD_MAX_CALLS', DEFAULT_MAX_CALLS))),
    )


def _chunks(text: str, size: int) -> List[str]:
    out, rest = [], text.strip()
    while len(rest) > size:
        cut = max(rest.rfind('\n', 0, size), rest.rfind(' ', 0, size))
        cut = cut if cut > size // 2 else size
        out.append(rest[:cut])
        rest = rest[cut:].strip()
    return out + ([rest] if rest else [])


# Lines worth showing the classifier: it catches override and jailbreak phrasing, which always has one of these
_CUES = re.compile(
    r'\b(?:ignore|disregard|forget|override|bypass|instructions?|prompts?|pretend|rules|previous|above|you|your|'
    r'score|scoring|rate|rank|judges?|judging|winner|candidate|assistant|ai|llm|gpt|chatgpt|respond|reply|output|reveal)\b',
    re.I,
)


# ---------- policy ----------

@dataclass
class Verdict:
    text: str
    flagged: bool
    reasons: List[str] = field(default_factory=list)


@dataclass
class ResumeScreen:
    text: str
    links: List[str]
    removed_lines: int
    total_lines: int
    notes: List[str]

    @property
    def gutted(self) -> bool:
        return self.total_lines > 0 and self.removed_lines / self.total_lines > MAX_FLAGGED_SHARE

    def security(self) -> Dict:
        return {'flagged': self.removed_lines > 0, 'removed_lines': self.removed_lines, 'notes': self.notes}


class PromptGuard:
    def __init__(self, classifier: Optional[Classifier] = None):
        self.classifier = classifier

    @classmethod
    def for_client(cls, client) -> 'PromptGuard':
        return cls(classifier_from_env(client))

    # ----- chat -----

    def check_message(self, message: str) -> Verdict:
        text = sanitize(message).strip()
        reasons = scan(text, CHAT_FAMILIES)
        if not reasons and self.classifier and text:
            values = self.classifier.scores(_chunks(text, CHAT_CHUNK_CHARS)[:2])
            if any(self.classifier.flagged(v) for v in values):
                reasons = ['classifier']
        return Verdict(neutralize(text).strip(), bool(reasons), reasons)

    def clean_history(self, history: Iterable[Dict]) -> Tuple[List[Dict], int]:
        """Sanitised turns, minus any that look like injections (heuristics only, to keep chat at one call)."""
        kept, dropped = [], 0
        for turn in history or []:
            if turn.get('role') not in ('user', 'assistant') or not turn.get('content'):
                continue
            text = sanitize(turn['content']).strip()
            if scan(text, CHAT_FAMILIES):
                dropped += 1
                continue
            text = neutralize(text).strip()
            if text:
                kept.append({'role': turn['role'], 'content': text})
        return kept, dropped

    # ----- résumé -----

    def screen_resume(self, text: str, links: Sequence[str] = ()) -> ResumeScreen:
        lines = sanitize(text).split('\n')
        nonempty = [i for i, line in enumerate(lines) if line.strip()]
        flagged: Dict[int, Set[str]] = {}
        for i in nonempty:
            codes = scan(lines[i])
            if codes:
                flagged[i] = set(codes)
        # An injection split across two lines ("ignore all previous" / "instructions") only matches when joined
        for i, j in zip(nonempty, nonempty[1:]):
            if i not in flagged and j not in flagged:
                codes = scan(f'{lines[i]} {lines[j]}')
                if codes:
                    flagged[i] = flagged[j] = set(codes)

        if self.classifier:
            for i in self._classify_lines([(i, lines[i]) for i in nonempty if i not in flagged and _CUES.search(lines[i])]):
                flagged[i] = {'classifier'}

        kept_links = []
        dropped_links = 0
        for link in links:
            readable = re.sub(r'[-_+/.=?&%]+', ' ', unquote(link))
            if len(link) > 300 or re.search(r'\s', link) or scan(readable):
                dropped_links += 1
            else:
                kept_links.append(link)

        cleaned = '\n'.join(neutralize(line) for i, line in enumerate(lines) if i not in flagged).strip()
        notes = sorted({c for codes in flagged.values() for c in codes} | ({'suspicious_link'} if dropped_links else set()))
        if flagged or dropped_links:
            log.info('Résumé guard removed %d line(s) and %d link(s): %s', len(flagged), dropped_links, ','.join(notes))
        return ResumeScreen(cleaned, kept_links, len(flagged) + dropped_links, len(nonempty), notes)

    def _classify_lines(self, candidates: List[Tuple[int, str]]) -> Set[int]:
        """Classifies candidate lines in small chunks within a call budget, bisecting flagged chunks to find the
        offending lines. A chunk still flagged when the budget runs out is dropped whole (it is small by then)."""
        if not candidates:
            return set()
        # Most suspicious lines first, so a long résumé spends the budget where it matters
        candidates = sorted(candidates, key=lambda c: (-len(_CUES.findall(c[1])), c[0]))
        chunks: List[List[Tuple[int, str]]] = []
        for item in candidates:
            if chunks and sum(len(t) + 1 for _, t in chunks[-1]) + len(item[1]) <= CHUNK_CHARS:
                chunks[-1].append(item)
            else:
                chunks.append([item])
        budget = self.classifier.max_calls
        # (chunk, key of the flagged chunk it was split from); two calls are kept back for narrowing down a hit
        pending: List[Tuple[List[Tuple[int, str]], Optional[int]]] = [(c, None) for c in chunks[:max(1, budget - 2)]]
        found: Set[int] = set()
        explained: Set[int] = set()  # flagged chunks with a flagged half, so an unchecked sibling is spared
        while pending and budget > 0:
            wave, pending = pending[:budget], pending[budget:]
            budget -= len(wave)
            values = self.classifier.scores(['\n'.join(t[:CHUNK_CHARS] for _, t in chunk) for chunk, _ in wave])
            for (chunk, parent), value in zip(wave, values):
                if not self.classifier.flagged(value):
                    continue
                if parent is not None:
                    explained.add(parent)
                if len(chunk) == 1:
                    found.add(chunk[0][0])
                else:
                    half = len(chunk) // 2
                    pending[:0] = [(chunk[:half], id(chunk)), (chunk[half:], id(chunk))]
        found.update(i for chunk, parent in pending if parent is not None and parent not in explained for i, _ in chunk)
        return found
