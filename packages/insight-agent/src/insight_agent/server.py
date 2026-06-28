from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .chain import build_recommendation_chain
from .client import ControllerClient
from .llm import build_llm
from .schemas import InsightRequest, InsightResponse
from .settings import get_settings


load_dotenv()


class HealthResponse(BaseModel):
    ok: bool
    provider: str
    controller: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    app.state.client = ControllerClient(settings)
    app.state.llm = build_llm(settings)
    app.state.recommend = build_recommendation_chain(app.state.client, app.state.llm)
    yield


app = FastAPI(
    title="GitSplits Repo Insight Agent",
    version="0.1.0",
    description=(
        "LangChain-powered agent. Fetches contributor data and EigenAI quality scores "
        "from the GitSplits controller, then runs critique + recommend steps to produce "
        "a structured payout recommendation for a UiPath Maestro case to act on."
    ),
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        ok=True,
        provider=settings.llm_provider,
        controller=settings.controller_base_url,
    )


@app.post("/insight/recommend", response_model=InsightResponse)
async def recommend(request: InsightRequest) -> InsightResponse:
    try:
        return await app.state.recommend(request)
    except Exception as exc:  # surfaced to Maestro as a clean 502
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def main() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "insight_agent.server:app",
        host="0.0.0.0",
        port=settings.insight_agent_port,
        reload=False,
    )


if __name__ == "__main__":
    main()
