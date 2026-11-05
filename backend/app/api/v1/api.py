from fastapi import APIRouter
from app.api.v1.endpoints import churn, chat, telemetry

api_router = APIRouter()

api_router.include_router(churn.router, prefix="/churn", tags=["Churn Intelligence"])
api_router.include_router(chat.router, prefix="/chat", tags=["Retention Agent"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["MLOps & Telemetry"])
