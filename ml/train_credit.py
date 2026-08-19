import sys, os, json
import pandas as pd
import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
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

model = xgb.XGBClassifier(
    n_estimators=300, max_depth=5, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8, eval_metric="auc", random_state=42,
)
model.fit(X_train, y_train)
auc = roc_auc_score(y_test, model.predict_proba(X_test)[:, 1])
model.save_model("app/models/artifacts/credit_risk_v1.json")
print(f"XGBoost AUC: {auc:.4f}")

bl = LogisticRegression(max_iter=1000, random_state=42)
bl.fit(X_train, y_train)
bl_auc = roc_auc_score(y_test, bl.predict_proba(X_test)[:, 1])
joblib.dump(bl, "app/models/artifacts/credit_baseline_v1.pkl")
print(f"Baseline AUC: {bl_auc:.4f}")

joblib.dump(
    {"y_test": y_test, "baseline_proba": bl.predict_proba(X_test)[:, 1],
     "proposed_proba": model.predict_proba(X_test)[:, 1]},
    "ml/data/holdout_predictions.pkl",
)
print("Saved artifacts and holdout predictions.")
