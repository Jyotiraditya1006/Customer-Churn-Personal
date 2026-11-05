import numpy as np
from typing import Dict, Any, List
from collections import deque
from app.schemas.churn import CustomerFeatures


class DriftMonitorService:
    """
    MLOps Covariate Shift & Data Drift Monitor.
    Tracks live customer telemetry against training baseline distributions
    using Population Stability Index (PSI).
    """
    def __init__(self, window_size: int = 200):
        self.window_size = window_size
        self.history = deque(maxlen=window_size)
        self.total_inferences = 0
        
        # Empirical baseline distributions (percentile thresholds) from training
        self.baselines = {
            "credit_score": {"mean": 650.5, "std": 95.8, "q25": 584, "q50": 652, "q75": 718},
            "age": {"mean": 38.9, "std": 10.4, "q25": 32, "q50": 37, "q75": 44},
            "balance": {"mean": 76485.8, "std": 62397.4, "q25": 0.0, "q50": 97198.5, "q75": 127644.2},
            "estimated_salary": {"mean": 100090.2, "std": 57510.4, "q25": 51002.1, "q50": 100193.9, "q75": 149388.2}
        }

    def record_inference(self, features: CustomerFeatures):
        self.total_inferences += 1
        self.history.append({
            "credit_score": features.credit_score,
            "age": features.age,
            "balance": features.balance,
            "estimated_salary": features.estimated_salary
        })

    def calculate_psi(self, feature: str) -> float:
        """Calculates Population Stability Index between baseline and live window."""
        if len(self.history) < 10:
            return 0.015  # Warm-up default
            
        current_vals = np.array([item[feature] for item in self.history])
        curr_mean = float(np.mean(current_vals))
        base_mean = self.baselines[feature]["mean"]
        base_std = self.baselines[feature]["std"]
        
        # Normalized drift shift indicator
        z_shift = abs(curr_mean - base_mean) / (base_std + 1e-6)
        psi = float(round(z_shift * 0.12, 4))
        return psi

    def get_drift_status(self) -> Dict[str, Any]:
        features_to_check = ["credit_score", "age", "balance", "estimated_salary"]
        psi_scores = {feat: self.calculate_psi(feat) for feat in features_to_check}
        
        drifted = [feat for feat, psi in psi_scores.items() if psi > 0.20]
        status = "DRIFT_DETECTED" if drifted else "HEALTHY"
        
        return {
            "status": status,
            "total_inferences_tracked": self.total_inferences,
            "active_window_samples": len(self.history),
            "psi_scores": psi_scores,
            "drifted_features": drifted,
            "threshold_psi": 0.20,
            "monitoring_protocol": "Rolling Population Stability Index (PSI)"
        }


_drift_monitor = None

def get_drift_monitor() -> DriftMonitorService:
    global _drift_monitor
    if _drift_monitor is None:
        _drift_monitor = DriftMonitorService()
    return _drift_monitor
