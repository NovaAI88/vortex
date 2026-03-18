from pathlib import Path
import json
from collections import defaultdict

HISTORY = Path("ai/router/router-history.jsonl")

VALID_SUCCESS_RESULTS = {"success"}
VALID_FAILURE_RESULTS = {"model_failure", "timeout", "canceled"}

preferred_counts = defaultdict(int)
actual_counts = defaultdict(int)
fallback_counts = defaultdict(int)

preferred_success = defaultdict(int)
preferred_failure = defaultdict(int)
actual_success = defaultdict(int)
actual_failure = defaultdict(int)

kind_counts = defaultdict(int)

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

            if "kind" in row:
                preferred = row.get("preferred_agent") or row.get("agent")
                actual = row.get("actual_agent") or row.get("agent")
                kind = row.get("kind", "unknown")
                used_fallback = row.get("used_fallback", False)

                if preferred:
                    preferred_counts[preferred] += 1
                    kind_counts[(preferred, kind)] += 1
                if actual:
                    actual_counts[actual] += 1
                if used_fallback and preferred:
                    fallback_counts[preferred] += 1

            if "result" in row:
                preferred = row.get("preferred_agent")
                actual = row.get("actual_agent") or row.get("agent")
                result = row.get("result")

                if result in VALID_SUCCESS_RESULTS:
                    if preferred:
                        preferred_success[preferred] += 1
                    if actual:
                        actual_success[actual] += 1
                elif result in VALID_FAILURE_RESULTS:
                    if preferred:
                        preferred_failure[preferred] += 1
                    if actual:
                        actual_failure[actual] += 1

agents = sorted(set(
    list(preferred_counts.keys()) +
    list(actual_counts.keys()) +
    list(preferred_success.keys()) +
    list(preferred_failure.keys()) +
    list(actual_success.keys()) +
    list(actual_failure.keys())
))

print("\n=== Router Stats ===\n")

for agent in agents:
    pref = preferred_counts[agent]
    act = actual_counts[agent]
    fb = fallback_counts[agent]

    pref_total = preferred_success[agent] + preferred_failure[agent]
    act_total = actual_success[agent] + actual_failure[agent]

    pref_rate = (preferred_success[agent] / pref_total * 100) if pref_total else 0.0
    act_rate = (actual_success[agent] / act_total * 100) if act_total else 0.0

    print(f"Agent: {agent}")
    print(f"  preferred count        : {pref}")
    print(f"  actual used count      : {act}")
    print(f"  fallback away count    : {fb}")
    print(f"  preferred success      : {preferred_success[agent]}")
    print(f"  preferred failure      : {preferred_failure[agent]}")
    print(f"  preferred success rate : {pref_rate:.1f}%")
    print(f"  actual success         : {actual_success[agent]}")
    print(f"  actual failure         : {actual_failure[agent]}")
    print(f"  actual success rate    : {act_rate:.1f}%")

    kinds = [(k[1], v) for k, v in kind_counts.items() if k[0] == agent]
    if kinds:
        print("  kinds:")
        for kind, count in sorted(kinds):
            print(f"    - {kind}: {count}")
    print()
