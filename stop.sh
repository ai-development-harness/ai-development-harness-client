#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -P -- "$(dirname -- "$0")" && pwd)
unset COMPOSE_FILE
unset COMPOSE_PROJECT_NAME

if ! docker compose version >/dev/null 2>&1; then
  echo "Требуется Docker Compose v2." >&2
  exit 1
fi

# Не передаём --volumes: dependencies и caches сохраняются для следующего запуска.
exec docker compose --project-name ai-development-harness-client-dev --project-directory "$SCRIPT_DIR" -f "$SCRIPT_DIR/compose.yaml" down --remove-orphans
