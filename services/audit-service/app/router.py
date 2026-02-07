import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AuditLog
from app.schemas import AuditLogResponse, PaginatedAuditLogs
from app.security import get_current_user_id

router = APIRouter(prefix="/api/v1/audit", tags=["Audit"])


@router.get("/", response_model=PaginatedAuditLogs)
async def list_audit_logs(
    entity_type: str | None = None,
    event_type: str | None = None,
    user_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _current_user: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog)

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if event_type:
        query = query.where(AuditLog.event_type == event_type)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(AuditLog.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    return PaginatedAuditLogs(
        items=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/tasks/{task_id}", response_model=list[AuditLogResponse])
async def get_task_audit_trail(
    task_id: str,
    _current_user: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(AuditLog)
        .where(AuditLog.entity_type == "task", AuditLog.entity_id == task_id)
        .order_by(AuditLog.created_at.desc())
    )
    result = await db.execute(query)
    return [AuditLogResponse.model_validate(log) for log in result.scalars().all()]
