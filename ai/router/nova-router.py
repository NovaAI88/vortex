from pathlib import Path
import json
import subprocess
import sys
import time

STEPFUN_AGENT = "nova-stepfun"
DEEPSEEK_AGENT = "nova-deepseek"
CODEX_AGENT = "nova-codex"

STEPFUN_MODEL = "openrouter/stepfun/step-3.5-flash:free"
DEEPSEEK_MODEL = "openrouter/deepseek/deepseek-v3.2"
CODEX_MODEL = "openai-codex/gpt-5.4"

CACHE_PATH = Path("ai/router/health-cache.json")
CACHE_TTL = 600  # 10 minutes
HISTORY_PATH = Path("ai/router/router-history.jsonl")

CRITICAL_KEYWORDS = [
    "portfolio", "position", "pnl", "risk", "execution",
    "order", "orders", "exchange", "position sizing",
    "api contract", "auth", "secrets", "production",
    "live trading", "state", "restart"
]

SIMPLE_CODE_KEYWORDS = [
    "helper", "boilerplate", "stub", "scaffold", "mock",
    "test", "frontend", "react", "component", "ui", "utility"
]

CODING_TERMS = [
    "code", "debug", "fix", "refactor", "patch",
    "typescript", "python", "function", "class",
    "backend", "api", "implement", "bug"
]

MODEL_BY_AGENT = {
    DEEPSEEK_AGENT: DEEPSEEK_MODEL,
    CODEX_AGENT: CODEX_MODEL,
}

def load_cache() -> dict:
    if not CACHE_PATH.exists():
        return {}
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}

def save_cache(cache: dict) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, indent=2) + "\n", encoding="utf-8")

def log_decision(task: str, preferred_agent: str, actual_agent: str, reason: str, kind: str) -> None:
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)

    entry = {
        "ts": time.time(),
        "task": task,
        "preferred_agent": preferred_agent,
        "actual_agent": actual_agent,
        "agent": actual_agent,
        "used_fallback": preferred_agent != actual_agent,
        "reason": reason,
        "kind": kind
    }

    with HISTORY_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
def get_status(agent: str) -> str:
    result = subprocess.run(
        ["openclaw", "models", "status", "--probe", "--agent", agent],
        capture_output=True,
        text=True
    )
    return (result.stdout or "") + "\n" + (result.stderr or "")

def model_ok(status_text: str, target_model: str) -> bool:
    lines = status_text.lower().splitlines()
    target = target_model.lower()

    matching = [line for line in lines if target in line]

    if not matching:
        return False

    line = " ".join(matching)

    bad_markers = [
        "rate_limit",
        "rate limit",
        "timed out",
        "unavailable",
        "invalid_request",
        "invalid request",
        "usd spend limit exceeded",
        "error",
        "failed",
    ]

    if "ok" in line and not any(marker in line for marker in bad_markers):
        return True

    return False

def probe_health(agent: str) -> bool:
    now = time.time()
    cache = load_cache()

    entry = cache.get(agent)
    if entry and (now - entry.get("ts", 0) < CACHE_TTL):
        return bool(entry.get("healthy", False))

    status = get_status(agent)
    healthy = model_ok(status, MODEL_BY_AGENT[agent])

    cache[agent] = {
        "healthy": healthy,
        "ts": now
    }
    save_cache(cache)
    return healthy

def codex_healthy() -> bool:
    return probe_health(CODEX_AGENT)

def deepseek_healthy() -> bool:
    return probe_health(DEEPSEEK_AGENT)

def classify(task: str) -> str:
    t = task.lower()

    if any(k in t for k in CRITICAL_KEYWORDS):
        return "critical_code"

    if any(k in t for k in SIMPLE_CODE_KEYWORDS):
        return "simple_code"

    if any(k in t for k in CODING_TERMS):
        return "code"

    return "reasoning"


def preferred_agent_for_kind(kind: str) -> str:
    if kind == "reasoning":
        return STEPFUN_AGENT
    if kind == "simple_code":
        return DEEPSEEK_AGENT
    if kind == "critical_code":
        return CODEX_AGENT
    if kind == "code":
        return DEEPSEEK_AGENT
    return STEPFUN_AGENT

def choose_agent(task: str) -> tuple[str, str, str, str]:
    kind = classify(task)
    preferred_agent = preferred_agent_for_kind(kind)

    if kind == "reasoning":
        return preferred_agent, STEPFUN_AGENT, "reasoning/planning -> StepFun", kind

    if kind == "simple_code":
        if deepseek_healthy():
            return preferred_agent, DEEPSEEK_AGENT, "simple code -> DeepSeek", kind
        return preferred_agent, STEPFUN_AGENT, "DeepSeek unavailable -> StepFun", kind

    if kind == "critical_code":
        if codex_healthy():
            return preferred_agent, CODEX_AGENT, "critical code and Codex healthy -> Codex", kind
        if deepseek_healthy():
            return preferred_agent, DEEPSEEK_AGENT, "Codex unavailable -> DeepSeek", kind
        return preferred_agent, STEPFUN_AGENT, "Codex and DeepSeek unavailable -> StepFun", kind

    if kind == "code":
        if deepseek_healthy():
            return preferred_agent, DEEPSEEK_AGENT, "general code -> DeepSeek", kind
        if codex_healthy():
            return preferred_agent, CODEX_AGENT, "DeepSeek unavailable -> Codex", kind
        return preferred_agent, STEPFUN_AGENT, "DeepSeek and Codex unavailable -> StepFun", kind

    return preferred_agent, STEPFUN_AGENT, "default -> StepFun", kind

if __name__ == "__main__":
    task = " ".join(sys.argv[1:]).strip()
    preferred_agent, agent, reason, kind = choose_agent(task)
    log_decision(task, preferred_agent, agent, reason, kind)

    print(json.dumps({
        "agent": agent,
        "reason": reason,
        "preferred_agent": preferred_agent,
        "used_fallback": preferred_agent != agent
    }))
