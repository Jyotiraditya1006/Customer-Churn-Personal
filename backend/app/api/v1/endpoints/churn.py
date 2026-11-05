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
        name="Sarah Jenkins (New York)",
        tag="North America • Senior Wealth Client",
        badge_color="red",
        description="Senior affluent US client (Age 54, Balance $195K) holding 1 account and inactive for 90+ days — high competitor flight risk.",
        features=CustomerFeatures(
            credit_score=542,
            geography="North America",
            gender="Female",
            age=54,
            tenure=2,
            balance=195400.00,
            num_products=1,
            has_credit_card=1,
            is_active_member=0,
            estimated_salary=148000.00
        )
    ),
    CustomerPreset(
        id="loyal_french_saver",
        name="David Miller (London)",
        tag="Europe & UK • Primary Core Saver",
        badge_color="emerald",
        description="London mid-career professional (Age 34, Balance $92K) holding 2 accounts with regular weekly domestic & EU transactions.",
        features=CustomerFeatures(
            credit_score=740,
            geography="Europe & UK",
            gender="Male",
            age=34,
            tenure=6,
            balance=92450.00,
            num_products=2,
            has_credit_card=1,
            is_active_member=1,
            estimated_salary=105000.00
        )
    ),
    CustomerPreset(
        id="dormant_credit_card",
        name="Priya Sharma (Singapore)",
        tag="Asia-Pacific • Cross-Border Tech Founder",
        badge_color="amber",
        description="Singapore tech entrepreneur (Age 31, Balance $145K) sensitive to cross-border transfer fees and international wire charges.",
        features=CustomerFeatures(
            credit_score=685,
            geography="Asia-Pacific",
            gender="Female",
            age=31,
            tenure=3,
            balance=145200.00,
            num_products=1,
            has_credit_card=1,
            is_active_member=0,
            estimated_salary=168000.00
        )
    ),
    CustomerPreset(
        id="young_affluent_pro",
        name="Tariq Al-Mansoor (Dubai)",
        tag="Middle East • Private Wealth Client",
        badge_color="blue",
        description="Dubai private client (Age 48, Balance $340K) with multi-currency accounts, high credit score (810), and active wealth management.",
        features=CustomerFeatures(
            credit_score=810,
            geography="Middle East",
            gender="Male",
            age=48,
            tenure=5,
            balance=340000.00,
            num_products=2,
            has_credit_card=1,
            is_active_member=1,
            estimated_salary=285000.00
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
