import os
from pydantic_settings import BaseSettings
from typing import Optional, List
from functools import lru_cache


class Settings(BaseSettings):
    # Environment
    ENV: str = "development"  # development, test, production

    # MongoDB Configuration
    # For MongoDB Atlas, use the full connection string in MONGODB_URL
    # Example: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
    MONGODB_URL: Optional[str] = None  # Full connection string (for Atlas)

    # For local MongoDB (used if MONGODB_URL is not set)
    MONGODB_HOST: str = "localhost"
    MONGODB_PORT: int = 27017
    MONGODB_USER: Optional[str] = None
    MONGODB_PASSWORD: Optional[str] = None

    # Database name
    MONGODB_DB: str = "fund_ops"

    # JWT Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # API Settings
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_development(self) -> bool:
        return self.ENV == "development"

    @property
    def is_test(self) -> bool:
        return self.ENV == "test"

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"

    @property
    def database_url(self) -> str:
        # If full connection string is provided, use it
        if self.MONGODB_URL:
            return self.MONGODB_URL
        # Otherwise, build connection string for local MongoDB
        if self.MONGODB_USER and self.MONGODB_PASSWORD:
            return f"mongodb+srv://{self.MONGODB_USER}:{self.MONGODB_PASSWORD}@{self.MONGODB_HOST}"
        return f"mongodb://{self.MONGODB_HOST}:{self.MONGODB_PORT}"

    class Config:
        extra = "allow"


def get_env_file() -> str:
    """Get the environment file based on ENV environment variable."""
    env = os.getenv("ENV", "development")
    env_file = f".env.{env}"

    # Fall back to .env if environment-specific file doesn't exist
    if os.path.exists(env_file):
        return env_file
    elif os.path.exists(".env"):
        return ".env"
    return env_file


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    env_file = get_env_file()
    return Settings(_env_file=env_file)


# Default settings instance
settings = get_settings()
