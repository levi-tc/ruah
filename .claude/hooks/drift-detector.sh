#!/usr/bin/env bash
# drift-detector.sh — Verify critical project files still exist
# Triggered on PreToolUse to catch accidental deletions early

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MISSING=()

# Core project files
[ -f "$ROOT/package.json" ] || MISSING+=("package.json")
[ -f "$ROOT/src/cli.js" ] || MISSING+=("src/cli.js")
[ -f "$ROOT/README.md" ] || MISSING+=("README.md")

# Governance
[ -f "$ROOT/.claude/governance.md" ] || MISSING+=(".claude/governance.md")

# Test directory
[ -d "$ROOT/test" ] || MISSING+=("test/")

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "DRIFT DETECTED — missing files:"
  for f in "${MISSING[@]}"; do
    echo "  - $f"
  done
  exit 1
fi

exit 0
