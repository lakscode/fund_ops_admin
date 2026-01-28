import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
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

    @property
    def database_url(self) -> str:
        # If full connection string is provided, use it
        if self.MONGODB_URL:
            return self.MONGODB_URL
        # Otherwise, build connection string for local MongoDB
        if self.MONGODB_USER and self.MONGODB_PASSWORD:
            return f"mongodb+srv://{self.MONGODB_USER}:{self.MONGODB_PASSWORD}@{self.MONGODB_HOST}"
        return f"mongodb+srv://{self.MONGODB_HOST}:{self.MONGODB_PORT}"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
