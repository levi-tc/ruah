# Governance — ruah
# This file defines YOUR rules. The universal skills read it and adapt.
# Change this when your standards change. The skills never go stale.

## Identity
- Project: @levi-tc/ruah
- Description: Multi-agent orchestration CLI. Workspace isolation, DAG scheduling, file locking, merge coordination.

## Gates (run in order, stop on failure)
### Lint & Format
- npx @biomejs/biome check --write .
- npx @biomejs/biome check .

### Test
- node --test test/*.test.js

## Branch Strategy
- Trunk-based development on main
- Conventional commits (feat:, fix:, docs:, refactor:, test:, chore:)
- Commit trailer: Co-Authored-By: Claude <noreply@anthropic.com>

## Security Requirements
- Auth: none (pure local CLI)
- No hardcoded secrets — grep for sk_live, AKIA, password= before commit
- No eval() or Function() constructor usage
- No shell injection — all spawned commands must use array form (not string concatenation)

## Autonomy
- Auto-commit after gates pass

## Deployment
- Target: npm publish (@levi-tc/ruah)
- CI: GitHub Actions (gates.yml, pr-check.yml, release.yml)
- Strategy: npm version patch/minor/major → git push --tags → auto-publish

## Conventions
- Node.js ESM (type: module)
- Zero runtime dependencies preferred (dev deps okay)
- node --test for testing (Node.js built-in test runner)
- Biome for lint + format
- All source in src/, all tests in test/
