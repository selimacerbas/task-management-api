"""Redis Streams consumer for processing task events into audit logs."""
import asyncio

import redis.asyncio as aioredis
import structlog

from app.config import settings
from app.database import async_session_maker
from app.models import AuditLog

logger = structlog.get_logger()


async def start_consumer():
    """Background task that consumes events from Redis Streams and writes audit logs."""
    redis = aioredis.from_url(settings.redis_url, decode_responses=True)

    # Create consumer group if it doesn't exist
    try:
        await redis.xgroup_create(
            settings.stream_name,
            settings.consumer_group,
            id="0",
            mkstream=True,
        )
        logger.info(
            "Consumer group created",
            group=settings.consumer_group,
            stream=settings.stream_name,
        )
    except aioredis.ResponseError as e:
        if "BUSYGROUP" in str(e):
            logger.info("Consumer group already exists", group=settings.consumer_group)
        else:
            raise

    logger.info(
        "Audit consumer started",
        consumer=settings.consumer_name,
        group=settings.consumer_group,
    )

    while True:
        try:
            # Read new messages from the stream
            messages = await redis.xreadgroup(
                groupname=settings.consumer_group,
                consumername=settings.consumer_name,
                streams={settings.stream_name: ">"},
                count=10,
                block=5000,  # Block for 5 seconds waiting for new messages
            )

            if not messages:
                continue

            for stream_name, stream_messages in messages:
                for message_id, data in stream_messages:
                    try:
                        await _process_event(message_id, data)
                        # Acknowledge the message
                        await redis.xack(settings.stream_name, settings.consumer_group, message_id)
                        logger.info(
                            "Event processed and acknowledged",
                            message_id=message_id,
                            event_type=data.get("event_type"),
                        )
                    except Exception as e:
                        logger.error(
                            "Failed to process event",
                            message_id=message_id,
                            error=str(e),
                        )

        except asyncio.CancelledError:
            logger.info("Consumer shutting down")
            await redis.close()
            break
        except Exception as e:
            logger.error("Consumer error, retrying in 5s", error=str(e))
            await asyncio.sleep(5)


async def _process_event(message_id: str, data: dict):
    """Process a single event from the stream and create an audit log entry."""
    async with async_session_maker() as session:
        audit_log = AuditLog(
            event_type=data.get("event_type", "unknown"),
            entity_type=data.get("entity_type", "unknown"),
            entity_id=data.get("entity_id", ""),
            user_id=data.get("user_id", ""),
            data=data.get("data"),
            old_value=data.get("old_value") or None,
            stream_message_id=message_id,
        )
        session.add(audit_log)
        await session.commit()
