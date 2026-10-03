"""
AgriEdge Configuration Settings
Loads environment variables using Pydantic Settings and ConfigDict.
"""

from typing import List
from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "AgriEdge"
    APP_VERSION: str = "1.0.0"
    APP_MODE: str = "development"  # development / production

    # Database
    DATABASE_URL: str = "sqlite:///./agriedge.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = "agriedge_jwt_super_secret_key_change_in_production_987654321"
    JWT_REFRESH_SECRET: str = "agriedge_jwt_refresh_super_secret_key_change_in_production_123456789"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # External APIs
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENROUTER_API_KEY: str = ""
    WEATHER_API_KEY: str = ""
    MARKET_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
