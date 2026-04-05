#!/usr/bin/env bash
# circuit-breaker.sh — Count consecutive failures and halt if too many
# Prevents infinite retry loops

COUNTER_FILE="${TMPDIR:-/tmp}/.ruah-failures"
MAX_FAILURES=5

# Read tool input from stdin
INPUT=$(cat)

# Check if the input indicates a failure (non-zero exit)
EXIT_CODE=$(echo "$INPUT" | grep -o '"exit_code":[0-9]*' | head -1 | cut -d: -f2)

if [ -n "$EXIT_CODE" ] && [ "$EXIT_CODE" != "0" ]; then
  COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
  COUNT=$((COUNT + 1))
  echo "$COUNT" > "$COUNTER_FILE"

  if [ "$COUNT" -ge "$MAX_FAILURES" ]; then
    echo "CIRCUIT BREAKER: $COUNT consecutive failures. Stop and reassess."
    echo "0" > "$COUNTER_FILE"
    exit 1
  fi
else
  # Reset on success
  echo "0" > "$COUNTER_FILE" 2>/dev/null
fi

exit 0
