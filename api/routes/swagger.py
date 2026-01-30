from fastapi import APIRouter
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/swagger", tags=["Documentation"])


@router.get("", response_class=HTMLResponse, include_in_schema=False)
async def swagger_ui():
    """Custom Swagger UI endpoint."""
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="Fund Ops Admin API - Swagger UI",
        swagger_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
        swagger_ui_parameters={
            "defaultModelsExpandDepth": -1,
            "docExpansion": "list",
            "filter": True,
            "tryItOutEnabled": True,
        }
    )


@router.get("/redoc", response_class=HTMLResponse, include_in_schema=False)
async def redoc_ui():
    """ReDoc documentation endpoint."""
    return get_redoc_html(
        openapi_url="/openapi.json",
        title="Fund Ops Admin API - ReDoc",
        redoc_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
    )


@router.get("/info")
async def swagger_info():
    """Get API documentation URLs."""
    return {
        "swagger_ui": "/swagger",
        "swagger_ui_default": "/docs",
        "redoc": "/swagger/redoc",
        "redoc_default": "/redoc",
        "openapi_json": "/openapi.json",
    }
