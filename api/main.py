from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.database import init_database, close_connection
from routes import funds, investors, properties, organizations, users, user_organizations, investor_funds, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_database()
    yield
    # Shutdown
    close_connection()


app = FastAPI(
    title="Fund Operations Admin API",
    description="API for managing Funds, Investors, Properties, Organizations, and Users",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
app.include_router(user_organizations.router, prefix="/api/v1")
app.include_router(investor_funds.router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": "Fund Operations Admin API",
        "version": "1.0.0",
        "database": "mongodb"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database_type": "mongodb"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
