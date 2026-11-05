import os
import sys
import time
import json
import numpy as np
import torch

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.models.deep_churn_net import TabularResNet
from app.services.onnx_inference import get_inference_engine
from app.schemas.churn import CustomerFeatures


def run_latency_benchmark(num_iterations: int = 500):
    print("=" * 65)
    print("⚡ Aegis Production Inference Benchmark: PyTorch vs ONNX Runtime")
    print(f"🔥 Iterations: {num_iterations} single-item sequential inferences")
    print("=" * 65)
    
    weights_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "weights"))
    meta_path = os.path.join(weights_dir, "preprocessor_meta.json")
    pt_path = os.path.join(weights_dir, "deep_churn_resnet.pt")
    
    with open(meta_path, "r") as f:
        meta = json.load(f)
        
    # Load PyTorch model
    pt_model = TabularResNet(
        cat_cardinalities=meta["cat_cardinalities"],
        num_continuous_features=len(meta["cont_cols"]),
        hidden_dim=128,
        num_blocks=3,
        dropout=0.0
    )
    pt_model.load_state_dict(torch.load(pt_path))
    pt_model.eval()
    
    # Load ONNX Engine
    onnx_engine = get_inference_engine()
    
    sample_customer = CustomerFeatures(
        credit_score=680,
        geography="North America",
        gender="Female",
        age=45,
        tenure=3,
        balance=115000.0,
        num_products=1,
        has_credit_card=1,
        is_active_member=0,
        estimated_salary=92000.0
    )
    
    cat_arr, cont_arr = onnx_engine.preprocess(sample_customer)
    cat_torch = torch.tensor(cat_arr, dtype=torch.long)
    cont_torch = torch.tensor(cont_arr, dtype=torch.float32)
    
    # Warm-up (50 runs)
    for _ in range(50):
        with torch.no_grad():
            _ = pt_model(cat_torch, cont_torch)
        _ = onnx_engine.session.run(None, {onnx_engine.input_names[0]: cat_arr, onnx_engine.input_names[1]: cont_arr})
        
    # PyTorch Benchmark
    pt_latencies = []
    for _ in range(num_iterations):
        t0 = time.perf_counter()
        with torch.no_grad():
            _ = pt_model(cat_torch, cont_torch)
        t1 = time.perf_counter()
        pt_latencies.append((t1 - t0) * 1000.0)
        
    # ONNX Benchmark
    onnx_latencies = []
    inputs = {onnx_engine.input_names[0]: cat_arr, onnx_engine.input_names[1]: cont_arr}
    for _ in range(num_iterations):
        t0 = time.perf_counter()
        _ = onnx_engine.session.run(None, inputs)
        t1 = time.perf_counter()
        onnx_latencies.append((t1 - t0) * 1000.0)
        
    pt_p50 = float(np.percentile(pt_latencies, 50))
    pt_p95 = float(np.percentile(pt_latencies, 95))
    pt_p99 = float(np.percentile(pt_latencies, 99))
    pt_qps = float(1000.0 / np.mean(pt_latencies))
    
    onnx_p50 = float(np.percentile(onnx_latencies, 50))
    onnx_p95 = float(np.percentile(onnx_latencies, 95))
    onnx_p99 = float(np.percentile(onnx_latencies, 99))
    onnx_qps = float(1000.0 / np.mean(onnx_latencies))
    
    speedup_p99 = pt_p99 / onnx_p99
    
    print("\nBenchmark Results Summary:")
    print(f"| Engine                 | P50 Latency | P95 Latency | P99 Latency | Throughput (QPS) |")
    print(f"|------------------------|-------------|-------------|-------------|------------------|")
    print(f"| PyTorch (FP32 Eager)   | {pt_p50:8.2f} ms | {pt_p95:8.2f} ms | {pt_p99:8.2f} ms | {pt_qps:14.1f} QPS |")
    print(f"| ONNX Runtime (Optimized)| {onnx_p50:8.2f} ms | {onnx_p95:8.2f} ms | {onnx_p99:8.2f} ms | {onnx_qps:14.1f} QPS |")
    print(f"\n🚀 ONNX Runtime P99 Latency Acceleration: {speedup_p99:.2f}x faster than native PyTorch!")
    
    results = {
        "pytorch": {"p50_ms": round(pt_p50, 2), "p95_ms": round(pt_p95, 2), "p99_ms": round(pt_p99, 2), "qps": round(pt_qps, 1)},
        "onnx": {"p50_ms": round(onnx_p50, 2), "p95_ms": round(onnx_p95, 2), "p99_ms": round(onnx_p99, 2), "qps": round(onnx_qps, 1)},
        "speedup_p99": round(speedup_p99, 2)
    }
    
    with open(os.path.join(weights_dir, "benchmark_results.json"), "w") as f:
        json.dump(results, f, indent=2)
    print("✅ Benchmark results saved to backend/weights/benchmark_results.json")


if __name__ == "__main__":
    run_latency_benchmark()
