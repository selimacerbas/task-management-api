from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # JWT (shared secret for token validation)
    jwt_secret_key: str = "dev-secret-change-in-production-min-32-chars"
    jwt_algorithm: str = "HS256"

    # Database
    database_url: str = "postgresql+asyncpg://taskman:taskman_secret@postgres:5432/audit_db"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # OpenTelemetry
    otel_exporter_otlp_endpoint: str = "http://jaeger:4317"
    otel_service_name: str = "audit-service"

    # Consumer config
    consumer_group: str = "audit-service-group"
    consumer_name: str = "audit-worker-1"
    stream_name: str = "task.events"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
