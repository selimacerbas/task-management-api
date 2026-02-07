from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.schemas import UserRegister, UserLogin, Token, UserResponse, UserWithToken
from app.security import get_password_hash, verify_password, create_access_token, create_refresh_token


async def register_user(data: UserRegister, db: AsyncSession) -> UserWithToken:
    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Check username uniqueness
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    user = User(
        email=data.email,
        username=data.username,
        hashed_password=get_password_hash(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = _create_tokens(user.id)
    return UserWithToken(user=UserResponse.model_validate(user), token=token)


async def login_user(data: UserLogin, db: AsyncSession) -> UserWithToken:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    token = _create_tokens(user.id)
    return UserWithToken(user=UserResponse.model_validate(user), token=token)


async def refresh_access_token(refresh_token: str, db: AsyncSession) -> Token:
    from app.security import decode_token

    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return _create_tokens(user.id)


def _create_tokens(user_id: str) -> Token:
    return Token(
        access_token=create_access_token(data={"sub": user_id}),
        refresh_token=create_refresh_token(data={"sub": user_id}),
    )
