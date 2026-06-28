from typing import Any
import httpx

from .settings import Settings


class ControllerClient:
    def __init__(self, settings: Settings, *, timeout: float = 30.0):
        self._base = settings.controller_base_url.rstrip("/")
        self._headers = {"Content-Type": "application/json"}
        if settings.controller_api_key:
            self._headers["x-agent-api-key"] = settings.controller_api_key
        self._timeout = timeout

    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                f"{self._base}{path}",
                json=payload,
                headers=self._headers,
            )
            response.raise_for_status()
            return response.json()

    async def analyze_repo(self, repo_url: str) -> dict[str, Any]:
        return await self._post("/v1/repo/analyze", {"repoUrl": repo_url})

    async def insight_repo(
        self,
        repo_url: str,
        contributors: list[dict[str, Any]],
    ) -> dict[str, Any]:
        return await self._post(
            "/v1/repo/insight",
            {"repoUrl": repo_url, "contributors": contributors},
        )
