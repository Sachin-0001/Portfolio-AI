"""Shared Groq helper: strict-JSON completions with a fallback model when the primary is rate-limited."""
import json
import logging
from typing import Dict, List, Optional

from groq import BadRequestError, RateLimitError

log = logging.getLogger(__name__)


def complete_json(
    client,
    messages: List[Dict],
    schema: Dict,
    *,
    name: str,
    model: str,
    fallback_model: Optional[str] = None,
    max_completion_tokens: int = 1200,
    temperature: float = 0.3,
) -> Dict:
    def call(c, m: str) -> Dict:
        completion = c.chat.completions.create(
            model=m,
            messages=messages,
            response_format={'type': 'json_schema', 'json_schema': {'name': name, 'strict': True, 'schema': schema}},
            reasoning_effort='low',
            temperature=temperature,
            max_completion_tokens=max_completion_tokens,
        )
        return json.loads(completion.choices[0].message.content)

    def call_once_more_on_schema_slip(c, m: str) -> Dict:
        try:
            return call(c, m)
        except BadRequestError as e:
            # Groq rejects output that breaks the strict schema; these slips are random, so one retry clears most
            if 'json_validate_failed' not in str(e):
                raise
            log.warning('%s produced off-schema JSON, retrying once', m)
            return call(c, m)

    try:
        # No retries on the primary: a 429 should switch models now, not sleep for the retry-after window
        return call_once_more_on_schema_slip(client.with_options(max_retries=0), model)
    except RateLimitError:
        if not fallback_model or fallback_model == model:
            raise
        log.warning('%s rate-limited, answering with %s', model, fallback_model)
        return call_once_more_on_schema_slip(client, fallback_model)
