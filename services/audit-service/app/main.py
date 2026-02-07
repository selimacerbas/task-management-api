import asyncio
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.consumer import start_consumer
from app.database import init_db
from app.router import router
from app.telemetry import setup_telemetry

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    # Start Redis Streams consumer as a background task
    consumer_task = asyncio.create_task(start_consumer())
    logger.info("audit-service started", service="audit-service")

    yield

    # Graceful shutdown
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass
    logger.info("audit-service shutting down", service="audit-service")


app = FastAPI(
    title="Audit Service",
    description="Audit logging microservice - consumes events from Redis Streams",
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
    return {"status": "healthy", "service": "audit-service"}
