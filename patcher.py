#!/usr/bin/env python3
"""Spotpatch - Lightweight Spotify CEF Patcher & Theme Engine.

Convenience entrypoint for the spotpatch CLI module.
"""
from __future__ import annotations

import sys
from spotpatch.cli import main

if __name__ == "__main__":
    # If invoked directly with no CLI arguments, default to showing help or apply
    args = sys.argv[1:]
    if not args:
        args = ["apply", "--restart"]
    raise SystemExit(main(args))
