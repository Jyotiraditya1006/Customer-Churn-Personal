from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.churn import CustomerFeatures, PredictionResponse, ExplainResponse, CustomerPreset
from app.services.onnx_inference import get_inference_engine
from app.services.explainer import get_explainer
from app.services.drift_detector import get_drift_monitor

router = APIRouter()

PRESETS: List[CustomerPreset] = [
    CustomerPreset(
        id="critical_flight_risk",
        name="Sarah Jenkins",
        tag="High Net-Worth Flight Risk",
        badge_color="red",
        description="Senior affluent client (Age 54, Balance $142K) holding 1 single account and inactive for 90+ days.",
        features=CustomerFeatures(
            credit_score=528,
            geography="Germany",
            gender="Female",
            age=54,
            tenure=2,
            balance=142380.50,
            num_products=1,
            has_credit_card=1,
            is_active_member=0,
            estimated_salary=118400.00
        )
    ),
    CustomerPreset(
        id="loyal_french_saver",
        name="David Miller",
        tag="Loyal Active Saver",
        badge_color="emerald",
        description="Mid-career primary client (Age 34, Balance $78K) holding 2 accounts with regular weekly transactions.",
        features=CustomerFeatures(
            credit_score=720,
            geography="France",
            gender="Male",
            age=34,
            tenure=6,
            balance=78450.00,
            num_products=2,
            has_credit_card=1,
            is_active_member=1,
            estimated_salary=89500.00
        )
    ),
    CustomerPreset(
        id="dormant_credit_card",
        name="Emily Carter",
        tag="Dormant Account Holder",
        badge_color="amber",
        description="Cardholder with zero active savings balance, dormant for 6+ months and at high risk of account closure.",
        features=CustomerFeatures(
            credit_score=608,
            geography="Spain",
            gender="Female",
            age=43,
            tenure=4,
            balance=0.00,
            num_products=1,
            has_credit_card=1,
            is_active_member=0,
            estimated_salary=64200.00
        )
    ),
    CustomerPreset(
        id="young_affluent_pro",
        name="Alex Thompson",
        tag="Young Multi-Product Professional",
        badge_color="blue",
        description="Young tech professional (Age 28) with high credit score (790) and active checking and investment accounts.",
        features=CustomerFeatures(
            credit_score=790,
            geography="Germany",
            gender="Male",
            age=28,
            tenure=3,
            balance=56200.00,
            num_products=2,
            has_credit_card=1,
            is_active_member=1,
            estimated_salary=142000.00
        )
    )
]


@router.post("/predict", response_model=PredictionResponse)
async def predict_churn(customer: CustomerFeatures):
    """
    Evaluates real-time churn risk probability using the optimized ONNX Tabular ResNet.
    Records telemetry to the drift monitoring sliding window.
    """
    try:
        engine = get_inference_engine()
        prediction = engine.predict(customer)
        # Log to MLOps drift monitor
        drift_monitor = get_drift_monitor()
        drift_monitor.record_inference(customer)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@router.post("/explain", response_model=ExplainResponse)
async def explain_churn_factors(customer: CustomerFeatures):
    """
    Computes local feature attribution (XAI) and decomposes positive & negative
    drivers of attrition for compliance and relationship management.
    """
    try:
        explainer = get_explainer()
        explanation = explainer.explain(customer)
        return explanation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explainer error: {str(e)}")


@router.get("/presets", response_model=List[CustomerPreset])
async def list_customer_presets():
    """Returns curated synthetic customer personas representing distinct risk tiers."""
    return PRESETS
