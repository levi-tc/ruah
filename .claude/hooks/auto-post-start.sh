#!/usr/bin/env bash
# auto-post-start.sh — Gate enforcement safety net
# Reads tool input from stdin. If the command is a git commit,
# warns if .claude/.gates-passed sentinel doesn't exist.
# Non-blocking — warns but does not prevent.

INPUT=$(cat)
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Check if this is a git commit command
if echo "$INPUT" | grep -q '"command"' && echo "$INPUT" | grep -q 'git commit'; then
  if [ ! -f "$ROOT/.claude/.gates-passed" ]; then
    echo "WARNING: Committing without running gates. Run /post-start-validation first."
    echo "Gates sentinel (.claude/.gates-passed) not found."
  fi
fi

exit 0
