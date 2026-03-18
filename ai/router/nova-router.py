from __future__ import annotations
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
POLICY = json.loads((ROOT / "routing-policy.json").read_text())

def get_model_status() -> str:
    result = subprocess.run(
        ["openclaw", "models", "status", "--probe", "--agent", "main"],
        capture_output=True,
        text=True
    )
    return result.stdout + "\n" + result.stderr

def codex_healthy(status_text: str) -> bool:
    lowered = status_text.lower()

    if "openai-codex" not in lowered:
        return False

    if "timed out" in lowered:
        return False

    if "rate limit" in lowered:
        return False

    return True

def classify(task: str) -> str:
    t = task.lower()

    if any(k in t for k in POLICY["critical_keywords"]):
        return "critical_code"

    if any(k in t for k in POLICY["simple_code_keywords"]):
        return "simple_code"

    coding_terms = [
        "code", "debug", "fix", "refactor", "patch",
        "typescript", "python", "function", "class",
        "backend", "api", "implement", "bug"
    ]

    if any(k in t for k in coding_terms):
        return "code"

    return "reasoning"

def choose_model(task: str) -> tuple[str, str]:
    status = get_model_status()
    codex_ok = codex_healthy(status)
    kind = classify(task)

    if kind == "reasoning":
        return "stepfun", "reasoning/planning task"

    if kind == "simple_code":
        return "qwen", "simple/low-risk coding task"

    if kind in ("code", "critical_code"):
        if codex_ok:
            return "codex", "preferred coder is healthy"
        return "qwen", "codex unavailable or degraded"

    return "stepfun", "default reasoning route"

if __name__ == "__main__":
    import sys
    task = " ".join(sys.argv[1:]).strip()
    model, reason = choose_model(task)
    print(json.dumps({"model": model, "reason": reason}))
