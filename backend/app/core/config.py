from functools import lru_cache
from typing import Literal

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

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
