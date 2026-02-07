from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # JWT — secret MUST be provided via environment variable
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Database — connection string MUST be provided via environment variable
    database_url: str

    # OpenTelemetry
    otel_exporter_otlp_endpoint: str = "http://jaeger:4317"
    otel_service_name: str = "auth-service"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
