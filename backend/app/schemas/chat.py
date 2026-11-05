from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from app.schemas.churn import CustomerFeatures


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class RetentionOffer(BaseModel):
    title: str
    description: str
    action_type: Literal["FEE_WAIVER", "INTEREST_BOOST", "DEDICATED_ADVISOR", "CASHBACK_PERK"]
    action_label: str
    promo_code: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    customer_context: CustomerFeatures
    churn_probability: Optional[float] = 0.5
    top_risk_factors: Optional[List[str]] = []


class ChatResponse(BaseModel):
    reply: str
    sentiment: Literal["SATISFIED", "NEUTRAL", "FRUSTRATED", "CHURN_RISK"]
    intent: str
    retention_action_triggered: bool
    offer: Optional[RetentionOffer] = None
    suggested_quick_replies: List[str] = []
