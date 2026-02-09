"""JSON-file-backed storage that replaces Home Assistant's Store for local development."""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sys

# Import models directly to avoid pulling in homeassistant via the package __init__
import importlib.util as _ilu

_famdo_dir = os.path.join(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
    "custom_components", "famdo",
)


def _load_module(name: str, path: str):
    spec = _ilu.spec_from_file_location(name, path)
    mod = _ilu.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


# Load const first (models depends on it via relative import)
_load_module("custom_components.famdo.const", os.path.join(_famdo_dir, "const.py"))
_models = _load_module("custom_components.famdo.models", os.path.join(_famdo_dir, "models.py"))

FamDoData = _models.FamDoData

_LOGGER = logging.getLogger(__name__)


class MockStore:
    """File-backed mock of FamDoStore for local development."""

    def __init__(self, data_file: str = "devserver/data.json") -> None:
        """Initialize the store."""
        self._data_file = data_file
        self._data: FamDoData | None = None

    async def async_load(self) -> FamDoData:
        """Load data from the JSON file."""
        if self._data is not None:
            return self._data

        def _read() -> FamDoData:
            if not os.path.exists(self._data_file):
                _LOGGER.debug("No data file found at %s, creating new", self._data_file)
                return FamDoData()
            with open(self._data_file, "r", encoding="utf-8") as fh:
                raw = json.load(fh)
            _LOGGER.debug("Loaded FamDo data from %s", self._data_file)
            return FamDoData.from_dict(raw)

        self._data = await asyncio.to_thread(_read)
        return self._data

    async def async_save(self) -> None:
        """Save data to the JSON file with pretty-printing."""
        if self._data is None:
            return

        def _write() -> None:
            directory = os.path.dirname(self._data_file)
            if directory and not os.path.isdir(directory):
                os.makedirs(directory, exist_ok=True)
            with open(self._data_file, "w", encoding="utf-8") as fh:
                json.dump(self._data.to_dict(), fh, indent=2)

        _LOGGER.debug("Saving FamDo data to %s", self._data_file)
        await asyncio.to_thread(_write)

    @property
    def data(self) -> FamDoData:
        """Get the current data."""
        if self._data is None:
            raise RuntimeError("Data not loaded. Call async_load first.")
        return self._data

    async def async_delete(self) -> None:
        """Delete the JSON file and reset data."""

        def _remove() -> None:
            if os.path.exists(self._data_file):
                os.remove(self._data_file)

        await asyncio.to_thread(_remove)
        self._data = None
