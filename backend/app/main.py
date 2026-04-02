from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine, Base
from app.tasks.trigger_scheduler import setup_scheduler
import contextlib

# Create tables
Base.metadata.create_all(bind=engine)

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start scheduler
    scheduler = setup_scheduler()
    scheduler.start()
    print("Background trigger scheduler started.")
    yield
    # Shutdown
    scheduler.shutdown()
    print("Background trigger scheduler stopped.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to EasyKavach API",
        "docs": "/docs",
        "version": settings.VERSION
    }
