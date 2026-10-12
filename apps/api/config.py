"""
AgriEdge Configuration Settings
Loads environment variables using Pydantic Settings and ConfigDict.
"""

import secrets
from typing import List
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, model_validator

DEFAULT_JWT_EXAMPLES = {
    "agriedge_jwt_super_secret_key_change_in_production_987654321",
    "agriedge_jwt_refresh_super_secret_key_change_in_production_123456789",
    "your_jwt_secret",
    "your_jwt_refresh_secret",
    "secret",
    "changeme",
}


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "AgriEdge"
    APP_VERSION: str = "1.0.0"
    APP_MODE: str = "development"  # development / production
    ENABLE_DEMO_LOGIN: bool = False
    TRUSTED_PROXY_COUNT: int = 1
    SEED_PASSWORD: str = ""

    # Database
    DATABASE_URL: str = "sqlite:///./agriedge.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = ""
    JWT_REFRESH_SECRET: str = ""
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

    @model_validator(mode="after")
    def validate_jwt_secrets(self) -> "Settings":
        if self.APP_MODE == "production":
            if not self.JWT_SECRET or self.JWT_SECRET in DEFAULT_JWT_EXAMPLES:
                raise ValueError("In production mode, JWT_SECRET must be explicitly set and cannot be an example or default value.")
            if not self.JWT_REFRESH_SECRET or self.JWT_REFRESH_SECRET in DEFAULT_JWT_EXAMPLES:
                raise ValueError("In production mode, JWT_REFRESH_SECRET must be explicitly set and cannot be an example or default value.")
        else:
            if not self.JWT_SECRET or self.JWT_SECRET in DEFAULT_JWT_EXAMPLES:
                self.JWT_SECRET = secrets.token_urlsafe(32)
            if not self.JWT_REFRESH_SECRET or self.JWT_REFRESH_SECRET in DEFAULT_JWT_EXAMPLES:
                self.JWT_REFRESH_SECRET = secrets.token_urlsafe(32)
        return self


settings = Settings()

