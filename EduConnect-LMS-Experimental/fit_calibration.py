import json
import numpy as np
from scipy.optimize import minimize
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score, average_precision_score

with open("EXP-0033-CALIBRATION-DATASET.json", "r", encoding="utf-8") as f:
    cal_data = json.load(f)

X = np.array([p["raw_logit"] for p in cal_data])
y = np.array([p["is_relevant"] for p in cal_data])

N = len(y)
print(f"Calibration samples: {N} (Positive: {np.sum(y)}, Negative: {N - np.sum(y)})")
print(f"Raw logit range: [{np.min(X):.4f}, {np.max(X):.4f}], Mean: {np.mean(X):.4f}, Std: {np.std(X):.4f}")

# C1: Min-Max
c1_min = float(np.min(X))
c1_max = float(np.max(X))
p_c1 = np.clip((X - c1_min) / (c1_max - c1_min), 1e-6, 1.0 - 1e-6)

# C2: Standard Sigmoid
def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))

p_c2 = np.clip(sigmoid(X), 1e-6, 1.0 - 1e-6)

# C3: Temperature Scaling p = sigmoid(X / T)
def nll_temp(T):
    t_val = T[0]
    p = np.clip(sigmoid(X / t_val), 1e-6, 1.0 - 1e-6)
    return -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))

res_c3 = minimize(nll_temp, [2.0], bounds=[(0.1, 15.0)], method='L-BFGS-B')
c3_T = float(res_c3.x[0])
p_c3 = np.clip(sigmoid(X / c3_T), 1e-6, 1.0 - 1e-6)
print(f"Fitted Temperature T: {c3_T:.4f} (NLL: {res_c3.fun:.4f})")

# C4: Platt Scaling p = sigmoid(a * X + b)
def nll_platt(params):
    a, b = params
    p = np.clip(sigmoid(a * X + b), 1e-6, 1.0 - 1e-6)
    return -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))

res_c4 = minimize(nll_platt, [1.0, 0.0], bounds=[(0.01, 10.0), (-10.0, 10.0)], method='L-BFGS-B')
c4_a, c4_b = float(res_c4.x[0]), float(res_c4.x[1])
p_c4 = np.clip(sigmoid(c4_a * X + c4_b), 1e-6, 1.0 - 1e-6)
print(f"Fitted Platt Scaling: a = {c4_a:.4f}, b = {c4_b:.4f} (NLL: {res_c4.fun:.4f})")

# Compute ECE (Expected Calibration Error)
def compute_ece(probs, labels, n_bins=10):
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        in_bin = (probs > bin_lower) & (probs <= bin_upper)
        prop_in_bin = np.mean(in_bin)
        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(labels[in_bin])
            avg_confidence_in_bin = np.mean(probs[in_bin])
            ece += np.abs(avg_confidence_in_bin - accuracy_in_bin) * prop_in_bin
    return float(ece)

# Evaluate all methods
methods = {
    "C0_Raw": {"probs": np.clip((X - np.min(X)) / (np.max(X) - np.min(X)), 1e-6, 1.0 - 1e-6), "raw": X},
    "C1_MinMax": {"probs": p_c1},
    "C2_Sigmoid": {"probs": p_c2},
    "C3_Temperature": {"probs": p_c3},
    "C4_Platt": {"probs": p_c4}
}

metrics_table = {}
for m_name, d in methods.items():
    p = d["probs"]
    brier = brier_score_loss(y, p)
    ll = log_loss(y, p)
    auc = roc_auc_score(y, p)
    pr_auc = average_precision_score(y, p)
    ece = compute_ece(p, y)
    
    metrics_table[m_name] = {
        "brier_score": round(float(brier), 4),
        "log_loss": round(float(ll), 4),
        "roc_auc": round(float(auc), 4),
        "pr_auc": round(float(pr_auc), 4),
        "ece": round(float(ece), 4)
    }

print("\n=== CALIBRATION EVALUATION METRICS ===")
for m, vals in metrics_table.items():
    print(f"{m}: Brier={vals['brier_score']}, LogLoss={vals['log_loss']}, ROC-AUC={vals['roc_auc']}, PR-AUC={vals['pr_auc']}, ECE={vals['ece']}")

calibration_params = {
    "C1_MinMax": {"min_val": c1_min, "max_val": c1_max},
    "C2_Sigmoid": {"formula": "1 / (1 + exp(-x))"},
    "C3_Temperature": {"T": round(c3_T, 4), "formula": "1 / (1 + exp(-x / T))"},
    "C4_Platt": {"a": round(c4_a, 4), "b": round(c4_b, 4), "formula": "1 / (1 + exp(-(a * x + b)))"},
    "metrics": metrics_table
}

with open("scratch_calibration_params.json", "w") as f:
    json.dump(calibration_params, f, indent=2)

print("\nSaved scratch_calibration_params.json")
