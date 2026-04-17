from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://cashflow:changeme@localhost:5432/cashflow_db"

    # JWT
    SECRET_KEY: str  # must be set in .env — no default intentionally
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Security
    MAX_FAILED_LOGINS: int = 5
    LOCKOUT_MINUTES: int = 15

    # Redis (rate limiting)
    REDIS_URL: str = "redis://localhost:6379/0"

    # App
    PROJECT_NAME: str = "CashFlow"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]


settings = Settings()
