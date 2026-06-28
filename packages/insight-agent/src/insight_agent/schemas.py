from typing import Literal
from pydantic import BaseModel, Field


class InsightRequest(BaseModel):
    repo_url: str = Field(..., description="owner/repo, full GitHub URL, or github.com/owner/repo form")
    sponsor_context: str | None = Field(
        default=None,
        description="Optional free text describing why the sponsor is funding this repo (e.g. 'dependency in our production pipeline').",
    )
    funding_amount_usd: float | None = Field(
        default=None,
        description="Optional sponsor-proposed funding amount. Lets the agent flag whether the allocation is reasonable for the scale.",
    )


class ContributorRecommendation(BaseModel):
    github_username: str
    percentage: float = Field(..., ge=0, le=100)
    rationale: str
    credit_action: Literal["full_credit", "partial_credit", "no_credit", "flag_for_review"]


class RiskFlag(BaseModel):
    code: str = Field(..., description="Short machine-friendly code, e.g. 'concentration', 'bot_inflation'")
    severity: Literal["info", "warning", "blocker"]
    message: str


class InsightResponse(BaseModel):
    repo_url: str
    recommended_allocation: list[ContributorRecommendation]
    risk_flags: list[RiskFlag]
    sponsor_summary: str = Field(
        ...,
        description="A 2-4 sentence summary the case can show to a sponsor/approver.",
    )
    confidence: float = Field(..., ge=0, le=1)
    attestation: dict | None = Field(
        default=None,
        description="EigenAI signature/model/explorer URL when available; passes through verbatim from the controller.",
    )
    raw_contributor_count: int
    mock: bool = False
