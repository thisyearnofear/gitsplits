from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    controller_base_url: str = "http://localhost:3000"
    controller_api_key: str | None = None

    llm_provider: str = "anthropic"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-6"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    insight_agent_port: int = 8088


def get_settings() -> Settings:
    return Settings()
