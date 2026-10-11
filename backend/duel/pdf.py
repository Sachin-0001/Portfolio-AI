"""Résumé PDF reading: page text plus link annotations (icon-only links like a GitHub logo live only there)."""
import io
from typing import List, Tuple

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_BYTES = 5 * 1024 * 1024
MAX_PAGES = 6
MIN_TEXT_CHARS = 200
MAX_TEXT_CHARS = 20_000


class ResumeError(ValueError):
    """A problem with the upload that the visitor can fix; the message is shown to them."""


def extract_resume(data: bytes) -> Tuple[str, List[str]]:
    if len(data) > MAX_BYTES:
        raise ResumeError('That file is over 5 MB. Please upload a smaller PDF.')
    if not data.startswith(b'%PDF'):
        raise ResumeError('Please upload your résumé as a PDF.')

    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ResumeError('That PDF is password-protected. Please upload an unlocked copy.')
        pages = reader.pages
        if len(pages) > MAX_PAGES:
            raise ResumeError(f'That PDF has {len(pages)} pages. A résumé of up to {MAX_PAGES} pages works best.')

        text_parts, links = [], []
        for page in pages:
            text_parts.append(page.extract_text() or '')
            for annot in page.get('/Annots') or []:
                obj = annot.get_object()
                uri = (obj.get('/A') or {}).get('/URI')
                if isinstance(uri, str) and uri not in links:
                    links.append(uri)
    except ResumeError:
        raise
    except (PdfReadError, KeyError, ValueError, TypeError) as e:
        raise ResumeError("Couldn't read that PDF. Is it a valid, unlocked file?") from e

    text = '\n'.join(text_parts).strip()
    if len(text) < MIN_TEXT_CHARS:
        raise ResumeError(
            'That PDF looks scanned (there is almost no selectable text). Please export your résumé as a text PDF.'
        )
    return text[:MAX_TEXT_CHARS], links
