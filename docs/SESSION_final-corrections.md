# SESSION_final-corrections.md

## Session objective
Apply the final 4 decisioning corrections, verify, and commit the controlled-inputs refactor.

## Session scope
- Only the 4 corrections. Do NOT redesign the logic (user explicitly said so).
- No RAG, no Docker, no new features.

## Current active task
DebtRatio exact-match fix (definition already verified — see below; the code fix is not yet applied).

## Exact next steps (in order)
1. `app/features/builder.py`: change DebtRatio to
   `debt_ratio = ((applicant.monthly_debt_payments + applicant.avg_monthly_expenses) / monthly_gross) if monthly_gross > 0 else 0.0`
   (GMSC def = "Monthly debt payments, alimony, living costs / monthly gross income"; alimony=0, expenses= living costs). Update `tests/test_feature_builder.py` DebtRatio assertion `0.1` → `0.5`.
2. `app/decisioning/pipeline.py::_decide`: move affordability check BEFORE credit thresholds (policy → fraud → affordability → credit≥0.60 → credit≥0.35 → approve).
3. High-debt scenario: already 0.84 ≥ 0.65 (deterministic DECLINE); keep/confirm, sync `docs/ModelPlan.md` §9.
4. Relabel fraud output to "Rule-based fraud risk score" in `DecisionCard.jsx` + `docs/ModelPlan.md`.
5. Verify: `pytest tests/`, `cd frontend && npm run build`, HTTP smoke.
6. `git add -A; git commit; git push`.

## Recommended model path for next session
- Model family: deepseek-v4-pro
- Effort: default
- Thinking: off (small, well-specified edits)
- Start directly (no subagent needed) — edits are mechanical.

## Session-specific constraints or decisions
- DebtRatio numerator = monthly_debt_payments + avg_monthly_expenses (alimony treated 0). This is the verified interpretation of the GMSC Data Dictionary.
- Affordability before credit thresholds → unaffordable + high-risk now REFERs (not declines). Accepted.
- Thresholds are prototype/demo values only.

## Files or modules to open first
- `app/features/builder.py`
- `app/decisioning/pipeline.py`
- `frontend/src/components/DecisionCard.jsx`
- `docs/ModelPlan.md` (§2, §5, §6, §9)
- `tests/test_feature_builder.py`
