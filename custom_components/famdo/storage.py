"""Storage handling for FamDo integration."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORAGE_KEY, STORAGE_VERSION
from .models import FamDoData

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)


class FamDoStore:
    """Handle storage for FamDo data."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the store."""
        self.hass = hass
        self._store: Store = Store(
            hass,
            STORAGE_VERSION,
            STORAGE_KEY,
            private=True,
        )
        self._data: FamDoData | None = None

    async def async_load(self) -> FamDoData:
        """Load data from storage."""
        if self._data is not None:
            return self._data

        stored_data = await self._store.async_load()

        if stored_data is None:
            _LOGGER.debug("No existing FamDo data found, creating new")
            self._data = FamDoData()
        else:
            _LOGGER.debug("Loading existing FamDo data")
            self._data = FamDoData.from_dict(stored_data)

        return self._data

    async def async_save(self) -> None:
        """Save data to storage."""
        if self._data is None:
            return

        _LOGGER.debug("Saving FamDo data")
        await self._store.async_save(self._data.to_dict())

    @property
    def data(self) -> FamDoData:
        """Get the current data."""
        if self._data is None:
            raise RuntimeError("Data not loaded. Call async_load first.")
        return self._data

    async def async_delete(self) -> None:
        """Delete all stored data."""
        await self._store.async_remove()
        self._data = None
