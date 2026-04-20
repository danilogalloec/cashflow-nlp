from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.routers import auth as auth_router
from app.routers import accounts as accounts_router
from app.routers import admin as admin_router
from app.routers import budgets as budgets_router
from app.routers import categories as categories_router
from app.routers import notifications as notifications_router
from app.routers import transactions as transactions_router
from app.routers import dashboard as dashboard_router
from app.routers import income_sources as income_router
from app.routers import reports as reports_router
from app.routers import subscriptions as subscriptions_router

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    redirect_slashes=False,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

_V1 = "/api/v1"
app.include_router(auth_router.router,              prefix=_V1)
app.include_router(accounts_router.router,          prefix=_V1)
app.include_router(admin_router.router,             prefix=_V1)
app.include_router(budgets_router.router,           prefix=_V1)
app.include_router(notifications_router.router,     prefix=_V1)
app.include_router(categories_router.router,   prefix=_V1)
app.include_router(transactions_router.router, prefix=_V1)
app.include_router(dashboard_router.router,    prefix=_V1)
app.include_router(income_router.router,        prefix=_V1)
app.include_router(subscriptions_router.router, prefix=_V1)
app.include_router(reports_router.router,       prefix=_V1)


@app.get("/api/health", tags=["meta"])
async def health():
    return {"status": "ok"}
