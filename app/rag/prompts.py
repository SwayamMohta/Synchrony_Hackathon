SYSTEM_PROMPT = (
    "You are a read-only underwriting policy assistant for credit analysts. "
    "You explain existing decisions using only the retrieved policy excerpts and the "
    "recorded decision facts provided. You never approve, decline, refer, override, or "
    "modify an application, and you never recommend a decision. You never cite policy "
    "that is not in the retrieved excerpts. "
    "If the analyst asks about a limit, cap, or maximum (for example, how much can be "
    "borrowed before being flagged or denied), answer using the thresholds in the "
    "retrieved excerpts. Policy thresholds are often relative (a multiple of monthly "
    "income, or a ratio) rather than a fixed monetary amount — state the relative "
    "threshold and say explicitly there is no fixed monetary cap, instead of refusing. "
    "Respond with a single JSON object with exactly these keys: "
    '"status" (either "answered" or "refused"), '
    '"decision_outcome" (the recorded decision: approve, refer, or decline, exactly as given), '
    '"explanation" (a concise plain-English explanation grounded only in the retrieved excerpts), '
    '"policy_basis" (a list of objects, each with "chunk_id" set to one of the provided '
    'chunk_id values and "claim" being a short statement of what that excerpt says), and '
    '"limitations" (a list of strings, which may be empty). '
    "If you cannot ground the answer in the retrieved excerpts, set status to \"refused\" "
    "and give a short refusal in explanation."
)


def build_user_prompt(question, decision_snapshot, chunks):
    """Build the user message with a cache-friendly token order.

    Providers (Groq, OpenAI, etc.) cache the longest common *prefix* of a
    request. To maximize cache hits we keep the layout stable and order content
    from most-stable to least-stable:

      1. fixed section headers,
      2. per-application decision facts (stable across questions for one app),
      3. retrieved policy excerpts (vary per question),
      4. the analyst question (most variable) last.

    No timestamps, ids, or other volatile text are injected, and iteration
    order is fixed, so identical inputs produce a byte-identical prompt.
    """
    lines = []
    lines.append("Recorded decision facts:")
    lines.append(f"- outcome: {decision_snapshot.get('decision')}")
    reasons = decision_snapshot.get("reason_codes") or []
    lines.append(f"- reason codes: {', '.join(reasons) if reasons else '(none)'}")
    lines.append(f"- credit risk score: {decision_snapshot.get('credit_risk_score')}")
    lines.append(f"- fraud risk score: {decision_snapshot.get('fraud_risk_score')}")
    lines.append(f"- policy version: {decision_snapshot.get('policy_version')}")
    inputs = decision_snapshot.get("inputs") or {}
    if inputs:
        lines.append("- recorded application facts:")
        for key, label in [
            ("requested_amount", "requested amount"),
            ("annual_income", "annual income"),
            ("avg_monthly_income", "average monthly income"),
            ("avg_monthly_expenses", "average monthly expenses"),
            ("age", "age"),
            ("dependents", "dependents"),
        ]:
            if inputs.get(key) is not None:
                lines.append(f"  - {label}: {inputs.get(key)}")
    lines.append("")
    lines.append("Retrieved policy excerpts:")
    for c in chunks:
        label = c.get("rule_id") or c.get("section_path") or c.get("chunk_id")
        lines.append(f"[chunk_id: {c.get('chunk_id')}] (rule: {label})")
        lines.append(c.get("chunk_text") or "")
        lines.append("")
    lines.append("Analyst question:")
    lines.append(question)
    return "\n".join(lines)
