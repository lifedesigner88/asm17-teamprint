import os

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from db import Base, SessionLocal, engine, get_db
from models import User
from schemas import LoginRequest, SessionResponse, SignupRequest, UserResponse
from security import (
    AUTH_COOKIE_NAME,
    create_access_token,
    decode_access_token,
    get_cookie_settings,
    hash_password,
    verify_password,
)

app = FastAPI(title="PersonaMirror Backend")
security_scheme = HTTPBearer(auto_error=False)
ADMIN_SEED_USER_ID = os.getenv("ADMIN_SEED_USER_ID", "admin")
ADMIN_SEED_PASSWORD = os.getenv("ADMIN_SEED_PASSWORD", "Admin#2026!Mirror")

origins_raw = os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.user_id == ADMIN_SEED_USER_ID))
        if admin is None:
            db.add(
                User(
                    user_id=ADMIN_SEED_USER_ID,
                    password_hash=hash_password(ADMIN_SEED_PASSWORD),
                    is_admin=True,
                )
            )
        else:
            admin.is_admin = True
            if not verify_password(ADMIN_SEED_PASSWORD, admin.password_hash):
                admin.password_hash = hash_password(ADMIN_SEED_PASSWORD)
        db.commit()


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials if credentials else request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    try:
        payload = decode_access_token(token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token"
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.scalar(select(User).where(User.user_id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> UserResponse:
    user = User(
        user_id=payload.user_id,
        password_hash=hash_password(payload.password),
        is_admin=False,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="user_id already exists") from exc
    db.refresh(user)
    return UserResponse(user_id=user.user_id, is_admin=user.is_admin, created_at=user.created_at)


@app.post("/auth/login", response_model=SessionResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> SessionResponse:
    user = db.scalar(select(User).where(User.user_id == payload.user_id))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token(subject=user.user_id, is_admin=user.is_admin)
    response.set_cookie(AUTH_COOKIE_NAME, access_token, **get_cookie_settings())
    return SessionResponse(user_id=user.user_id, is_admin=user.is_admin)


@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> Response:
    cookie_settings = get_cookie_settings()
    response.delete_cookie(
        AUTH_COOKIE_NAME,
        path=str(cookie_settings["path"]),
        secure=bool(cookie_settings["secure"]),
        httponly=bool(cookie_settings["httponly"]),
        samesite=str(cookie_settings["samesite"]),
    )
    return response


@app.get("/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        user_id=current_user.user_id,
        is_admin=current_user.is_admin,
        created_at=current_user.created_at,
    )


@app.get("/admin/users", response_model=list[UserResponse])
def admin_users(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[UserResponse]:
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return [
        UserResponse(user_id=user.user_id, is_admin=user.is_admin, created_at=user.created_at)
        for user in users
    ]
