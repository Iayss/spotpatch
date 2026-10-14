"""Application layer: apply / restore / status use cases."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from spotpatch import archive
from spotpatch.errors import ArchiveError
from spotpatch.injector import CSS_ENTRY, JS_ENTRY, inject, is_patched
from spotpatch.theme import Theme

_INDEX = "index.html"
_BACKUP_SUFFIX = ".spotpatch.bak"


@dataclass(frozen=True, slots=True)
class Target:
    spa: Path

    @property
    def backup(self) -> Path:
        return self.spa.with_name(self.spa.name + _BACKUP_SUFFIX)


@dataclass(frozen=True, slots=True)
class Status:
    spa: Path
    backup: Path
    patched: bool
    backup_present: bool


def _index(spa: Path) -> str:
    return archive.read_entry(spa, _INDEX).decode("utf-8")


def _sync_backup(t: Target) -> bool:
    """Ensure backup == pristine archive. Returns True if backup was (re)written.

    Marker-based instead of hash-state: if the live .spa has no marker it is pristine by
    definition (fresh install or Spotify auto-update), so it becomes the new backup.
    """
    if not is_patched(_index(t.spa)):
        if t.backup.is_file() and archive.sha256(t.backup) == archive.sha256(t.spa):
            return False
        archive.copy_atomic(t.spa, t.backup)
        return True
    if not t.backup.is_file():
        raise ArchiveError(f"{t.spa} is patched but backup {t.backup} is missing; reinstall Spotify")
    return False


def apply(t: Target, theme: Theme) -> bool:
    """Always rebuilds from the pristine backup -> idempotent, no patch stacking."""
    backup_refreshed = _sync_backup(t)
    src_html = _index(t.backup)
    if is_patched(src_html):
        raise ArchiveError(f"backup {t.backup} is itself patched; reinstall Spotify")

    overrides: dict[str, bytes] = {
        _INDEX: inject(src_html, with_js=theme.js is not None).encode("utf-8"),
        CSS_ENTRY: theme.css.encode("utf-8"),
    }
    if theme.js is not None:
        overrides[JS_ENTRY] = theme.js.encode("utf-8")

    archive.rewrite(t.backup, t.spa, overrides)
    return backup_refreshed


def restore(t: Target) -> None:
    if not t.backup.is_file():
        raise ArchiveError(f"no backup at {t.backup}")
    archive.copy_atomic(t.backup, t.spa)


def status(t: Target) -> Status:
    return Status(t.spa, t.backup, is_patched(_index(t.spa)), t.backup.is_file())
