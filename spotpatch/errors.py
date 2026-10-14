from __future__ import annotations


class SpotpatchError(RuntimeError):
    """Base for all expected, user-facing failures (mapped to exit code 1)."""


class LocatorError(SpotpatchError): ...


class ThemeError(SpotpatchError): ...


class InjectionError(SpotpatchError): ...


class ArchiveError(SpotpatchError): ...


class ProcessError(SpotpatchError): ...
