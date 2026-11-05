import copy
import numpy as np
from typing import List, Dict, Any, Tuple
from app.schemas.churn import CustomerFeatures, ExplainResponse, FeatureAttribution
from app.services.onnx_inference import get_inference_engine


# Human-friendly feature metadata
FEATURE_METADATA = {
    "age": {"name": "Customer Age", "baseline": 38, "unit": "years"},
    "balance": {"name": "Account Balance", "baseline": 75000.0, "unit": "USD"},
    "is_active_member": {"name": "Activity Status", "baseline": 1, "unit": "flag"},
    "num_products": {"name": "Products Count", "baseline": 2, "unit": "products"},
    "credit_score": {"name": "FICO Credit Score", "baseline": 650, "unit": "points"},
    "geography": {"name": "Global Market Region", "baseline": "North America", "unit": "region"},
    "tenure": {"name": "Relationship Tenure", "baseline": 5, "unit": "years"},
    "has_credit_card": {"name": "Credit Card Ownership", "baseline": 1, "unit": "flag"},
    "estimated_salary": {"name": "Annual Salary", "baseline": 100000.0, "unit": "USD"},
    "gender": {"name": "Gender Demographic", "baseline": "Male", "unit": "gender"}
}


class ChurnExplainer:
    """
    Explainable AI (XAI) engine computing empirical feature attribution
    and risk-driver decomposition for banking churn predictions.
    """
    def __init__(self):
        self.engine = get_inference_engine()
        # Compute baseline probability for average customer
        self.baseline_customer = CustomerFeatures(
            credit_score=670,
            geography="North America",
            gender="Male",
            age=38,
            tenure=5,
            balance=85000.0,
            num_products=2,
            has_credit_card=1,
            is_active_member=1,
            estimated_salary=100000.0
        )
        base_pred = self.engine.predict(self.baseline_customer)
        self.base_probability = base_pred.churn_probability

    def explain(self, customer: CustomerFeatures) -> ExplainResponse:
        current_pred = self.engine.predict(customer)
        curr_prob = current_pred.churn_probability
        
        attributions: List[FeatureAttribution] = []
        
        # Test marginal perturbation for each feature
        feature_keys = list(FEATURE_METADATA.keys())
        
        for key in feature_keys:
            # Create counterfactual by setting feature to baseline value
            counterfactual = customer.model_copy()
            baseline_val = FEATURE_METADATA[key]["baseline"]
            setattr(counterfactual, key, baseline_val)
            
            cf_pred = self.engine.predict(counterfactual)
            # Marginal contribution: how much risk is added/subtracted by current value vs baseline
            marginal_impact = curr_prob - cf_pred.churn_probability
            
            # If current value equals baseline, impact is 0
            curr_val = getattr(customer, key)
            if curr_val == baseline_val:
                marginal_impact = 0.0
                
            display_name = FEATURE_METADATA[key]["name"]
            direction = "INCREASES_RISK" if marginal_impact > 0.005 else "DECREASES_RISK"
            
            abs_mag = abs(marginal_impact)
            if abs_mag > 0.12:
                magnitude = "HIGH"
            elif abs_mag > 0.04:
                magnitude = "MEDIUM"
            else:
                magnitude = "LOW"
                
            attributions.append(FeatureAttribution(
                feature=key,
                display_name=display_name,
                value=curr_val,
                attribution=round(marginal_impact, 4),
                direction=direction,
                impact_magnitude=magnitude
            ))
            
        # Sort by absolute attribution impact
        attributions.sort(key=lambda a: abs(a.attribution), reverse=True)
        
        # Extract top risk drivers and protective factors
        top_risk = [
            f"{a.display_name} ({a.value}): adds +{a.attribution*100:.1f}% churn risk"
            for a in attributions if a.direction == "INCREASES_RISK" and a.attribution > 0.02
        ][:3]
        
        top_protective = [
            f"{a.display_name} ({a.value}): mitigates {abs(a.attribution)*100:.1f}% risk"
            for a in attributions if a.direction == "DECREASES_RISK" and abs(a.attribution) > 0.02
        ][:3]
        
        # Formulate executive summary
        if curr_prob >= 0.70:
            summary = (
                f"Critical attrition flight risk ({curr_prob*100:.1f}%). "
                f"Primary vulnerability driven by {top_risk[0] if top_risk else 'cumulative negative indicators'}. "
                "Immediate retention negotiation strongly advised."
            )
        elif curr_prob >= 0.40:
            summary = (
                f"Elevated churn likelihood ({curr_prob*100:.1f}%). "
                f"Key warning: {top_risk[0] if top_risk else 'market pressure'}. "
                "Engagement campaigns and proactive advisory outreach recommended."
            )
        else:
            summary = (
                f"Stable relationship ({curr_prob*100:.1f}% churn risk). "
                f"Strengthened by {top_protective[0] if top_protective else 'balanced account activity'}."
            )
            
        return ExplainResponse(
            churn_probability=curr_prob,
            risk_tier=current_pred.risk_tier,
            base_probability=self.base_probability,
            attributions=attributions,
            top_risk_factors=top_risk,
            top_protective_factors=top_protective,
            executive_summary=summary
        )


_explainer_instance = None

def get_explainer() -> ChurnExplainer:
    global _explainer_instance
    if _explainer_instance is None:
        _explainer_instance = ChurnExplainer()
    return _explainer_instance
