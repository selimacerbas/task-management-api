from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.enums import TaskStatus, TaskPriority
from app.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskFilter,
    TaskResponse,
    PaginatedTasks,
    StatusTransition,
)
from app.security import get_current_user_id
from app.service import (
    create_task,
    get_task,
    list_tasks,
    update_task,
    transition_status,
    delete_task,
)

router = APIRouter(prefix="/api/v1/tasks", tags=["Tasks"])


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create(
    data: TaskCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await create_task(data, user_id, db)


@router.get("/", response_model=PaginatedTasks)
async def list_all(
    status_filter: TaskStatus | None = Query(None, alias="status"),
    priority: TaskPriority | None = None,
    assignee_id: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", pattern=r"^(created_at|updated_at|title|priority|due_date|status)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
    _user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    filters = TaskFilter(
        status=status_filter,
        priority=priority,
        assignee_id=assignee_id,
        search=search,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return await list_tasks(filters, db)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_one(
    task_id: str,
    _user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await get_task(task_id, db)


@router.put("/{task_id}", response_model=TaskResponse)
async def update(
    task_id: str,
    data: TaskUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await update_task(task_id, data, user_id, db)


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def change_status(
    task_id: str,
    data: StatusTransition,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await transition_status(task_id, data, user_id, db)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    task_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await delete_task(task_id, user_id, db)
