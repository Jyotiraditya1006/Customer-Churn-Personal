from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict, Any


class CustomerFeatures(BaseModel):
    credit_score: int = Field(..., ge=300, le=850, description="Customer FICO/credit score", json_schema_extra={"example": 619})
    geography: Literal["France", "Spain", "Germany"] = Field(..., description="Country of residence", json_schema_extra={"example": "Germany"})
    gender: Literal["Female", "Male"] = Field(..., description="Gender", json_schema_extra={"example": "Female"})
    age: int = Field(..., ge=18, le=100, description="Customer age in years", json_schema_extra={"example": 42})
    tenure: int = Field(..., ge=0, le=20, description="Years as an active bank customer", json_schema_extra={"example": 2})
    balance: float = Field(..., ge=0.0, description="Account balance in USD", json_schema_extra={"example": 75000.0})
    num_products: int = Field(..., ge=1, le=4, description="Number of bank products held", json_schema_extra={"example": 1})
    has_credit_card: int = Field(..., ge=0, le=1, description="1 if customer holds credit card, else 0", json_schema_extra={"example": 1})
    is_active_member: int = Field(..., ge=0, le=1, description="1 if customer is active in transactions, else 0", json_schema_extra={"example": 0})
    estimated_salary: float = Field(..., ge=0.0, description="Estimated annual income in USD", json_schema_extra={"example": 101348.88})


class PredictionResponse(BaseModel):
    churn_probability: float = Field(..., ge=0.0, le=1.0)
    risk_tier: Literal["LOW", "MODERATE", "ELEVATED", "CRITICAL"]
    action_recommended: str
    confidence_score: float
    latency_ms: float
    model_version: str


class FeatureAttribution(BaseModel):
    feature: str
    display_name: str
    value: Any
    attribution: float  # Positive = increases churn risk, Negative = protects from churn
    direction: Literal["INCREASES_RISK", "DECREASES_RISK"]
    impact_magnitude: Literal["HIGH", "MEDIUM", "LOW"]


class ExplainResponse(BaseModel):
    churn_probability: float
    risk_tier: str
    base_probability: float
    attributions: List[FeatureAttribution]
    top_risk_factors: List[str]
    top_protective_factors: List[str]
    executive_summary: str


class CustomerPreset(BaseModel):
    id: str
    name: str
    tag: str
    badge_color: str
    description: str
    features: CustomerFeatures
