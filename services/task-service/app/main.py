from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.events import close_redis
from app.router import router
from app.telemetry import setup_telemetry

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("task-service started", service="task-service")
    yield
    await close_redis()
    logger.info("task-service shutting down", service="task-service")


app = FastAPI(
    title="Task Service",
    description="Task management microservice with CRUD and state machine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_telemetry(app, settings.otel_service_name)

app.include_router(router)


@app.get("/api/v1/health")
async def health():
    return {"status": "healthy", "service": "task-service"}
