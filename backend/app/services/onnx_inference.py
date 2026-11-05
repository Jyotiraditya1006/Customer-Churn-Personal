import os
import json
import time
import numpy as np
import onnxruntime as ort
from typing import Dict, Any, Tuple
from app.schemas.churn import CustomerFeatures, PredictionResponse


class ONNXInferenceEngine:
    """
    Optimized production ONNX Runtime serving engine.
    Applies real-time tabular preprocessing, categorical encoding,
    and fast graph-optimized inference.
    """
    def __init__(self, weights_dir: str = None):
        if weights_dir is None:
            weights_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "weights"))
            
        self.weights_dir = weights_dir
        self.meta_path = os.path.join(weights_dir, "preprocessor_meta.json")
        self.onnx_path = os.path.join(weights_dir, "deep_churn_resnet.onnx")
        
        with open(self.meta_path, "r") as f:
            self.meta = json.load(f)
            
        # Configure ONNX Runtime for low-latency CPU execution
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_options.intra_op_num_threads = 2
        
        self.session = ort.InferenceSession(
            self.onnx_path,
            sess_options=sess_options,
            providers=["CPUExecutionProvider"]
        )
        self.input_names = [inp.name for inp in self.session.get_inputs()]
        self.output_name = self.session.get_outputs()[0].name

    def preprocess(self, features: CustomerFeatures) -> Tuple[np.ndarray, np.ndarray]:
        """Converts Pydantic CustomerFeatures into encoded and normalized tensors."""
        geo_idx = self.meta["geo_map"].get(features.geography, 0)
        gender_idx = self.meta["gender_map"].get(features.gender, 0)
        
        cat_array = np.array([[
            geo_idx,
            gender_idx,
            int(features.has_credit_card),
            int(features.is_active_member)
        ]], dtype=np.int64)
        
        # Standardize continuous variables
        raw_cont = np.array([
            features.credit_score,
            features.age,
            features.tenure,
            features.balance,
            features.num_products,
            features.estimated_salary
        ], dtype=np.float32)
        
        cont_means = np.array([self.meta["cont_means"][c] for c in self.meta["cont_cols"]], dtype=np.float32)
        cont_stds = np.array([self.meta["cont_stds"][c] for c in self.meta["cont_cols"]], dtype=np.float32)
        
        norm_cont = (raw_cont - cont_means) / cont_stds
        cont_array = np.expand_dims(norm_cont, axis=0)
        
        return cat_array, cont_array

    def predict(self, features: CustomerFeatures) -> PredictionResponse:
        start_time = time.perf_counter()
        
        cat_array, cont_array = self.preprocess(features)
        
        inputs = {
            self.input_names[0]: cat_array,
            self.input_names[1]: cont_array
        }
        
        logits = self.session.run([self.output_name], inputs)[0]
        # Sigmoid calibration
        prob = float(1.0 / (1.0 + np.exp(-logits.flatten()[0])))
        latency_ms = (time.perf_counter() - start_time) * 1000.0
        
        # Determine risk tier
        if prob >= 0.70:
            tier = "CRITICAL"
            action = "Immediate proactive outreach with fee waiver and loyalty rate boost"
        elif prob >= 0.45:
            tier = "ELEVATED"
            action = "Engage via relationship manager; highlight high-yield savings & premier perks"
        elif prob >= 0.25:
            tier = "MODERATE"
            action = "Targeted digital nudge: promote secondary banking product adoption"
        else:
            tier = "LOW"
            action = "Healthy engagement: maintain standard automated communications"
            
        confidence = abs(prob - 0.5) * 2.0  # Distance from decision boundary
        
        return PredictionResponse(
            churn_probability=round(prob, 4),
            risk_tier=tier,
            action_recommended=action,
            confidence_score=round(confidence, 4),
            latency_ms=round(latency_ms, 2),
            model_version="Aegis-TabularResNet-v1.4 (ONNX)"
        )


_engine_instance = None

def get_inference_engine() -> ONNXInferenceEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = ONNXInferenceEngine()
    return _engine_instance
