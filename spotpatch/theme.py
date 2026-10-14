"""Theme loading + CSS variable compilation. Pure except for reading the theme dir."""
from __future__ import annotations

import re
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from spotpatch.errors import ThemeError

# Encore (Spotify design system) does NOT define tokens on :root. They live on
# `.encore-dark-theme` (set on <html>) and are re-declared on every `.encore-*-set`
# descendant, so a plain `:root{--x}` override is shadowed. We emit the exact same
# selectors; equal specificity + later cascade position = override.
_BASE_SELECTOR = ":root,.encore-dark-theme,.encore-dark-theme .encore-base-set"
_IDENT = re.compile(r"^[a-z0-9][a-z0-9-]*$")
_UNSAFE_VALUE = re.compile(r"[;{}<>\\]|/\*|\*/")


@dataclass(frozen=True, slots=True)
class Theme:
    css: str
    js: str | None


def _selector_for(set_name: str) -> str:
    return _BASE_SELECTOR if set_name == "base" else f".encore-dark-theme .encore-{set_name}-set"


def _norm_value(set_name: str, key: str, value: Any) -> str:
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        raise ThemeError(f"[{set_name}].{key}: value must be string/number, got {type(value).__name__}")
    text = str(value).strip()
    if not text or _UNSAFE_VALUE.search(text):
        raise ThemeError(f"[{set_name}].{key}: empty or unsafe CSS value {text!r}")
    return text


def compile_vars(data: dict[str, Any]) -> str:
    """{"base": {"background-base": "#000"}, "bright-accent": {...}} -> CSS rules."""
    rules: list[str] = []
    for set_name, decls in data.items():
        if not _IDENT.match(set_name):
            raise ThemeError(f"invalid set name [{set_name}]")
        if not isinstance(decls, dict):
            raise ThemeError(f"[{set_name}] must be a table of variables")
        body = []
        for raw_key, value in decls.items():
            key = raw_key.removeprefix("--")
            if not _IDENT.match(key):
                raise ThemeError(f"[{set_name}]: invalid variable name {raw_key!r}")
            body.append(f"--{key}:{_norm_value(set_name, key, value)};")
        if body:
            rules.append(f"{_selector_for(set_name)}{{{''.join(body)}}}")
    return "\n".join(rules)


def load_theme(theme_dir: Path) -> Theme:
    if not theme_dir.is_dir():
        raise ThemeError(f"theme directory not found: {theme_dir}")

    vars_file = theme_dir / "theme.toml"
    css_file = theme_dir / "custom.css"

    parts: list[str] = []
    if vars_file.is_file():
        try:
            parts.append(compile_vars(tomllib.loads(vars_file.read_text("utf-8"))))
        except tomllib.TOMLDecodeError as exc:
            raise ThemeError(f"{vars_file}: {exc}") from exc
    if css_file.is_file():
        parts.append(css_file.read_text("utf-8"))
    if not parts:
        raise ThemeError(f"{theme_dir}: need theme.toml and/or custom.css")

    # All *.js ship as one bundle (single <script> entry). Sorted -> deterministic order;
    # ";" guards against a file lacking a trailing semicolon. Files must be self-contained IIFEs.
    js_files = sorted(p for p in theme_dir.glob("*.js") if p.is_file())
    js = "\n;\n".join(p.read_text("utf-8") for p in js_files) if js_files else None
    return Theme(css="\n".join(parts), js=js)
