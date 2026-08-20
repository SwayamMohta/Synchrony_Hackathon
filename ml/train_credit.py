import sys, os, json, time
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    roc_curve,
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    confusion_matrix,
)
import joblib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.features.builder import build_credit_training_matrix, CREDIT_FEATURES

TARGET = "SeriousDlqin2yrs"

os.makedirs("app/models/artifacts", exist_ok=True)
os.makedirs("ml/data", exist_ok=True)

from sklearn.model_selection import train_test_split

data = pd.read_csv("dataset/cs-training.csv")

# NOTE: cs-test.csv in this distribution has an empty SeriousDlqin2yrs
# column (labels withheld by the competition), so it cannot be scored.
# Evaluate on a stratified holdout slice of the labeled training data.
train, test = train_test_split(data, test_size=0.2, stratify=data[TARGET], random_state=42)

X_train = build_credit_training_matrix(train)
y_train = train[TARGET]

with open("ml/feature_metadata.json") as fh:
    medians = json.load(fh)["medians"]
X_test = test[CREDIT_FEATURES].copy()
for c in CREDIT_FEATURES:
    X_test[c] = X_test[c].fillna(medians[c]).astype(float)
y_test = test[TARGET]

# Class imbalance: default rate ~6.7%, so weight the minority class.
scale = float((y_train == 0).sum()) / float((y_train == 1).sum())
print(f"scale_pos_weight = {scale:.3f}")

t0 = time.perf_counter()
model = xgb.XGBClassifier(
    n_estimators=300, max_depth=5, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8,
    scale_pos_weight=scale, eval_metric="auc", random_state=42,
)
model.fit(X_train, y_train)
xgb_train_time = time.perf_counter() - t0
xgb_proba = model.predict_proba(X_test)[:, 1]

t = time.perf_counter()
bl = Pipeline([
    ("scaler", StandardScaler()),
    ("lr", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)),
])
bl.fit(X_train, y_train)
lr_train_time = time.perf_counter() - t
lr_proba = bl.predict_proba(X_test)[:, 1]

xgb_auc = roc_auc_score(y_test, xgb_proba)
lr_auc = roc_auc_score(y_test, lr_proba)
xgb_prauc = average_precision_score(y_test, xgb_proba)

# Threshold via Youden's J on the ROC curve (not the default 0.5).
fpr, tpr, thresholds = roc_curve(y_test, xgb_proba)
j = tpr - fpr
best_t = thresholds[np.argmax(j)]
preds = (xgb_proba >= best_t).astype(int)

metrics = {
    "xgb_auc": round(float(xgb_auc), 4),
    "lr_baseline_auc": round(float(lr_auc), 4),
    "auc_uplift": round(float(xgb_auc - lr_auc), 4),
    "xgb_pr_auc": round(float(xgb_prauc), 4),
    "youden_threshold": round(float(best_t), 4),
    "precision": round(float(precision_score(y_test, preds)), 4),
    "recall": round(float(recall_score(y_test, preds)), 4),
    "f1": round(float(f1_score(y_test, preds)), 4),
    "accuracy": round(float(accuracy_score(y_test, preds)), 4),
    "confusion_matrix": confusion_matrix(y_test, preds).tolist(),
    "n_features": len(CREDIT_FEATURES),
    "n_train": int(len(X_train)),
    "n_test": int(len(X_test)),
    "xgb_train_seconds": round(xgb_train_time, 2),
    "lr_train_seconds": round(lr_train_time, 2),
}

model.save_model("app/models/artifacts/credit_risk_v1.json")
joblib.dump(bl, "app/models/artifacts/credit_baseline_v1.pkl")

joblib.dump(
    {"y_test": y_test, "baseline_proba": lr_proba, "proposed_proba": xgb_proba,
     "youden_threshold": best_t},
    "ml/data/holdout_predictions.pkl",
)
with open("ml/data/credit_metrics.json", "w") as fh:
    json.dump(metrics, fh, indent=2)

print("\n=== Credit model metrics ===")
for k, v in metrics.items():
    print(f"  {k}: {v}")
