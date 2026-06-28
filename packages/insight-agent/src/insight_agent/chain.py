"""Multi-step reasoning chain that turns raw controller output into a structured recommendation.

Steps:
  1. Fetch raw contributor data from the controller (/v1/repo/analyze).
  2. Fetch verifiable AI quality scores from the controller (/v1/repo/insight, attested by EigenAI).
  3. Critique step: an LLM challenges the raw numbers (bot inflation, concentration, etc.).
  4. Recommend step: a second LLM call produces the structured allocation + risk flags + sponsor summary.

The chain is intentionally explicit (not a black-box agent) so that the UiPath Maestro case can
log each step and so judges can see the reasoning unfolding live in the demo.
"""

from __future__ import annotations

import json
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate

from .client import ControllerClient
from .schemas import (
    ContributorRecommendation,
    InsightRequest,
    InsightResponse,
    RiskFlag,
)


CRITIQUE_SYSTEM = """You are a senior open-source contribution reviewer.
You will be given (a) commit-based contributor percentages and (b) an AI quality
analysis already attested by EigenAI. Your job is to surface concerns a sponsor
should consider before paying:
- contributors with many trivial commits (commit-count gaming)
- bot/automation accounts miscounted as humans
- maintainers whose review work is undercounted
- dangerous concentration (one contributor controlling > 60%)
- suspicious gaps between commit count and code value

Return a JSON object with one key "concerns": a list of short objects
{"code": "...", "severity": "info|warning|blocker", "message": "..."}.
No prose. JSON only."""


RECOMMEND_SYSTEM = """You are recommending a final payout allocation to an
enterprise sponsor funding this open-source repository.

You will be given:
- raw contributor breakdown (commit-based)
- per-contributor quality scores from the attested AI analysis
- concerns surfaced by the critic step
- optional sponsor context and funding amount

Produce a JSON object matching this exact schema:
{
  "recommended_allocation": [
    {"github_username": "...", "percentage": number, "rationale": "...", "credit_action": "full_credit|partial_credit|no_credit|flag_for_review"}
  ],
  "risk_flags": [
    {"code": "...", "severity": "info|warning|blocker", "message": "..."}
  ],
  "sponsor_summary": "2-4 sentence summary the approver will read",
  "confidence": number between 0 and 1
}

Constraints:
- percentages in recommended_allocation must sum to 100 (+/-1)
- never include bot accounts; mark them no_credit if present
- if concentration > 60% on a single contributor, add a "concentration" risk flag with severity warning
- if any quality score has creditAction=no_credit, mirror that exclusion in your allocation
- confidence should be lower if the sponsor amount is large and risks are present
- JSON only. No prose, no markdown fences."""


async def _run_critique(
    llm: BaseChatModel,
    contributors: list[dict[str, Any]],
    quality_scores: list[dict[str, Any]],
    ai_analysis: str,
) -> list[dict[str, Any]]:
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", CRITIQUE_SYSTEM),
            (
                "human",
                "Contributors (commit-based):\n{contributors}\n\n"
                "Quality scores (attested AI):\n{quality_scores}\n\n"
                "AI analysis text:\n{ai_analysis}",
            ),
        ]
    )
    chain = prompt | llm | JsonOutputParser()
    result = await chain.ainvoke(
        {
            "contributors": json.dumps(contributors, indent=2),
            "quality_scores": json.dumps(quality_scores, indent=2),
            "ai_analysis": ai_analysis or "(no analysis returned)",
        }
    )
    if isinstance(result, dict) and isinstance(result.get("concerns"), list):
        return result["concerns"]
    return []


async def _run_recommend(
    llm: BaseChatModel,
    *,
    repo_url: str,
    contributors: list[dict[str, Any]],
    quality_scores: list[dict[str, Any]],
    concerns: list[dict[str, Any]],
    sponsor_context: str | None,
    funding_amount_usd: float | None,
) -> dict[str, Any]:
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", RECOMMEND_SYSTEM),
            (
                "human",
                "Repository: {repo_url}\n\n"
                "Contributors:\n{contributors}\n\n"
                "Quality scores:\n{quality_scores}\n\n"
                "Critic concerns:\n{concerns}\n\n"
                "Sponsor context: {sponsor_context}\n"
                "Sponsor amount (USD): {funding_amount_usd}",
            ),
        ]
    )
    chain = prompt | llm | JsonOutputParser()
    return await chain.ainvoke(
        {
            "repo_url": repo_url,
            "contributors": json.dumps(contributors, indent=2),
            "quality_scores": json.dumps(quality_scores, indent=2),
            "concerns": json.dumps(concerns, indent=2),
            "sponsor_context": sponsor_context or "(none provided)",
            "funding_amount_usd": funding_amount_usd if funding_amount_usd is not None else "(not specified)",
        }
    )


def _normalize_percentages(allocation: list[ContributorRecommendation]) -> list[ContributorRecommendation]:
    total = sum(item.percentage for item in allocation)
    if total <= 0:
        return allocation
    return [
        ContributorRecommendation(
            github_username=item.github_username,
            percentage=round((item.percentage / total) * 100, 2),
            rationale=item.rationale,
            credit_action=item.credit_action,
        )
        for item in allocation
    ]


def build_recommendation_chain(
    client: ControllerClient,
    llm: BaseChatModel,
):
    """Returns an async callable that takes an InsightRequest and returns InsightResponse."""

    async def recommend(request: InsightRequest) -> InsightResponse:
        analyze = await client.analyze_repo(request.repo_url)
        raw_contributors = analyze.get("contributors", [])
        if not raw_contributors:
            return InsightResponse(
                repo_url=analyze.get("repoUrl", request.repo_url),
                recommended_allocation=[],
                risk_flags=[
                    RiskFlag(
                        code="no_contributors",
                        severity="blocker",
                        message="GitHub returned no contributors for this repository.",
                    )
                ],
                sponsor_summary="Repository has no detectable contributors; no payout possible.",
                confidence=0.0,
                attestation=None,
                raw_contributor_count=0,
            )

        contributors_for_insight = [
            {
                "username": c["username"],
                "commits": int(c.get("commits", 0)),
                "percentage": float(c.get("percentage", 0)),
            }
            for c in raw_contributors[:25]
        ]

        insight = await client.insight_repo(
            analyze.get("repoUrl", request.repo_url),
            contributors_for_insight,
        )

        quality_scores = insight.get("qualityScores", []) or []
        ai_analysis = insight.get("analysis", "") or ""

        concerns = await _run_critique(
            llm,
            contributors=contributors_for_insight,
            quality_scores=quality_scores,
            ai_analysis=ai_analysis,
        )

        recommendation = await _run_recommend(
            llm,
            repo_url=analyze.get("repoUrl", request.repo_url),
            contributors=contributors_for_insight,
            quality_scores=quality_scores,
            concerns=concerns,
            sponsor_context=request.sponsor_context,
            funding_amount_usd=request.funding_amount_usd,
        )

        allocation_raw = recommendation.get("recommended_allocation", [])
        allocation = [
            ContributorRecommendation(
                github_username=str(a.get("github_username") or a.get("username") or "").strip(),
                percentage=float(a.get("percentage", 0)),
                rationale=str(a.get("rationale", "")),
                credit_action=str(a.get("credit_action", "full_credit")),  # type: ignore[arg-type]
            )
            for a in allocation_raw
            if a.get("github_username") or a.get("username")
        ]
        allocation = _normalize_percentages(allocation)

        risk_flags = [
            RiskFlag(
                code=str(r.get("code", "unknown")),
                severity=str(r.get("severity", "info")),  # type: ignore[arg-type]
                message=str(r.get("message", "")),
            )
            for r in recommendation.get("risk_flags", []) or []
        ]

        attestation = None
        if insight.get("signature"):
            attestation = {
                "signature": insight.get("signature"),
                "model": insight.get("model"),
                "explorerUrl": insight.get("explorerUrl"),
            }

        return InsightResponse(
            repo_url=analyze.get("repoUrl", request.repo_url),
            recommended_allocation=allocation,
            risk_flags=risk_flags,
            sponsor_summary=str(recommendation.get("sponsor_summary", "")),
            confidence=float(max(0.0, min(1.0, recommendation.get("confidence", 0.5)))),
            attestation=attestation,
            raw_contributor_count=len(raw_contributors),
            mock=bool(insight.get("mock")),
        )

    return recommend


# Keep unused-import warnings quiet — these are part of the public schema surface.
__all__ = [
    "build_recommendation_chain",
    "InsightRequest",
    "InsightResponse",
    "SystemMessage",
    "HumanMessage",
]
