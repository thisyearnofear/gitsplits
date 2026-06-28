from langchain_core.language_models import BaseChatModel

from .settings import Settings


def build_llm(settings: Settings, *, temperature: float = 0.2) -> BaseChatModel:
    provider = settings.llm_provider.lower()

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic")
        return ChatAnthropic(
            model=settings.anthropic_model,
            api_key=settings.anthropic_api_key,
            temperature=temperature,
        )

    if provider == "openai":
        from langchain_openai import ChatOpenAI

        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required when LLM_PROVIDER=openai")
        return ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=temperature,
        )

    raise RuntimeError(f"Unsupported LLM_PROVIDER: {settings.llm_provider}")
