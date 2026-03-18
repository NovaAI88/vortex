#!/bin/bash
TASK="$*"

RESULT=$(python3 ai/router/nova-router.py "$TASK")
AGENT=$(python3 -c 'import sys, json; print(json.loads(sys.argv[1])["agent"])' "$RESULT")
REASON=$(python3 -c 'import sys, json; print(json.loads(sys.argv[1])["reason"])' "$RESULT")

echo ""
echo "=============================="
echo "[Nova Router]"
echo "Task   : $TASK"
echo "Agent  : $AGENT"
echo "Reason : $REASON"
echo "=============================="
echo ""
echo "Next: send the task with:"
echo "openclaw agent --agent $AGENT --message \"$TASK\""
