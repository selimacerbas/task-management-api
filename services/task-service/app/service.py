import math

from fastapi import HTTPException, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import TaskStatus, is_valid_transition, VALID_TRANSITIONS
from app.events import publish_event
from app.models import Task
from app.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskFilter,
    TaskResponse,
    PaginatedTasks,
    StatusTransition,
)


async def create_task(data: TaskCreate, user_id: str, db: AsyncSession) -> TaskResponse:
    task = Task(
        title=data.title,
        description=data.description,
        priority=data.priority,
        due_date=data.due_date,
        assignee_id=data.assignee_id,
        created_by=user_id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    await publish_event(
        event_type="task.created",
        entity_id=task.id,
        user_id=user_id,
        data={"title": task.title, "status": task.status.value, "priority": task.priority.value},
    )

    return TaskResponse.model_validate(task)


async def get_task(task_id: str, db: AsyncSession) -> TaskResponse:
    task = await _get_task_or_404(task_id, db)
    return TaskResponse.model_validate(task)


async def list_tasks(filters: TaskFilter, db: AsyncSession) -> PaginatedTasks:
    query = select(Task)

    # Apply filters
    if filters.status:
        query = query.where(Task.status == filters.status)
    if filters.priority:
        query = query.where(Task.priority == filters.priority)
    if filters.assignee_id:
        query = query.where(Task.assignee_id == filters.assignee_id)
    if filters.search:
        search_term = f"%{filters.search}%"
        query = query.where(
            or_(Task.title.ilike(search_term), Task.description.ilike(search_term))
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Sorting
    sort_column = getattr(Task, filters.sort_by, Task.created_at)
    if filters.sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Pagination
    offset = (filters.page - 1) * filters.page_size
    query = query.offset(offset).limit(filters.page_size)

    result = await db.execute(query)
    tasks = result.scalars().all()

    return PaginatedTasks(
        items=[TaskResponse.model_validate(t) for t in tasks],
        total=total,
        page=filters.page,
        page_size=filters.page_size,
        total_pages=math.ceil(total / filters.page_size) if total > 0 else 0,
    )


async def update_task(task_id: str, data: TaskUpdate, user_id: str, db: AsyncSession) -> TaskResponse:
    task = await _get_task_or_404(task_id, db)
    old_data = {"title": task.title, "description": task.description, "priority": task.priority.value}

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task)

    await publish_event(
        event_type="task.updated",
        entity_id=task.id,
        user_id=user_id,
        data=update_fields,
        old_value=old_data,
    )

    return TaskResponse.model_validate(task)


async def transition_status(
    task_id: str, transition: StatusTransition, user_id: str, db: AsyncSession
) -> TaskResponse:
    task = await _get_task_or_404(task_id, db)
    old_status = task.status

    if not is_valid_transition(old_status, transition.status):
        allowed = [s.value for s in VALID_TRANSITIONS.get(old_status, set())]
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid transition from '{old_status.value}' to '{transition.status.value}'. "
                   f"Allowed transitions: {allowed}",
        )

    task.status = transition.status
    await db.commit()
    await db.refresh(task)

    await publish_event(
        event_type="task.status_changed",
        entity_id=task.id,
        user_id=user_id,
        data={"old_status": old_status.value, "new_status": transition.status.value},
    )

    return TaskResponse.model_validate(task)


async def delete_task(task_id: str, user_id: str, db: AsyncSession) -> None:
    task = await _get_task_or_404(task_id, db)

    await publish_event(
        event_type="task.deleted",
        entity_id=task.id,
        user_id=user_id,
        data={"title": task.title},
    )

    await db.delete(task)
    await db.commit()


async def _get_task_or_404(task_id: str, db: AsyncSession) -> Task:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task
