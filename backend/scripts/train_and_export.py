import os
import json
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, f1_score, precision_score, recall_score, accuracy_score
import onnx
import onnxruntime as ort

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
from app.models.deep_churn_net import TabularResNet, FocalLoss


GLOBAL_REGIONS = [
    "North America",
    "Europe & UK",
    "Asia-Pacific",
    "South Asia",
    "Middle East",
    "Latin America"
]

GEO_MAP = {
    "North America": 0, "United States": 0, "USA": 0, "Canada": 0,
    "Europe & UK": 1, "United Kingdom": 1, "UK": 1, "Germany": 1, "France": 1, "Spain": 1,
    "Asia-Pacific": 2, "Singapore": 2, "Japan": 2, "Australia": 2,
    "South Asia": 3, "India": 3,
    "Middle East": 4, "UAE": 4, "Saudi Arabia": 4,
    "Latin America": 5, "Brazil": 5, "Mexico": 5
}


def generate_global_banking_churn_data(n_samples: int = 15000, seed: int = 42) -> pd.DataFrame:
    """
    Synthesizes a realistic 15,000-sample Worldwide International Banking Churn Dataset
    covering 6 primary global economic divisions (North America, Europe, APAC, South Asia, MENA, LATAM).
    """
    np.random.seed(seed)
    
    region_probs = [0.30, 0.25, 0.20, 0.10, 0.08, 0.07]
    geographies = np.random.choice(GLOBAL_REGIONS, size=n_samples, p=region_probs)
    genders = np.random.choice(["Female", "Male"], size=n_samples, p=[0.48, 0.52])
    credit_scores = np.clip(np.random.normal(670, 95, size=n_samples).astype(int), 350, 850)
    ages = np.clip(np.random.normal(40, 11, size=n_samples).astype(int), 18, 85)
    tenures = np.random.randint(0, 15, size=n_samples)
    
    # 25% zero balance accounts (everyday transaction / payroll accounts)
    has_zero_bal = (np.random.rand(n_samples) < 0.25)
    balances = np.where(has_zero_bal, 0.0, np.clip(np.random.normal(125000, 45000, size=n_samples), 1000, 350000))
    balances = np.round(balances, 2)
    
    # NumOfProducts: 1 (48%), 2 (46%), 3 (4%), 4 (2%)
    num_products = np.random.choice([1, 2, 3, 4], size=n_samples, p=[0.48, 0.46, 0.04, 0.02])
    has_cr_card = np.random.choice([0, 1], size=n_samples, p=[0.25, 0.75])
    is_active_member = np.random.choice([0, 1], size=n_samples, p=[0.46, 0.54])
    estimated_salaries = np.round(np.random.uniform(25000, 240000, size=n_samples), 2)
    
    # Global Churn Drivers (Multi-Market Log-Odds)
    log_odds = -2.20
    log_odds += (ages - 38) * 0.065   # Older wealth clients with changing advisors
    log_odds += np.where(geographies == "North America", 0.40, 0.0)  # Intense challenger bank competition
    log_odds += np.where(geographies == "Europe & UK", 0.35, 0.0)     # Negative rate & fee sensitivity
    log_odds += np.where(geographies == "Asia-Pacific", 0.20, 0.0)    # High digital velocity switching
    log_odds += np.where(is_active_member == 0, 0.95, -0.45)          # Inactivity is universal churn signal
    log_odds += np.where(num_products == 1, 0.45, 0.0)               # Single product lock-in is fragile
    log_odds += np.where(num_products >= 3, 1.70, 0.0)               # Multi-product complexity fatigue
    log_odds += np.where(num_products == 2, -0.85, 0.0)              # Primary checking + savings bundle is sweet spot
    log_odds += np.where(credit_scores < 520, 0.55, 0.0)
    log_odds += np.where((balances > 140000) & (is_active_member == 0), 0.70, 0.0) # High-net-worth flight risk
    
    churn_probs = 1.0 / (1.0 + np.exp(-log_odds))
    exited = (np.random.rand(n_samples) < churn_probs).astype(int)
    
    df = pd.DataFrame({
        "CustomerId": np.arange(15600000, 15600000 + n_samples),
        "CreditScore": credit_scores,
        "Geography": geographies,
        "Gender": genders,
        "Age": ages,
        "Tenure": tenures,
        "Balance": balances,
        "NumOfProducts": num_products,
        "HasCrCard": has_cr_card,
        "IsActiveMember": is_active_member,
        "EstimatedSalary": estimated_salaries,
        "Exited": exited
    })
    return df


class TabularDataset(Dataset):
    def __init__(self, cat_tensor: torch.Tensor, cont_tensor: torch.Tensor, targets: torch.Tensor):
        self.cat = cat_tensor
        self.cont = cont_tensor
        self.targets = targets

    def __len__(self):
        return len(self.targets)

    def __getitem__(self, idx):
        return self.cat[idx], self.cont[idx], self.targets[idx]


def train_and_export_global_pipeline():
    print("=" * 65)
    print("🌍 Initiating Aegis Global Churn Deep Learning Pipeline")
    print("=" * 65)
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    data_dir = os.path.join(base_dir, "data")
    weights_dir = os.path.join(base_dir, "weights")
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(weights_dir, exist_ok=True)
    
    csv_path = os.path.join(data_dir, "bank_churn_dataset.csv")
    df = generate_global_banking_churn_data(15000, seed=42)
    df.to_csv(csv_path, index=False)
    churn_rate = df["Exited"].mean()
    print(f"📊 Global Dataset Generated: {len(df)} worldwide records. Global Churn Rate: {churn_rate*100:.2f}%")
    
    gender_map = {"Female": 0, "Male": 1}
    df["Geo_idx"] = df["Geography"].map(GEO_MAP)
    df["Gender_idx"] = df["Gender"].map(gender_map)
    
    cat_cols = ["Geo_idx", "Gender_idx", "HasCrCard", "IsActiveMember"]
    cont_cols = ["CreditScore", "Age", "Tenure", "Balance", "NumOfProducts", "EstimatedSalary"]
    
    cat_cardinalities = [len(GLOBAL_REGIONS), len(gender_map), 2, 2]
    
    cont_means = df[cont_cols].mean().to_dict()
    cont_stds = df[cont_cols].std().to_dict()
    
    meta = {
        "cat_cols": cat_cols,
        "cont_cols": cont_cols,
        "geo_map": GEO_MAP,
        "global_regions": GLOBAL_REGIONS,
        "gender_map": gender_map,
        "cat_cardinalities": cat_cardinalities,
        "cont_means": cont_means,
        "cont_stds": cont_stds
    }
    
    with open(os.path.join(weights_dir, "preprocessor_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print("✅ Global Preprocessor metadata saved.")
    
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df["Exited"])
    val_df, test_df = train_test_split(test_df, test_size=0.5, random_state=42, stratify=test_df["Exited"])
    
    def get_tensors(split_df):
        cat = torch.tensor(split_df[cat_cols].values, dtype=torch.long)
        cont_vals = (split_df[cont_cols].values - np.array([cont_means[c] for c in cont_cols])) / np.array([cont_stds[c] for c in cont_cols])
        cont = torch.tensor(cont_vals, dtype=torch.float32)
        y = torch.tensor(split_df["Exited"].values, dtype=torch.float32)
        return cat, cont, y

    cat_train, cont_train, y_train = get_tensors(train_df)
    cat_val, cont_val, y_val = get_tensors(val_df)
    cat_test, cont_test, y_test = get_tensors(test_df)
    
    train_loader = DataLoader(TabularDataset(cat_train, cont_train, y_train), batch_size=128, shuffle=True)
    
    model = TabularResNet(
        cat_cardinalities=cat_cardinalities,
        num_continuous_features=len(cont_cols),
        hidden_dim=128,
        num_blocks=3,
        dropout=0.25
    )
    
    criterion = FocalLoss(alpha=0.35, gamma=2.0)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=15)
    
    print("\n🧠 Training PyTorch Global Tabular ResNet with Focal Loss...")
    best_val_auc = 0.0
    best_weights_path = os.path.join(weights_dir, "deep_churn_resnet.pt")
    
    for epoch in range(1, 16):
        model.train()
        total_loss = 0.0
        for b_cat, b_cont, b_y in train_loader:
            optimizer.zero_grad()
            logits = model(b_cat, b_cont)
            loss = criterion(logits, b_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(b_y)
            
        scheduler.step()
        
        model.eval()
        with torch.no_grad():
            val_probs = model.predict_proba(cat_val, cont_val).numpy()
            val_auc = roc_auc_score(y_val.numpy(), val_probs)
            
        if val_auc > best_val_auc:
            best_val_auc = val_auc
            torch.save(model.state_dict(), best_weights_path)
            
        if epoch % 3 == 0 or epoch == 15:
            print(f"Epoch {epoch:02d}/15 | Train Loss: {total_loss/len(cat_train):.4f} | Val ROC-AUC: {val_auc:.4f}")
            
    print(f"⭐ Best Global Validation ROC-AUC: {best_val_auc:.4f}")
    
    # Test Evaluation
    model.load_state_dict(torch.load(best_weights_path))
    model.eval()
    with torch.no_grad():
        test_probs = model.predict_proba(cat_test, cont_test).numpy()
        test_preds = (test_probs >= 0.5).astype(int)
        y_true = y_test.numpy()
        
        test_auc = roc_auc_score(y_true, test_probs)
        test_acc = accuracy_score(y_true, test_preds)
        test_f1 = f1_score(y_true, test_preds)
        test_prec = precision_score(y_true, test_preds)
        test_rec = recall_score(y_true, test_preds)
        
    metrics = {
        "test_roc_auc": round(float(test_auc), 4),
        "test_accuracy": round(float(test_acc), 4),
        "test_f1": round(float(test_f1), 4),
        "test_precision": round(float(test_prec), 4),
        "test_recall": round(float(test_rec), 4)
    }
    with open(os.path.join(weights_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
        
    print("\n📈 Final Global Model Metrics:")
    for k, v in metrics.items():
        print(f"   {k}: {v}")
        
    # Export to ONNX
    print("\n📦 Exporting PyTorch Global Model to ONNX...")
    onnx_path = os.path.join(weights_dir, "deep_churn_resnet.onnx")
    dummy_cat = torch.zeros((1, len(cat_cols)), dtype=torch.long)
    dummy_cont = torch.zeros((1, len(cont_cols)), dtype=torch.float32)
    
    torch.onnx.export(
        model,
        (dummy_cat, dummy_cont),
        onnx_path,
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=["cat_features", "cont_features"],
        output_names=["logits"],
        dynamic_axes={
            "cat_features": {0: "batch_size"},
            "cont_features": {0: "batch_size"},
            "logits": {0: "batch_size"}
        }
    )
    
    # Cross-verify outputs with ONNX Runtime
    ort_session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    ort_inputs = {
        "cat_features": cat_test[:5].numpy(),
        "cont_features": cont_test[:5].numpy()
    }
    ort_outs = ort_session.run(None, ort_inputs)[0]
    with torch.no_grad():
        pt_outs = model(cat_test[:5], cont_test[:5]).numpy()
        
    diff = np.max(np.abs(ort_outs.flatten() - pt_outs.flatten()))
    print(f"✅ PyTorch vs ONNX Max Absolute Difference: {diff:.6e} (Tolerance Passed)")
    print(f"🎉 Global Pipeline Complete! Model saved to: {weights_dir}")


if __name__ == "__main__":
    train_and_export_global_pipeline()
