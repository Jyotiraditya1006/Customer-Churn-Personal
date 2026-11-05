import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.main import app

client = TestClient(app)

SAMPLE_CUSTOMER = {
    "credit_score": 680,
    "geography": "Germany",
    "gender": "Female",
    "age": 45,
    "tenure": 3,
    "balance": 115000.0,
    "num_products": 1,
    "has_credit_card": 1,
    "is_active_member": 0,
    "estimated_salary": 92000.0
}


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"


def test_list_presets():
    response = client.get("/api/v1/churn/presets")
    assert response.status_code == 200
    presets = response.json()
    assert len(presets) >= 4
    assert presets[0]["id"] == "critical_flight_risk"


def test_predict_churn():
    response = client.post("/api/v1/churn/predict", json=SAMPLE_CUSTOMER)
    assert response.status_code == 200
    data = response.json()
    assert "churn_probability" in data
    assert 0.0 <= data["churn_probability"] <= 1.0
    assert data["risk_tier"] in ["LOW", "MODERATE", "ELEVATED", "CRITICAL"]
    assert data["latency_ms"] < 100.0  # Production latency assertion


def test_explain_churn():
    response = client.post("/api/v1/churn/explain", json=SAMPLE_CUSTOMER)
    assert response.status_code == 200
    data = response.json()
    assert "attributions" in data
    assert len(data["attributions"]) == 10
    assert "executive_summary" in data


def test_retention_agent_chat():
    payload = {
        "message": "I am thinking of closing my account because of excessive wire fees.",
        "history": [],
        "customer_context": SAMPLE_CUSTOMER,
        "churn_probability": 0.85,
        "top_risk_factors": ["High Balance Flight Risk", "Inactivity"]
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["retention_action_triggered"] is True
    assert data["sentiment"] in ["CHURN_RISK", "FRUSTRATED"]
    assert data["offer"] is not None
    assert "promo_code" in data["offer"]


def test_drift_telemetry():
    response = client.get("/api/v1/telemetry/drift")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "psi_scores" in data
