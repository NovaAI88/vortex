from pathlib import Path
import json
from collections import defaultdict

HISTORY = Path("ai/router/router-history.jsonl")

MIN_SAMPLES = 3
FALLBACK_PENALTY = 0.15
VALID_SUCCESS_RESULTS = {"success"}
VALID_FAILURE_RESULTS = {"model_failure", "timeout", "canceled"}

preferred_total = defaultdict(int)
preferred_success = defaultdict(int)
actual_total = defaultdict(int)
actual_success = defaultdict(int)
fallback_count = defaultdict(int)

if HISTORY.exists():
    with HISTORY.open("r", encoding="utf-8") as f:
        for raw in f:
            raw = raw.strip()
            if not raw:
                continue
            try:
                row = json.loads(raw)
            except Exception:
                continue

            kind = row.get("kind")
            preferred = row.get("preferred_agent")
            actual = row.get("actual_agent") or row.get("agent")
            used_fallback = row.get("used_fallback", False)

            if kind and preferred:
                preferred_total[(kind, preferred)] += 1
            if kind and actual:
                actual_total[(kind, actual)] += 1
            if kind and used_fallback and preferred:
                fallback_count[(kind, preferred)] += 1

            result = row.get("result")
            if kind and preferred and result in VALID_SUCCESS_RESULTS:
                preferred_success[(kind, preferred)] += 1
            if kind and actual and result in VALID_SUCCESS_RESULTS:
                actual_success[(kind, actual)] += 1

all_keys = sorted(set(list(preferred_total.keys()) + list(actual_total.keys())))

print("\n=== Router Confidence ===\n")

for kind, agent in all_keys:
    p_total = preferred_total[(kind, agent)]
    p_success = preferred_success[(kind, agent)]
    a_total = actual_total[(kind, agent)]
    a_success = actual_success[(kind, agent)]
    f_count = fallback_count[(kind, agent)]

    preferred_rate = (p_success / p_total) if p_total else 0.0
    actual_rate = (a_success / a_total) if a_total else 0.0

    if p_total < MIN_SAMPLES:
        confidence = 0.50
        label = "cold-start"
    else:
        confidence = preferred_rate - (f_count / p_total * FALLBACK_PENALTY)
        confidence = max(0.0, min(1.0, confidence))

        if confidence >= 0.85:
            label = "high"
        elif confidence >= 0.65:
            label = "medium"
        else:
            label = "low"

    print(f"Kind: {kind}")
    print(f"  Agent              : {agent}")
    print(f"  preferred samples  : {p_total}")
    print(f"  preferred success  : {p_success}")
    print(f"  preferred rate     : {preferred_rate*100:.1f}%")
    print(f"  actual samples     : {a_total}")
    print(f"  actual success     : {actual_rate*100:.1f}%")
    print(f"  fallback count     : {f_count}")
    print(f"  confidence         : {confidence:.2f} ({label})")
    print()
