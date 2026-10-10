from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

API_V1_PREFIX = "/api/v1"


class Settings(BaseSettings):
    """Configuração tipada lida do ambiente / `.env`. Falha cedo se algo estiver inválido."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "XP Advisor Copilot API"
    app_version: str = "0.1.0"
    env: Literal["development", "test", "production"] = "development"

    # Lista separada por vírgula; mantida como str para não exigir JSON no .env
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:54322/postgres"
    database_echo: bool = False

    supabase_url: str = "http://localhost:54321"
    supabase_jwt_secret: str = ""
    supabase_jwt_audience: str = "authenticated"

    llm_provider: str = "groq"
    llm_api_key: SecretStr = SecretStr("")
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_model: str = "llama-3.1-8b-instant"
    llm_timeout_seconds: float = Field(default=20.0, gt=0, le=120)
    llm_max_output_tokens: int = Field(default=1024, ge=1, le=8192)
    llm_max_tool_rounds: int = Field(default=3, ge=1, le=5)
    llm_max_tool_calls: int = Field(default=6, ge=1, le=20)
    llm_session_ttl_seconds: int = Field(default=3600, ge=60)

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
