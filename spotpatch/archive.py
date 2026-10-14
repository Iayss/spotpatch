"""Infrastructure: ZIP (.spa) I/O with atomic replacement."""
from __future__ import annotations

import hashlib
import os
import shutil
import zipfile
from collections.abc import Mapping
from pathlib import Path

from spotpatch.errors import ArchiveError

_EPOCH = (1980, 1, 1, 0, 0, 0)


def read_entry(spa: Path, name: str) -> bytes:
    try:
        with zipfile.ZipFile(spa) as zf:
            return zf.read(name)
    except KeyError as exc:
        raise ArchiveError(f"{spa}: entry {name!r} missing") from exc
    except zipfile.BadZipFile as exc:
        raise ArchiveError(f"{spa}: not a valid ZIP/.spa ({exc})") from exc


def sha256(path: Path) -> str:
    with path.open("rb") as fh:
        return hashlib.file_digest(fh, "sha256").hexdigest()


def _clone_info(src: zipfile.ZipInfo) -> zipfile.ZipInfo:
    dst = zipfile.ZipInfo(src.filename, date_time=src.date_time)
    dst.compress_type = src.compress_type
    dst.external_attr = src.external_attr
    dst.create_system = src.create_system
    return dst


def _replace_atomic(tmp: Path, dst: Path) -> None:
    try:
        os.replace(tmp, dst)
    except PermissionError as exc:
        raise ArchiveError(f"cannot replace {dst} (locked by Spotify?)") from exc


def rewrite(src: Path, dst: Path, overrides: Mapping[str, bytes]) -> None:
    """Stream-copy src -> dst, replacing/adding entries from `overrides`.

    Nothing is extracted to disk; only the new archive is written to `dst.tmp`
    and swapped in via os.replace (atomic on NTFS within one volume).
    """
    tmp = dst.with_name(dst.name + ".tmp")
    pending = dict(overrides)
    try:
        with zipfile.ZipFile(src) as zin, zipfile.ZipFile(tmp, "w") as zout:
            for info in zin.infolist():
                data = pending.pop(info.filename, None)
                zout.writestr(_clone_info(info), zin.read(info) if data is None else data)
            for name, data in pending.items():
                new = zipfile.ZipInfo(name, date_time=_EPOCH)
                new.compress_type = zipfile.ZIP_DEFLATED
                zout.writestr(new, data)
        with zipfile.ZipFile(tmp) as check:
            if (bad := check.testzip()) is not None:
                raise ArchiveError(f"CRC check failed on {bad!r}")
        _replace_atomic(tmp, dst)
    except zipfile.BadZipFile as exc:
        raise ArchiveError(f"{src}: not a valid ZIP/.spa ({exc})") from exc
    finally:
        tmp.unlink(missing_ok=True)


def copy_atomic(src: Path, dst: Path) -> None:
    tmp = dst.with_name(dst.name + ".tmp")
    try:
        shutil.copy2(src, tmp)
        _replace_atomic(tmp, dst)
    finally:
        tmp.unlink(missing_ok=True)
