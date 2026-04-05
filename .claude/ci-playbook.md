# CI Playbook — ruah

CI is not yet configured. When ready, use this template.

## GitHub Actions (recommended)

### Workflow: `.github/workflows/ci.yml`
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npx @biomejs/biome check .

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: node --test test/*.test.js

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm audit || true
```

## Gate Order
1. Biome check (lint + format)
2. Tests (node --test)
3. Security (npm audit)

## Deployment
- `npm version patch/minor/major`
- `npm publish --access public`
