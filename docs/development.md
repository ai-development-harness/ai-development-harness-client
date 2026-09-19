# Development

Nx workspace содержит два независимых приложения: React UI (`web`) и local Node service (`local-service`). Их связь намеренно не задана: transport и `ClientApi` принадлежат STEP-002.

## Prerequisites

- Docker Engine с Docker Compose v2;
- POSIX-compatible shell для `start.sh` и `stop.sh`;
- Node.js 24.21.0 LTS при локальном запуске команд вне контейнера. Версия Yarn фиксируется в root `packageManager` и включается через Corepack.

## Docker dev environment

```bash
./start.sh
```

Команда собирает development image, подготавливает Docker-managed volumes через одноразовый service `init`, затем поднимает `dev`. Immutable Yarn install, `node_modules`, Yarn install state/cache, Nx cache, build outputs в `.generated/` и test outputs в `.test-output/` остаются в named volumes. Исходники подключаются через read-only bind mount: изменения на host видны watcher-ам, но container не может изменять tracked files или `.git`. Development process работает как непривилегированный user, а Vite порт опубликован только на loopback host.

Web UI доступен на `http://localhost:4200`. `local-service` пока не предоставляет HTTP endpoint: его запущенный process подтверждает только local application boundary из ADR-002; transport появится в STEP-002.

Остановить environment:

```bash
./stop.sh
```

`stop.sh` не удаляет named volumes `node_modules`, Yarn install state/cache, Nx cache и generated outputs. Для полной очистки development state выполните явно `docker compose down --volumes`; эта команда удалит caches, generated outputs и потребует новой установки dependencies при следующем запуске.

## Development commands

```bash
docker compose logs --follow dev
docker compose exec dev corepack yarn nx show projects
```

Внутри уже запущенного `dev` service serve targets запускаются автоматически. Не запускайте их повторно через `docker compose exec`: второй Vite process не сможет занять порт `4200`.

## Testing

```bash
docker compose exec dev corepack yarn test
```

## Lint / formatting / type checking

```bash
docker compose exec dev corepack yarn lint
docker compose exec dev corepack yarn typecheck
```

## Build

```bash
docker compose exec dev corepack yarn build
```

## Environment / configuration

Docker Compose устанавливает зависимости и хранит caches и generated outputs во внутренних named volumes. Они не попадают в working tree host. Для live reload изменяйте files в checkout; `/workspace` намеренно read-only внутри `dev` service.

## Database / migrations

Не применимо для foundation.

## CI/CD

Project-specific CI ещё не добавлен. Harness Integrity CI является отдельной проверкой protocol layer.

## Git и CI

Repository Git workflow задаётся `docs/harness/GIT_WORKFLOW.md` и `.project/git-policy.toml`. Harness Integrity CI является baseline; project-specific CI добавляется после определения фактического stack/tooling.
