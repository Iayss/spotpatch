"""Pure domain logic: index.html transformation. No I/O."""
from __future__ import annotations

import re

from spotpatch.errors import InjectionError

MARKER = "data-spotpatch"
CSS_ENTRY = "spotpatch-theme.css"
JS_ENTRY = "spotpatch-hook.js"

_BODY_OPEN = re.compile(r"<body\b[^>]*>", re.IGNORECASE)
_BODY_CLOSE = re.compile(r"</body\s*>", re.IGNORECASE)


def is_patched(html: str) -> bool:
    return MARKER in html


def inject(html: str, *, with_js: bool) -> str:
    if is_patched(html):
        raise InjectionError("index.html already contains spotpatch marker; source must be pristine")

    body_open = _BODY_OPEN.search(html)
    if body_open is None:
        raise InjectionError("<body> tag not found in index.html")

    # Stylesheet goes at the START of <body>, not in <head>: webpack appends lazy route
    # chunks (xpui-routes-*.css) to <head>, so any <head> link would lose cascade order
    # against them. A <body> link always sorts after all <head> sheets -> wins ties
    # without !important, and it still precedes the deferred app script (no FOUC).
    link = f'<link rel="stylesheet" href="/{CSS_ENTRY}" {MARKER}>'
    html = html[: body_open.end()] + link + html[body_open.end() :]

    if with_js:
        closes = list(_BODY_CLOSE.finditer(html))
        if not closes:
            raise InjectionError("</body> tag not found in index.html")
        pos = closes[-1].start()
        # defer scripts run in document order -> executes after /xpui-snapshot.js
        script = f'<script defer src="/{JS_ENTRY}" {MARKER}></script>'
        html = html[:pos] + script + html[pos:]

    return html
