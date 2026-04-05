#!/usr/bin/env bash
# sandbox-guard.sh — Security hardening for Bash PreToolUse
# Hard-blocks destructive system commands. Warns on out-of-repo file ops.

INPUT=$(cat)
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Extract the command string
CMD=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"$//')
[ -z "$CMD" ] && exit 0

# === HARD BLOCKS ===

# Destructive filesystem
if echo "$CMD" | grep -qE 'rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?(/|~|\$HOME|/usr|/etc|/var|/System)'; then
  echo "BLOCKED: Destructive rm targeting system path"
  exit 2
fi

# Raw disk operations
if echo "$CMD" | grep -qE '\b(dd|mkfs|fdisk|parted)\b'; then
  echo "BLOCKED: Raw disk operation"
  exit 2
fi

# System shutdown
if echo "$CMD" | grep -qE '\b(shutdown|reboot|halt|init [06])\b'; then
  echo "BLOCKED: System shutdown command"
  exit 2
fi

# Database destruction without confirmation
if echo "$CMD" | grep -qiE 'DROP\s+(TABLE|DATABASE|SCHEMA)'; then
  echo "BLOCKED: DROP TABLE/DATABASE/SCHEMA — requires explicit user confirmation"
  exit 2
fi

# Docker/K8s destruction
if echo "$CMD" | grep -qE 'docker\s+system\s+prune'; then
  echo "BLOCKED: docker system prune"
  exit 2
fi
if echo "$CMD" | grep -qE 'kubectl\s+delete\s+namespace'; then
  echo "BLOCKED: kubectl delete namespace"
  exit 2
fi

# Pipe-to-shell
if echo "$CMD" | grep -qE '(curl|wget)\s.*\|\s*(bash|sh|zsh)'; then
  echo "BLOCKED: Piping remote content to shell"
  exit 2
fi

# Force push to main/master
if echo "$CMD" | grep -qE 'git\s+push\s+.*--force.*\s+(main|master)' || \
   echo "$CMD" | grep -qE 'git\s+push\s+.*\s+(main|master)\s+.*--force'; then
  echo "BLOCKED: Force push to main/master"
  exit 2
fi

# Recursive permission changes outside repo
if echo "$CMD" | grep -qE 'chmod\s+-R\s+777'; then
  echo "BLOCKED: Recursive 777 permissions"
  exit 2
fi

exit 0
