from pathlib import Path
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    PROJECT_NAME: str = "EasyKavach"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database - prioritize environment variables
    DATABASE_URL: str = "sqlite:///./easykavach.db"
    
    # ML Model Absolute Paths (fix for serverless runtime)
    EARNINGS_MODEL_REL_PATH: str = "app/ml/earnings_predictor/model/best_earnings_model.pkl"
    FRAUD_MODEL_REL_PATH: str = "app/ml/fraud_classifier/model/best_fraud_model.pkl"
    METADATA_REL_PATH: str = "app/ml/metadata/easykavach_model_metadata.pt"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _resolve_db_url(cls, value):
        if not isinstance(value, str):
            return value

        # Fix for SQLAlchemy 2.0+ and Vercel/Neon Postgres (needs postgresql:// instead of postgres://)
        if value.startswith("postgres://"):
            value = value.replace("postgres://", "postgresql://", 1)

        if value.startswith("sqlite:///"):
            raw_path = value.replace("sqlite:///", "", 1)
            path = Path(raw_path)
            if not path.is_absolute():
                resolved = (BASE_DIR / path).resolve()
                return f"sqlite:///{resolved}"

        return value
    
    @property
    def EARNINGS_MODEL_PATH(self) -> Path:
        return (BASE_DIR / self.EARNINGS_MODEL_REL_PATH).resolve()

    @property
    def FRAUD_MODEL_PATH(self) -> Path:
        return (BASE_DIR / self.FRAUD_MODEL_REL_PATH).resolve()
    
    @property
    def METADATA_PATH(self) -> Path:
        return (BASE_DIR / self.METADATA_REL_PATH).resolve()

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"), 
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
