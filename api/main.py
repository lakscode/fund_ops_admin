import argparse
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Parse command-line arguments early to set ENV before importing config
def parse_args():
    parser = argparse.ArgumentParser(description="Fund Operations Admin API")
    parser.add_argument(
        "--env",
        choices=["dev", "test", "prod"],
        default="dev",
        help="Environment to run in (dev, test, prod)"
    )
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    return parser.parse_args()

# Map short names to full environment names
ENV_MAP = {"dev": "development", "test": "test", "prod": "production"}

# Set environment variable before importing config
if __name__ == "__main__":
    args = parse_args()
    os.environ["ENV"] = ENV_MAP[args.env]

from config import settings
from database.database import init_database, close_connection
from routes import funds, investors, properties, organizations, users, user_organizations, investor_funds, auth, swagger, roles


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_database()
    yield
    # Shutdown
    close_connection()


# API Tags metadata for Swagger documentation
tags_metadata = [
    {"name": "Authentication", "description": "User authentication and authorization"},
    {"name": "Funds", "description": "Fund management operations"},
    {"name": "Investors", "description": "Investor management operations"},
    {"name": "Properties", "description": "Property management operations"},
    {"name": "Organizations", "description": "Organization management operations"},
    {"name": "Users", "description": "User management operations"},
    {"name": "Roles", "description": "Role management for user permissions"},
    {"name": "User-Organization Mappings", "description": "User-Organization relationship management"},
    {"name": "Investor Funds", "description": "Investor-Fund allocation management"},
    {"name": "Documentation", "description": "API documentation endpoints"},
]

app = FastAPI(
    title="Fund Operations Admin API",
    description="""
## Fund Operations Admin API

A comprehensive API for managing fund operations, investors, properties, and organizations.

### Features
- **Funds**: Create, update, delete, and manage investment funds
- **Investors**: Manage investor profiles and their fund allocations
- **Properties**: Track real estate properties associated with funds
- **Organizations**: Multi-tenant organization management
- **Users**: User management with role-based access control

### Authentication
This API uses JWT Bearer token authentication. Obtain a token via the `/api/v1/auth/login` endpoint.
    """,
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "Fund Ops Admin Support",
        "email": "support@fundopsadmin.com",
    },
    license_info={
        "name": "MIT",
    },
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list if settings.is_production else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(funds.router, prefix="/api/v1")
app.include_router(investors.router, prefix="/api/v1")
app.include_router(properties.router, prefix="/api/v1")
app.include_router(organizations.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(roles.router, prefix="/api/v1")
app.include_router(user_organizations.router, prefix="/api/v1")
app.include_router(investor_funds.router, prefix="/api/v1")
app.include_router(swagger.router)


@app.get("/")
def root():
    return {
        "message": "Fund Operations Admin API",
        "version": "1.0.0",
        "environment": settings.ENV,
        "database": "mongodb"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENV,
        "database_type": "mongodb"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=args.host, port=args.port, reload=args.reload)
