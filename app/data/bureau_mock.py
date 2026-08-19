import random
from app.schemas import BureauFeatures

def get_bureau_features(applicant_id: str) -> BureauFeatures:
    rng = random.Random(applicant_id)
    is_thin_file = rng.random() < 0.35
    if is_thin_file:
        return BureauFeatures(
            bureau_score=None,
            num_tradelines=rng.randint(0, 2),
            utilization_ratio=rng.uniform(0, 0.3),
            delinquencies_24mo=0,
            credit_history_months=rng.randint(0, 6),
        )
    return BureauFeatures(
        bureau_score=rng.randint(580, 800),
        num_tradelines=rng.randint(3, 12),
        utilization_ratio=rng.uniform(0.1, 0.9),
        delinquencies_24mo=rng.randint(0, 3),
        credit_history_months=rng.randint(24, 200),
    )
