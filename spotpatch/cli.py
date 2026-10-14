"""Interface layer: argparse + process lifecycle guard."""
from __future__ import annotations

import argparse
import sys
import time
from collections.abc import Callable
from pathlib import Path

from spotpatch import platform_win, service
from spotpatch.errors import ProcessError, SpotpatchError
from spotpatch.theme import load_theme

_DEFAULT_THEME = Path(__file__).resolve().parent.parent / "themes" / "default"


def _guarded(args: argparse.Namespace, target: service.Target, action: Callable[[], None]) -> None:
    if not args.no_proc_check:
        if platform_win.is_running():
            if not args.restart:
                raise ProcessError("Spotify is running; close it or pass --restart")
            platform_win.kill()
    action()
    if args.restart:
        platform_win.launch(platform_win.spotify_exe(target.spa))


def _cmd_apply(args: argparse.Namespace, target: service.Target) -> None:
    theme = load_theme(args.theme)  # validate before touching any process/file
    t0 = time.perf_counter()
    refreshed: list[bool] = []
    _guarded(args, target, lambda: refreshed.append(service.apply(target, theme)))
    if refreshed[0]:
        print(f"backup: {target.backup}")
    print(f"patched {target.spa} in {time.perf_counter() - t0:.2f}s (js={'on' if theme.js else 'off'})")


def _cmd_restore(args: argparse.Namespace, target: service.Target) -> None:
    _guarded(args, target, lambda: service.restore(target))
    print(f"restored {target.spa} from {target.backup}")


def _cmd_status(_: argparse.Namespace, target: service.Target) -> None:
    s = service.status(target)
    print(f"spa:     {s.spa}\npatched: {s.patched}\nbackup:  {s.backup if s.backup_present else '-'}")


def _parser() -> argparse.ArgumentParser:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--spa", type=Path, help="override path to xpui.spa")

    mutating = argparse.ArgumentParser(add_help=False)
    mutating.add_argument("--restart", action="store_true", help="kill Spotify before, relaunch after")
    mutating.add_argument("--no-proc-check", action="store_true", help=argparse.SUPPRESS)

    p = argparse.ArgumentParser(prog="spotpatch", description="Offline CSS/JS patcher for Spotify desktop")
    sub = p.add_subparsers(dest="cmd", required=True)

    ap = sub.add_parser("apply", parents=[common, mutating], help="backup + inject theme")
    ap.add_argument("--theme", type=Path, default=_DEFAULT_THEME, help="theme dir (theme.toml/custom.css/custom.js)")
    ap.set_defaults(fn=_cmd_apply)

    sub.add_parser("restore", parents=[common, mutating], help="restore pristine xpui.spa").set_defaults(fn=_cmd_restore)
    sub.add_parser("status", parents=[common], help="show patch state").set_defaults(fn=_cmd_status)
    return p


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        target = service.Target(platform_win.locate_spa(args.spa))
        args.fn(args, target)
    except SpotpatchError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0
