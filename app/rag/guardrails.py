BANNED_ACTION_WORDS = (
    "override",
    "recalculate",
    "recompute",
    "modify",
    "reconsider",
    "reverse",
    "re-underwrite",
)


def refusal_message() -> str:
    return (
        "I can't identify a policy basis for this question from the policy version "
        "associated with this application. I can show the recorded decision reason "
        "codes or route this for policy review."
    )


def validate_answer(answer, retrieved_chunks, decision_snapshot):
    """Validate an LLM answer against the immutable decision and retrieved chunks.

    Returns ``(ok, violations)``. A ``refused`` status is always considered valid.
    """
    if answer.get("status") == "refused":
        return True, []

    violations = []

    outcome = answer.get("decision_outcome")
    if outcome is not None and decision_snapshot is not None:
        recorded = str(decision_snapshot.get("decision", "")).lower()
        if str(outcome).lower() != recorded:
            violations.append("decision_outcome does not match the recorded decision")

    chunk_ids = {c.get("chunk_id") for c in retrieved_chunks}
    basis = answer.get("policy_basis") or []
    if not basis:
        violations.append("no policy_basis citations provided")
    for item in basis:
        cid = item.get("chunk_id")
        if not cid or cid not in chunk_ids:
            violations.append(f"citation '{cid}' is not among retrieved chunks")

    text = (answer.get("explanation") or "").lower()
    for word in BANNED_ACTION_WORDS:
        if word in text:
            violations.append(f"banned action word in explanation: '{word}'")

    return (len(violations) == 0), violations
