#!/bin/bash

TASK="$*"

if [ -z "$TASK" ]; then
  echo 'Usage: ./ai/router/run-task.sh "your task here"'
  exit 1
fi

ROUTER_JSON=$(python3 ai/router/nova-router.py "$TASK")
ROUTER_EXIT=$?

if [ "$ROUTER_EXIT" -ne 0 ] || [ -z "$ROUTER_JSON" ]; then
  echo "❌ router failed before agent execution"
  exit 1
fi

echo "$ROUTER_JSON"

PREFERRED_AGENT=$(python3 -c 'import sys, json; print(json.loads(sys.argv[1])["preferred_agent"])' "$ROUTER_JSON")
ACTUAL_AGENT=$(python3 -c 'import sys, json; print(json.loads(sys.argv[1])["agent"])' "$ROUTER_JSON")
REASON=$(python3 -c 'import sys, json; print(json.loads(sys.argv[1])["reason"])' "$ROUTER_JSON")

echo ""
echo "=============================="
echo "[Nova Router Run]"
echo "Task            : $TASK"
echo "Preferred agent : $PREFERRED_AGENT"
echo "Actual agent    : $ACTUAL_AGENT"
echo "Reason          : $REASON"
echo "=============================="
echo ""

OUTPUT_FILE="ai/router/last-run-output.txt"
: > "$OUTPUT_FILE"

TIMEOUT_CMD=""
if command -v gtimeout >/dev/null 2>&1; then
  TIMEOUT_CMD="gtimeout"
elif command -v timeout >/dev/null 2>&1; then
  TIMEOUT_CMD="timeout"
fi

if [ -n "$TIMEOUT_CMD" ]; then
  $TIMEOUT_CMD 60s openclaw agent --agent "$ACTUAL_AGENT" --message "$TASK" | tee "$OUTPUT_FILE"
  CMD_EXIT=${PIPESTATUS[0]}
else
  openclaw agent --agent "$ACTUAL_AGENT" --message "$TASK" | tee "$OUTPUT_FILE"
  CMD_EXIT=${PIPESTATUS[0]}
fi

RESULT="success"
DETAIL="ok"

if [ ! -s "$OUTPUT_FILE" ]; then
  RESULT="wrapper_failure"
  DETAIL="empty_output"
fi

if [ "$CMD_EXIT" -eq 124 ]; then
  RESULT="timeout"
  DETAIL="agent_timeout"
fi

if [ "$CMD_EXIT" -eq 130 ]; then
  RESULT="canceled"
  DETAIL="manual_interrupt"
fi

if grep -qiE "canceled|cancelled" "$OUTPUT_FILE"; then
  RESULT="canceled"
  DETAIL="agent_canceled"
fi

if grep -qiE "traceback|invalid config|all models failed|provider returned error|timed out|api rate limit reached|rate limit" "$OUTPUT_FILE"; then
  RESULT="model_failure"
  DETAIL="provider_or_model_error"
fi

if grep -qiE "timeout: command not found|gtimeout: command not found" "$OUTPUT_FILE"; then
  RESULT="wrapper_failure"
  DETAIL="missing_timeout_binary"
fi

./ai/router/feedback.sh "$TASK" "$PREFERRED_AGENT" "$ACTUAL_AGENT" "$RESULT" "$DETAIL"

echo ""
echo "Run result: $RESULT"
echo "Detail    : $DETAIL"
echo "Saved output to: $OUTPUT_FILE"
echo ""
