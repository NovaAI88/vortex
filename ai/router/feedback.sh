#!/bin/bash

TASK="$1"
PREFERRED_AGENT="$2"
ACTUAL_AGENT="$3"
RESULT="$4"
DETAIL="${5:-}"

if [ "$RESULT" = "success" ]; then
  SUCCESS_PY="True"
else
  SUCCESS_PY="False"
fi

if [ "$PREFERRED_AGENT" = "$ACTUAL_AGENT" ]; then
  USED_FALLBACK_PY="False"
else
  USED_FALLBACK_PY="True"
fi

python3 - <<PY
from pathlib import Path
import json, time

path = Path("ai/router/router-history.jsonl")
path.parent.mkdir(parents=True, exist_ok=True)

entry = {
    "ts": time.time(),
    "task": """$TASK""",
    "preferred_agent": "$PREFERRED_AGENT",
    "actual_agent": "$ACTUAL_AGENT",
    "agent": "$ACTUAL_AGENT",
    "used_fallback": $USED_FALLBACK_PY,
    "success": $SUCCESS_PY,
    "result": "$RESULT",
    "detail": """$DETAIL"""
}

with path.open("a", encoding="utf-8") as f:
    f.write(json.dumps(entry) + "\n")

print("✅ feedback logged")
PY
