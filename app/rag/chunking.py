import re

CHUNKER_VERSION = "section-aware-v1"
MAX_CHUNK_TOKENS = 450
TARGET_CHUNK_TOKENS = 300
SPLIT_OVERLAP_TOKENS = 50


def _token_count(text: str) -> int:
    return len(text.split())


def _parse_blocks(text: str):
    """Parse markdown into sections keyed by heading, tracking the heading path."""
    root = {"level": 0, "heading": "", "path": [], "lines": []}
    stack = [root]
    blocks = []
    for line in text.splitlines():
        m = re.match(r"^(#{1,6})\s+(.*)$", line)
        if m:
            top = stack[-1]
            if top["lines"]:
                blocks.append({
                    "heading": top["heading"],
                    "path": list(top["path"]),
                    "text": "\n".join(top["lines"]).strip(),
                })
                top["lines"] = []
            level = len(m.group(1))
            heading = m.group(2).strip()
            while len(stack) > 1 and stack[-1]["level"] >= level:
                stack.pop()
            path = [n["heading"] for n in stack[1:] if n["heading"]] + [heading]
            stack.append({"level": level, "heading": heading, "path": path, "lines": []})
        else:
            stack[-1]["lines"].append(line)
    for node in stack:
        if node["lines"]:
            blocks.append({
                "heading": node["heading"],
                "path": list(node["path"]),
                "text": "\n".join(node["lines"]).strip(),
            })
    return blocks


def _rule_id(path):
    leaf = path[-1] if path else ""
    m = re.match(r"^(\d+(?:\.\d+)*)[.\s]*(.*)$", leaf)
    if m:
        return (m.group(1) + " " + m.group(2)).strip()
    return leaf


def _header(source_name, policy_version, path):
    parts = [f"Document: {source_name}", f"Version: {policy_version}"]
    if path:
        parts.append("Section: " + " > ".join(path))
    return "\n".join(parts)


def _split_sentences(text):
    return re.split(r"(?<=[.!?])\s+", text)


def _split_long_block(body, header):
    paras = re.split(r"\n\s*\n", body)
    pieces = []
    buf = []
    buf_len = 0

    def flush():
        nonlocal buf, buf_len
        if buf:
            pieces.append("\n\n".join(buf))
            buf = []
            buf_len = 0

    for p in paras:
        p_tokens = _token_count(p)
        if p_tokens <= TARGET_CHUNK_TOKENS:
            if buf_len + p_tokens > MAX_CHUNK_TOKENS and buf:
                flush()
            buf.append(p)
            buf_len += p_tokens
        else:
            if buf:
                flush()
            for sent in _split_sentences(p):
                st = _token_count(sent)
                if buf_len + st > MAX_CHUNK_TOKENS and buf:
                    flush()
                buf.append(sent)
                buf_len += st
    flush()
    return [f"{header}\n\n{piece}" for piece in pieces]


def chunk_markdown(text, source_name, policy_id, policy_version):
    """Section-first chunking with recursive sentence fallback.

    Returns a list of dicts with a stable ``chunk_id``, the section path, the
    rule id, and the chunk text (with a compact hierarchy header prepended).
    """
    blocks = _parse_blocks(text)
    chunks = []
    for b in blocks:
        if _token_count(b["text"]) == 0:
            continue
        path = b["path"]
        rule_id = _rule_id(path)
        header = _header(source_name, policy_version, path)
        if _token_count(b["text"]) <= MAX_CHUNK_TOKENS:
            pieces = [f"{header}\n\n{b['text']}"]
        else:
            pieces = _split_long_block(b["text"], header)
        for piece in pieces:
            chunks.append({
                "chunk_id": f"{policy_id}:{len(chunks):04d}",
                "chunk_index": len(chunks),
                "section_path": " > ".join(path),
                "rule_id": rule_id,
                "chunk_text": piece,
            })
    return chunks
