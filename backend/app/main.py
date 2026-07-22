"""FastAPI application factory with CORS and route registration."""

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import APP_NAME
from .routes import router
from .auth import bind_current_user, get_current_user, reset_current_user

app = FastAPI(title=APP_NAME, version="1.0.0")

# Permissive local-development CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def authenticate_request(request, call_next):
    try:
        user = get_current_user(request, request.headers.get("Authorization"))
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    token = bind_current_user(user.id) if user else None
    try:
        return await call_next(request)
    finally:
        if token is not None:
            reset_current_user(token)

app.include_router(router)
