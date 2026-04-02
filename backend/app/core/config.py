from pathlib import Path
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    PROJECT_NAME: str = "EasyKavach"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "sqlite:///./easykavach.db"
    
    # External APIs
    OWM_API_KEY: Optional[str] = None # OpenWeatherMap
    
    # Configuration
    TRIGGER_POLL_INTERVAL_SECONDS: int = 300
    MARGIN_RATE: float = 0.10
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-32-chars-long-at-least"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def _parse_debug_value(cls, value):
        if isinstance(value, bool):
            return value

        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False

        return value

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _resolve_sqlite_path(cls, value):
        if not isinstance(value, str):
            return value

        if value.startswith("sqlite:///"):
            raw_path = value.replace("sqlite:///", "", 1)
            path = Path(raw_path)
            if not path.is_absolute():
                resolved = (BASE_DIR / path).resolve()
                return f"sqlite:///{resolved}"

        return value
    
    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), case_sensitive=True)

settings = Settings()
