# Workflow: example-feature

## Config
- base: main
- parallel: true

## Tasks

### backend-api
- files: src/api/**, src/models/**
- executor: claude-code
- depends: []
- prompt: |
    Implement the backend API endpoints.
    Follow existing patterns in the codebase.

### frontend-ui
- files: src/components/**, src/pages/**
- executor: claude-code
- depends: []
- prompt: |
    Build the frontend UI components.
    Use existing design system components.

### integration-tests
- files: tests/**
- executor: claude-code
- depends: [backend-api, frontend-ui]
- prompt: |
    Write integration tests for the new feature.
    Cover both API and UI interactions.
