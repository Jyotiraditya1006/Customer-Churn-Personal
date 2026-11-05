import re
from typing import List, Dict, Any, Tuple
from app.schemas.chat import ChatRequest, ChatResponse, RetentionOffer
from app.schemas.churn import CustomerFeatures


# Banking retention playbooks
PLAYBOOKS = {
    "FEE_COMPLAINT": {
        "title": "Premier Fee Exemption Program",
        "description": "100% waiver of wire transfer, foreign transaction, and maintenance fees for the next 12 months.",
        "action_type": "FEE_WAIVER",
        "action_label": "Apply Instant 12-Month Fee Waiver",
        "promo_code": "RETENTION-FEEFREE-2026"
    },
    "RATE_COMPLAINT": {
        "title": "Loyalty High-Yield APY Boost",
        "description": "Exclusive +0.75% APY bonus on primary savings balance, guaranteed for 180 days.",
        "action_type": "INTEREST_BOOST",
        "action_label": "Activate +0.75% APY Bonus",
        "promo_code": "BOOST-SAVINGS-75"
    },
    "HIGH_NET_WORTH": {
        "title": "Private Client Executive Coverage",
        "description": "Dedicated senior wealth advisor assigned with direct phone line, priority wire clearing, and customized portfolio hedging.",
        "action_type": "DEDICATED_ADVISOR",
        "action_label": "Connect with Dedicated Senior Advisor",
        "promo_code": "PRIVATE-WEALTH-VIP"
    },
    "PRODUCT_FATIGUE": {
        "title": "Relationship Consolidation Cash Rebate",
        "description": "$250 statement credit upon bundling checking & credit card under the Apex Relationship Suite.",
        "action_type": "CASHBACK_PERK",
        "action_label": "Claim $250 Statement Rebate",
        "promo_code": "RELATION-REBATE-250"
    }
}


class AutonomousRetentionAgent:
    """
    Intelligent conversational retention agent for banking customers.
    Analyzes customer intent, sentiment, churn risk probability,
    and dynamically orchestrates retention tool activations.
    """
    def __init__(self):
        pass

    def detect_sentiment(self, text: str) -> str:
        text_lower = text.lower()
        churn_cues = ["close", "closing", "cancel", "canceling", "cancelling", "switch", "switching", "leave", "leaving", "bye"]
        frustration_cues = ["ridiculous", "angry", "unacceptable", "too high", "excessive", "fee", "fees", "charge", "worst", "hate", "terrible", "expensive", "rip off"]
        satisfaction_cues = ["thank", "great", "awesome", "helpful", "good", "perfect", "appreciate"]
        
        if any(c in text_lower for c in churn_cues):
            return "CHURN_RISK"
        elif any(c in text_lower for c in frustration_cues):
            return "FRUSTRATED"
        elif any(c in text_lower for c in satisfaction_cues):
            return "SATISFIED"
        return "NEUTRAL"

    def detect_intent(self, text: str) -> str:
        text_lower = text.lower()
        if any(w in text_lower for w in ["close", "closing", "cancel", "terminate", "leaving"]):
            return "account_closure_inquiry"
        elif any(w in text_lower for w in ["fee", "fees", "charge", "cost", "penalty"]):
            return "fee_dispute"
        elif any(w in text_lower for w in ["interest", "rate", "yield", "apy", "returns"]):
            return "interest_rate_inquiry"
        elif any(w in text_lower for w in ["balance", "how much", "funds"]):
            return "balance_inquiry"
        elif any(w in text_lower for w in ["transfer", "send", "wire", "pay"]):
            return "funds_transfer"
        elif any(w in text_lower for w in ["advisor", "wealth", "invest", "portfolio"]):
            return "wealth_advisory"
        elif any(w in text_lower for w in ["hello", "hi", "hey", "good morning"]):
            return "greeting"
        return "general_banking_support"

    def process(self, request: ChatRequest) -> ChatResponse:
        sentiment = self.detect_sentiment(request.message)
        intent = self.detect_intent(request.message)
        churn_prob = request.churn_probability or 0.5
        customer = request.customer_context
        
        is_high_risk = churn_prob >= 0.50
        is_affluent = customer.balance >= 100000.0
        
        offer: RetentionOffer = None
        action_triggered = False
        
        # Rule-based policy orchestration guided by Churn Risk & Sentiment
        if (
            sentiment in ["CHURN_RISK", "FRUSTRATED"]
            or intent in ["account_closure_inquiry", "fee_dispute"]
            or (is_high_risk and intent in ["interest_rate_inquiry", "wealth_advisory"])
        ):
            action_triggered = True
            if is_affluent:
                offer_data = PLAYBOOKS["HIGH_NET_WORTH"]
                reply = (
                    f"We deeply value your partnership with Apex Bank, and I sincerely regret to hear of your frustration. "
                    f"Given your premier relationship with us, I have immediately authorized priority intervention: "
                    f"we can assign a Dedicated Senior Wealth Advisor to review your account structure, waive pending charges, "
                    f"and customize our relationship terms to your exact specifications."
                )
            elif intent == "fee_dispute" or "fee" in request.message.lower():
                offer_data = PLAYBOOKS["FEE_COMPLAINT"]
                reply = (
                    "I understand your frustration with recent account charges. You shouldn't have to worry about unexpected fees. "
                    "As a valued client, I have pre-authorized a comprehensive 12-Month Fee Waiver covering all wire, maintenance, and transfer fees."
                )
            elif intent == "interest_rate_inquiry" or "rate" in request.message.lower():
                offer_data = PLAYBOOKS["RATE_COMPLAINT"]
                reply = (
                    "Maximizing your returns is our top priority. We are currently rolling out an exclusive +0.75% APY loyalty rate bonus "
                    "for long-standing account holders. I can apply this rate enhancement directly to your primary savings balance right now."
                )
            else:
                offer_data = PLAYBOOKS["PRODUCT_FATIGUE"]
                reply = (
                    "Before you make any final decisions regarding your account, we would love the opportunity to make things right. "
                    "I have unlocked an immediate $250 relationship retention credit along with tailored account terms."
                )
            
            offer = RetentionOffer(**offer_data)
            quick_replies = [f"Accept Offer: {offer.promo_code}", "Review terms with an agent", "Continue with closure"]

        elif intent == "balance_inquiry":
            reply = (
                f"Your current total relationship balance is ${customer.balance:,.2f} across your accounts in {customer.geography}. "
                f"Your account status is currently {'Active' if customer.is_active_member else 'Dormant'}. "
                "Is there a specific transaction or allocation you would like to examine?"
            )
            quick_replies = ["Review recent transactions", "Transfer funds", "Explore high-yield options"]

        elif intent == "funds_transfer":
            reply = (
                f"I can assist with initiating an immediate transfer from your available balance of ${customer.balance:,.2f}. "
                "Please provide the destination routing number or recipient IBAN, along with the transfer amount."
            )
            quick_replies = ["Transfer $1,000", "Wire international funds", "Set up scheduled auto-pay"]

        elif intent == "greeting":
            reply = (
                f"Hello! Welcome to Apex Bank Customer Intelligence. "
                f"I am your personal AI financial assistant. I see your account profile from {customer.geography} is loaded. "
                "How may I assist you with your banking or portfolio today?"
            )
            quick_replies = ["Check account balance", "Inquire about interest rates", "Transfer funds"]

        else:
            reply = (
                "I am here to assist with all banking operations, transfer inquiries, rate optimizations, and account management. "
                "Could you provide a few more details so I can assist you directly?"
            )
            quick_replies = ["Check balance", "Inquire about rates", "Speak with an advisor"]

        return ChatResponse(
            reply=reply,
            sentiment=sentiment,
            intent=intent,
            retention_action_triggered=action_triggered,
            offer=offer,
            suggested_quick_replies=quick_replies
        )


_agent_instance = None

def get_retention_agent() -> AutonomousRetentionAgent:
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = AutonomousRetentionAgent()
    return _agent_instance
