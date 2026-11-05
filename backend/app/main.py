from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time

from app.api.v1.api import api_router
from app.services.onnx_inference import get_inference_engine
from app.services.explainer import get_explainer


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm the ONNX inference engine and explainer on startup
    print("[INFO] Initializing Aegis Churn Intelligence Engines...")
    start = time.perf_counter()
    _ = get_inference_engine()
    _ = get_explainer()
    print(f"[INFO] Models warmed up in {(time.perf_counter() - start)*1000:.2f}ms")
    yield
    print("[INFO] Shutting down Aegis Service.")


app = FastAPI(
    title="Aegis FinTech Churn Intelligence & Retention Platform",
    description="Enterprise-grade PyTorch Tabular ResNet & ONNX Serving with Explainable AI (XAI) and Autonomous Retention Agent.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend (Vite defaults to port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["System Health"])
async def health_check():
    return {
        "status": "HEALTHY",
        "service": "aegis-churn-intelligence",
        "engine": "ONNX Runtime",
        "version": "2.0.0"
    }


@app.get("/", tags=["System Health"])
async def root():
    return {
        "message": "Welcome to Aegis FinTech Churn Intelligence API",
        "documentation": "/docs",
        "openapi": "/openapi.json"
    }
