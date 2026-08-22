import uuid
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.errors import AppError

settings = get_settings()
STATIC_DIR = Path(__file__).resolve().parent / "static"


def create_app() -> FastAPI:
    app = FastAPI(title="GlobeTrotter API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        request.state.request_id = str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-Id"] = request.state.request_id
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {"code": exc.code, "message": exc.message, "details": exc.details},
                "requestId": getattr(request.state, "request_id", ""),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        details = [
            {"field": ".".join(str(part) for part in err["loc"][1:]), "issue": err["msg"]}
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "VALIDATION_FAILED",
                    "message": "Some fields need a second look.",
                    "details": details,
                },
                "requestId": getattr(request.state, "request_id", ""),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Something went wrong. Please try again.",
                    "details": [],
                },
                "requestId": getattr(request.state, "request_id", ""),
            },
        )

    # ── Mount module routers ────────────────────────────────────────
    from app.modules.catalog.router import router as catalog_router
    from app.modules.trips.router import router as trips_router
    from app.modules.stops.router import router as stops_router
    from app.modules.activities.router import router as activities_router
    from app.modules.expenses.router import router as expenses_router
    from app.modules.budget.router import router as budget_router
    from app.modules.dashboard.router import router as dashboard_router
    from app.modules.admin.router import router as admin_router
    from app.modules.sharing.router import router as sharing_router
    from app.realtime.manager import router as ws_router

    app.include_router(catalog_router)
    app.include_router(trips_router)
    app.include_router(stops_router)
    app.include_router(activities_router)
    app.include_router(expenses_router)
    app.include_router(budget_router)
    app.include_router(dashboard_router)
    app.include_router(admin_router)
    app.include_router(sharing_router)
    app.include_router(ws_router)

    return app


app = create_app()
