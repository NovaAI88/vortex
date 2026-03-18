#!/bin/bash
TASK="$*"
RESULT=$(python3 ai/router/nova-router.py "$TASK")
MODEL=$(python3 -c 'import sys, json; print(json.loads(sys.argv[1])["model"])' "$RESULT")
REASON=$(python3 -c 'import sys, json; print(json.loads(sys.argv[1])["reason"])' "$RESULT")

echo "[Nova Router] Using $MODEL — $REASON"
openclaw models set "$MODEL"
