from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # JWT — secret MUST be provided via environment variable
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"

    # Database — connection string MUST be provided via environment variable
    database_url: str

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # OpenTelemetry
    otel_exporter_otlp_endpoint: str = "http://jaeger:4317"
    otel_service_name: str = "task-service"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()