from sklearn.metrics import roc_auc_score
import joblib

def compare_models(y_test, baseline_proba, proposed_proba):
    return {
        "baseline_auc": float(roc_auc_score(y_test, baseline_proba)),
        "proposed_auc": float(roc_auc_score(y_test, proposed_proba)),
    }

if __name__ == "__main__":
    data = joblib.load("ml/data/holdout_predictions.pkl")
    metrics = compare_models(data["y_test"], data["baseline_proba"], data["proposed_proba"])
    print(f"Baseline (LogisticRegression) AUC: {metrics['baseline_auc']:.4f}")
    print(f"Proposed (XGBoost) AUC: {metrics['proposed_auc']:.4f}")
    print(f"AUC uplift: {metrics['proposed_auc'] - metrics['baseline_auc']:.4f}")
