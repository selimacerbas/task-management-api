from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AuditLogResponse(BaseModel):
    id: str
    event_type: str
    entity_type: str
    entity_id: str
    user_id: str
    data: Optional[str] = None
    old_value: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditFilter(BaseModel):
    entity_type: Optional[str] = None
    event_type: Optional[str] = None
    user_id: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class PaginatedAuditLogs(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
