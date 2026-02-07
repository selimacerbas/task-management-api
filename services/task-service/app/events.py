"""Redis Streams event publisher for inter-service communication."""
import json
from datetime import datetime, timezone
from typing import Any, Optional

import redis.asyncio as aioredis
import structlog

from app.config import settings

logger = structlog.get_logger()

STREAM_NAME = "task.events"

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


async def publish_event(
    event_type: str,
    entity_id: str,
    user_id: str,
    data: dict[str, Any],
    old_value: Optional[dict[str, Any]] = None,
):
    """Publish an event to Redis Streams."""
    try:
        redis = await get_redis()
        event = {
            "event_type": event_type,
            "entity_type": "task",
            "entity_id": entity_id,
            "user_id": user_id,
            "data": json.dumps(data),
            "old_value": json.dumps(old_value) if old_value else "",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        message_id = await redis.xadd(STREAM_NAME, event)
        logger.info("Event published", event_type=event_type, entity_id=entity_id, message_id=message_id)
    except Exception as e:
        # Don't fail the main operation if event publishing fails
        logger.error("Failed to publish event", event_type=event_type, error=str(e))
