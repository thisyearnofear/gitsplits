"""CLI runner for the Repo Insight Agent.

Usage:
    python -m insight_agent.scripts.recommend near/near-sdk-rs
    python -m insight_agent.scripts.recommend near/near-sdk-rs --amount 2500 --context "production dependency"
    python scripts/recommend.py near/near-sdk-rs --json > recommendation.json

Reads environment from .env in the package root. Make sure the controller is
running and reachable at CONTROLLER_BASE_URL, and that ANTHROPIC_API_KEY (or
OPENAI_API_KEY) is set.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Allow running from the repo root: `python packages/insight-agent/scripts/recommend.py ...`
PACKAGE_SRC = Path(__file__).resolve().parent.parent / "src"
if PACKAGE_SRC.exists() and str(PACKAGE_SRC) not in sys.path:
    sys.path.insert(0, str(PACKAGE_SRC))

from dotenv import load_dotenv  # noqa: E402

from insight_agent.chain import build_recommendation_chain  # noqa: E402
from insight_agent.client import ControllerClient  # noqa: E402
from insight_agent.llm import build_llm  # noqa: E402
from insight_agent.schemas import InsightRequest  # noqa: E402
from insight_agent.settings import get_settings  # noqa: E402


def _format_human(response) -> str:
    lines: list[str] = []
    lines.append(f"Repository: {response.repo_url}")
    lines.append(f"Contributors analyzed: {response.raw_contributor_count}")
    lines.append(f"Confidence: {response.confidence:.2f}")
    if response.mock:
        lines.append("Mode: MOCK (controller returned stubbed data)")
    lines.append("")
    lines.append("Recommended allocation:")
    for item in response.recommended_allocation:
        lines.append(
            f"  - @{item.github_username:<24} {item.percentage:>6.2f}%  [{item.credit_action}]"
        )
        if item.rationale:
            lines.append(f"      {item.rationale}")
    if response.risk_flags:
        lines.append("")
        lines.append("Risk flags:")
        for flag in response.risk_flags:
            lines.append(f"  [{flag.severity.upper():<7}] {flag.code}: {flag.message}")
    lines.append("")
    lines.append("Sponsor summary:")
    lines.append(f"  {response.sponsor_summary}")
    if response.attestation:
        lines.append("")
        lines.append("EigenAI attestation:")
        lines.append(f"  model:    {response.attestation.get('model')}")
        lines.append(f"  signature:{response.attestation.get('signature')}")
        if response.attestation.get("explorerUrl"):
            lines.append(f"  explorer: {response.attestation['explorerUrl']}")
    return "\n".join(lines)


async def main() -> int:
    load_dotenv()

    parser = argparse.ArgumentParser(description="Generate an OSS funding recommendation.")
    parser.add_argument("repo", help="Repository (owner/repo or full github.com URL)")
    parser.add_argument("--amount", type=float, default=None, help="Sponsor amount in USD")
    parser.add_argument("--context", type=str, default=None, help="Sponsor context / justification")
    parser.add_argument("--json", action="store_true", help="Emit raw JSON instead of a human-readable summary")
    args = parser.parse_args()

    settings = get_settings()
    client = ControllerClient(settings)
    try:
        llm = build_llm(settings)
    except RuntimeError as exc:
        print(f"LLM unavailable: {exc}", file=sys.stderr)
        return 2

    chain = build_recommendation_chain(client, llm)

    request = InsightRequest(
        repo_url=args.repo,
        sponsor_context=args.context,
        funding_amount_usd=args.amount,
    )

    try:
        response = await chain(request)
    except Exception as exc:  # surface controller / LLM errors cleanly
        print(f"Chain failed: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(response.model_dump(), indent=2))
    else:
        print(_format_human(response))
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
