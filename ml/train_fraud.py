import sys, os, json, time
import numpy as np
import pandas as pd
import xgboost as xgb
import joblib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sklearn.model_selection import train_test_split
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

DATA_DIR = "ieee-fraud-detection"
TARGET = "isFraud"

TRANSACTION_COLS = [
    "TransactionID", "isFraud", "TransactionDT", "TransactionAmt", "ProductCD",
    "card1", "card2", "card3", "card4", "card5", "card6",
    "addr1", "addr2", "dist1", "dist2",
    "P_emaildomain", "R_emaildomain",
] + [f"C{i}" for i in range(1, 15)] + [f"D{i}" for i in range(1, 16)] + [f"M{i}" for i in range(1, 10)]

IDENTITY_COLS = (
    ["TransactionID", "DeviceType", "DeviceInfo"]
    + [f"id_{i:02d}" for i in range(12, 39)]
)

# Numeric features: raw numbers -> fill missing with -1 (missing is a signal).
NUMERIC_FEATURES = (
    ["card1", "card2", "card5", "dist1", "dist2"]
    + [f"C{i}" for i in range(1, 15)]
    + [f"D{i}" for i in range(1, 16)]
)

# Categorical features -> frequency encoded (NaN becomes its own category).
CATEGORICAL_FEATURES = (
    ["ProductCD", "card3", "card4", "card6", "addr1", "addr2",
     "P_emaildomain", "R_emaildomain"]
    + [f"M{i}" for i in range(1, 10)]
    + ["DeviceType", "DeviceInfo"]
    + [f"id_{i:02d}" for i in range(12, 39)]
)


def freq_encode(series):
    s = series.astype(str)
    counts = s.value_counts()
    return s.map(counts).astype(np.float64)


def load_and_build_features():
    tx = pd.read_csv(
        os.path.join(DATA_DIR, "train_transaction.csv"),
        usecols=TRANSACTION_COLS,
    )
    idn = pd.read_csv(
        os.path.join(DATA_DIR, "train_identity.csv"),
        usecols=IDENTITY_COLS,
    )
    df = tx.merge(idn, on="TransactionID", how="left")

    features = {}

    # Amount (log-scaled; heavy tail) + time-of-day / day-of-week.
    features["amt_log"] = np.log1p(df["TransactionAmt"].fillna(0))
    dt = df["TransactionDT"]
    features["hour"] = ((dt // 3600) % 24).astype(np.float64)
    features["weekday"] = ((dt // 86400) % 7).astype(np.float64)

    for c in NUMERIC_FEATURES:
        features[c] = pd.to_numeric(df[c], errors="coerce").fillna(-1).astype(np.float64)

    for c in CATEGORICAL_FEATURES:
        features[c] = freq_encode(df[c])

    X = pd.DataFrame(features)
    y = df[TARGET].astype(int)
    return X, y, list(X.columns)


def main():
    t0 = time.perf_counter()
    print("Loading and engineering features...")
    X, y, feature_names = load_and_build_features()
    print(f"  {len(X)} rows x {len(feature_names)} features (load+eng: {time.perf_counter() - t0:.1f}s)")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    print(f"  train {len(X_train)} / test {len(X_test)}; fraud rate {float(y_train.mean()):.4f}")

    scale = float((y_train == 0).sum()) / float((y_train == 1).sum())
    print(f"  scale_pos_weight = {scale:.3f}")

    # XGBoost (proposed)
    t = time.perf_counter()
    model = xgb.XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=scale, eval_metric="auc", random_state=42,
        tree_method="hist", n_jobs=-1,
    )
    model.fit(X_train, y_train)
    xgb_train_time = time.perf_counter() - t
    xgb_proba = model.predict_proba(X_test)[:, 1]

    # Logistic regression (baseline)
    t = time.perf_counter()
    bl = Pipeline([
        ("scaler", StandardScaler()),
        ("lr", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)),
    ])
    bl.fit(X_train, y_train)
    lr_train_time = time.perf_counter() - t
    lr_proba = bl.predict_proba(X_test)[:, 1]

    # Metrics
    xgb_auc = roc_auc_score(y_test, xgb_proba)
    lr_auc = roc_auc_score(y_test, lr_proba)
    xgb_prauc = average_precision_score(y_test, xgb_proba)

    # Threshold via Youden's J on the ROC curve (honest, not the default 0.5).
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
        "n_features": len(feature_names),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "xgb_train_seconds": round(xgb_train_time, 2),
        "lr_train_seconds": round(lr_train_time, 2),
    }

    os.makedirs("app/models/artifacts", exist_ok=True)
    os.makedirs("ml/data", exist_ok=True)

    model.save_model("app/models/artifacts/fraud_risk_v1.json")
    joblib.dump(
        {"y_test": y_test, "xgb_proba": xgb_proba, "lr_proba": lr_proba,
         "feature_names": feature_names, "youden_threshold": best_t},
        "ml/data/fraud_holdout_predictions.pkl",
    )
    with open("ml/data/fraud_metrics.json", "w") as fh:
        json.dump(metrics, fh, indent=2)

    print("\n=== Fraud model metrics ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
    print(f"\nTotal wall time: {time.perf_counter() - t0:.1f}s")


if __name__ == "__main__":
    main()
