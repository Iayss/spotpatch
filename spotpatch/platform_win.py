"""Infrastructure: Windows path discovery and Spotify process control."""
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

from spotpatch.errors import LocatorError, ProcessError

_IMAGE = "Spotify.exe"
_STORE_PKG = "SpotifyAB.SpotifyMusic_zpdnekdrzrea0"


def locate_spa(override: Path | None) -> Path:
    if override is not None:
        if not override.is_file():
            raise LocatorError(f"--spa path does not exist: {override}")
        return override.resolve()

    appdata = os.environ.get("APPDATA")
    if not appdata:
        raise LocatorError("%APPDATA% not set; pass --spa explicitly")
    spa = Path(appdata) / "Spotify" / "Apps" / "xpui.spa"
    if spa.is_file():
        return spa

    local = os.environ.get("LOCALAPPDATA", "")
    if local and (Path(local) / "Packages" / _STORE_PKG).is_dir():
        raise LocatorError(
            "Microsoft Store build detected: its Apps dir lives in read-only WindowsApps. "
            "Install the standalone build from spotify.com/download."
        )
    raise LocatorError(f"xpui.spa not found at {spa}; pass --spa explicitly")


def spotify_exe(spa: Path) -> Path:
    return spa.parent.parent / _IMAGE


def _require_windows() -> None:
    if sys.platform != "win32":
        raise ProcessError("process control is Windows-only")


def is_running() -> bool:
    _require_windows()
    out = subprocess.run(
        ["tasklist", "/FI", f"IMAGENAME eq {_IMAGE}", "/FO", "CSV", "/NH"],
        capture_output=True, text=True, check=True,
    ).stdout
    return f'"{_IMAGE.lower()}"' in out.lower()


def kill(timeout_s: float = 10.0) -> None:
    _require_windows()
    subprocess.run(["taskkill", "/F", "/T", "/IM", _IMAGE], capture_output=True, check=False)
    deadline = time.monotonic() + timeout_s
    while is_running():
        if time.monotonic() > deadline:
            raise ProcessError(f"{_IMAGE} still running after {timeout_s}s")
        time.sleep(0.2)


def launch(exe: Path) -> None:
    _require_windows()
    if not exe.is_file():
        raise ProcessError(f"cannot launch, not found: {exe}")
    flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    subprocess.Popen([str(exe)], creationflags=flags, close_fds=True)
