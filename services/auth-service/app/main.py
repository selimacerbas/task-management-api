from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.router import router
from app.telemetry import setup_telemetry

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("auth-service started", service="auth-service")
    yield
    logger.info("auth-service shutting down", service="auth-service")


app = FastAPI(
    title="Auth Service",
    description="Authentication and user management microservice",
    version="1.0.0",
    lifespan=lifespan,
    root_path="",
)

# CORS (gateway handles this in production, but needed for direct access in dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenTelemetry
setup_telemetry(app, settings.otel_service_name)

# Routes
app.include_router(router)


@app.get("/api/v1/health")
async def health():
    return {"status": "healthy", "service": "auth-service"}
