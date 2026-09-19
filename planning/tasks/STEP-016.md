# STEP-016 — Docker dev окружение и миграция на Yarn

**Статус:** Выполнено
**Type:** IMPLEMENTATION
**Приоритет:** Высокий
**Фаза:** MVP foundation
**Depends on:** STEP-001

## Requirements

- REQ-011

## ADR

- не требуется

## Risk flags

- external-integration

## Goal

Сделать воспроизводимый Docker-based dev workflow для Nx workspace и перевести управление зависимостями с npm на актуальный Yarn.

## Context

STEP-001 создал Nx workspace с двумя независимо запускаемыми приложениями и зафиксировал npm-based local setup. Для единообразной разработки нужен контейнерный запуск с актуальной совместимой версией Node.js, сохранением исходников на хосте и короткими командами запуска/остановки.

## Scope

- Dockerfile и Docker Compose configuration для dev окружения workspace.
- Root scripts `start.sh` и `stop.sh` для штатного запуска и остановки окружения.
- Bind mount исходников в контейнер и отдельные volumes для зависимостей и необходимых development caches.
- Выбор и фиксация максимально уместной поддерживаемой версии Node.js для образа после проверки совместимости Nx и Yarn.
- Миграция root manifests, lockfile, документации и команд с npm на актуальный Yarn через Corepack.

## Mutation policy

### Allowed

- Изменение package-manager metadata, lockfile, Docker/dev configuration и development documentation.
- Добавление только тех scripts и ignore rules, которые нужны Docker-based workflow.

### Conditional

- Обновить Node.js и Yarn только до версий, подтверждённо совместимых с фактическими Nx dependencies и Docker image.
- Изменить Nx serve configuration только если это необходимо для доступности development services из контейнера и документировано проверкой.

### Forbidden

- Изменение продуктовой логики React UI или local-service.
- Добавление production image, deployment, registry publication, CI/CD или внешних инфраструктурных сервисов.

## Out of scope

- Реализация `ClientApi`, transport и runtime adapters.
- Production containerization и orchestration вне локального development workflow.
- Изменение архитектурной границы UI и local-service из ADR-002.

## Acceptance criteria

- В репозитории есть Dockerfile и Docker Compose configuration, воспроизводимо поднимающие dev окружение обоих приложений с зафиксированной совместимой версией Node.js.
- `./start.sh` запускает dev окружение, а `./stop.sh` штатно останавливает его без удаления исходников или named volumes.
- Изменения исходников на хосте доступны процессам в контейнере через bind mount; установленные зависимости и development caches не записываются в рабочее дерево хоста.
- Root package-manager contract и lockfile используют актуальный Yarn; documented setup и Nx commands не требуют npm.
- `docs/development.md` описывает фактические prerequisites, запуск, остановку, доступные services и ограничения Docker workflow.

## Verification

- Проверить Dockerfile и Compose configuration средствами Docker Compose config validation.
- Выполнить чистую установку Yarn с immutable lockfile в контейнере.
- Поднять окружение через `./start.sh`, проверить доступность и live reload обоих development processes после изменения примонтированного исходника.
- Остановить окружение через `./stop.sh` и проверить, что named volumes сохранены.
- Запустить реальные Nx typecheck, lint, test и build targets через Yarn в контейнере.

## Deliverables

- Dockerfile, Docker Compose configuration, `start.sh`, `stop.sh` и связанные ignore/configuration files.
- Yarn package-manager metadata и актуальный lockfile.
- Обновлённый `docs/development.md` с Docker-first development workflow.

## Implementation plan

**Plan status:** Ready
**Plan revision:** 1
**Plan basis:** sha256:9677dc41d5118ba58d12458c64750078d2b011ab766f8b6addb20e7aecbedd98
**Planned at:** 2026-09-19T10:57:38+00:00

1. Сверить перед mutation актуальную LTS-ветку Node.js, текущий stable Yarn и их совместимость с фактическими Nx 23 dependencies. Зафиксировать точные версии в `packageManager`, `engines`, Docker base image и Yarn metadata; не использовать Node Current только из-за большего номера. Проверить состояние npm lockfile, чтобы удалить его только после успешного создания эквивалентного Yarn lockfile.
2. Мигрировать root package-manager contract на Yarn через Corepack: создать `.yarnrc.yml` с `nodeLinker: node-modules` для совместимости текущего Nx workspace, сгенерировать committed Yarn release/metadata и `yarn.lock`, удалить npm-only lockfile. Добавить root scripts для одинакового запуска Nx targets через Yarn, если они необходимы Docker workflow; не менять manifests приложений и dependency graph без вызванной миграцией необходимости.
3. Создать development-only Dockerfile на зафиксированном Node LTS. В образе включить Corepack, подготовить workspace directory и не включать application source, secrets либо production deployment stages: source поступает исключительно через runtime bind mount.
4. Добавить Compose service для одновременного наблюдаемого запуска `web` и `local-service` через Nx. Примонтировать repository root как bind mount в рабочий каталог, а `node_modules`, Yarn cache и Nx cache — как отдельные named volumes. Опубликовать порт Vite, изменить только Vite dev-server host с loopback на container-reachable address, а для cross-platform file watching использовать documented environment setting при доказанной необходимости. Не создавать HTTP endpoint для `local-service`: до STEP-002 у него есть только process boundary.
5. Добавить root `start.sh` и `stop.sh` с безопасной shell semantics. `start.sh` должен валидировать наличие Docker Compose и запускать build/dependency install/dev service через Compose; `stop.sh` должен останавливать containers без `--volumes`, поэтому source и named caches остаются сохранёнными. Задокументировать idempotent usage и способ полного очистки volumes как отдельную явную ручную команду, не скрывая его в скрипте.
6. Переписать `docs/development.md` по фактической конфигурации: prerequisites, `./start.sh`/`./stop.sh`, адрес web UI, значение процесса `local-service` до появления transport, запуск разовых Yarn/Nx checks в контейнере, cache lifecycle и Docker-specific ограничения. Удалить npm commands и устаревший Node 22 prerequisite.
7. Проверить статическую конфигурацию (`docker compose config`, shell syntax, Yarn immutable install) и runtime path: с чистыми named volumes поднять `./start.sh`, проверить оба Nx processes и доступность Vite по опубликованному порту, изменить примонтированный source и подтвердить rebuild/HMR, затем выполнить `./stop.sh` и убедиться, что Compose volumes не удалены. Последовательно запустить `typecheck`, `lint`, `test` и `build` через Yarn в container context; дополнительно выполнить Harness validation и `git diff --check`.

### Совместимость, риски и rollback

- Node.js Current не равен наиболее уместной версией: baseline — последняя доступная LTS, если реальный Yarn/Nx install не покажет несовместимость. При такой несовместимости план должен фиксировать конкретный blocker, а не silently downgrade-ить runtime.
- Bind mount намеренно передаёт host source в контейнер; named volumes маскируют `node_modules` и caches, чтобы контейнерные artefacts не меняли рабочее дерево. `stop.sh` не удаляет volumes, поэтому rollback dev state выполняется только явной командой пользователя.
- Yarn PnP не входит в scope: Nx рекомендует `node-modules` linker как backward-compatible default. Migration rollback — восстановление npm metadata/lockfile в одном обратимом diff до commit; Docker containers/volumes не являются source of truth package graph.

## Evidence

- `corepack yarn install --immutable` — exit code 0; Yarn 4.18.0 подтвердил lockfile. Yarn сообщил только о peer-dependency warnings, не прерывающих install.
- `docker compose config --quiet` — exit code 0; Compose configuration валидна.
- `./start.sh` — exit code 0; development image на Node.js `v24.21.0` собран, Compose service `dev` запущен.
- `docker compose exec -T dev node --version` и `docker compose exec -T dev corepack yarn --version` — exit code 0; внутри контейнера использованы Node.js `v24.21.0` и Yarn `4.18.0`.
- `curl --fail --silent --show-error http://127.0.0.1:4200/` — exit code 0; Vite доступен через опубликованный порт.
- Временное изменение `apps/web/src/main.tsx` прочитано через host Vite URL и в контейнере; Vite log зафиксировал `page reload src/main.tsx`. Пробная правка удалена до завершения STEP.
- `docker compose exec -T dev corepack yarn typecheck`, `lint`, `test` и `build` — exit code 0; Nx targets обоих приложений прошли в container context.
- `./stop.sh` — exit code 0; service и network остановлены без удаления volumes. `docker volume inspect` подтвердил сохранение `node_modules`, `yarn-cache` и `nx-cache`.
- `sh -n start.sh stop.sh`, `git diff --check` и `python3 tools/harness/validate.py --mode manual` — exit code 0.
- После `docker compose ... down --volumes --remove-orphans` были удалены только named volumes STEP-016; `cd /tmp && COMPOSE_FILE=/tmp/untrusted-compose.yaml ./start.sh` — exit code 0. Скрипт проигнорировал caller CWD и внешний `COMPOSE_FILE`, создал чистые volumes и запустил repository `compose.yaml`.
- В чистом container запуске `corepack yarn install --immutable` из `dev` service — exit code 0; после install файл `.yarn/install-state.gz` отсутствует в host checkout, потому что состояние Yarn хранится в `yarn-state` named volume.
- `docker compose exec -T dev sh -c 'id -u; id -g; ...'` — exit code 0; development process использует UID/GID `1000/1000` и имеет write access только к необходимым source/volume paths. Новые `apps/web/dist` и `apps/local-service/dist` созданы с ownership `1000:1000`.
- `docker compose exec -T dev corepack yarn nx run local-service:prune-lockfile --skip-nx-cache` — exit code 0; сформирован `apps/local-service/dist/yarn.lock`.
- Временные host изменения `apps/web/src/main.tsx` и `apps/local-service/src/main.ts` вызвали Vite `page reload src/main.tsx`, новый `local-service bootstrap` и новый node debugger session в Compose logs; пробные правки удалены.
- `docker compose run --rm --no-deps dev sh -c 'corepack yarn typecheck && corepack yarn lint && corepack yarn test && corepack yarn build'` — typecheck, lint и test завершились с exit code 0. После устранения ownership устаревших ignored output отдельный `docker compose run --rm --no-deps dev corepack yarn build` — exit code 0; build обоих приложений прошёл как непривилегированный user.
- `cd /tmp && COMPOSE_FILE=/tmp/untrusted-compose.yaml COMPOSE_PROJECT_NAME=foreign-project ./start.sh` — exit code 0; scripts использовали фиксированные repository compose file и project name `ai-development-harness-client-dev`.
- В final configuration `docker compose exec -T dev corepack yarn config get cacheFolder` — exit code 0; effective cache path равен `/yarn-cache`. Попытки записи из `dev` в `/workspace/.step016-write-probe` и `/workspace/.git/step016-write-probe` завершились EROFS, при этом `.generated`, `.test-output` и `tmp` доступны на запись как named volumes.
- `docker compose run --rm --no-deps dev sh -c 'corepack yarn nx reset && corepack yarn nx run local-service:prune-lockfile && rm -f .generated/local-service/yarn.lock && corepack yarn nx run local-service:prune-lockfile && test -f .generated/local-service/yarn.lock'` — exit code 0; второй run получил `2/2` local cache hits и восстановил удалённый Yarn lockfile.
- После final `./stop.sh` `docker volume inspect` — exit code 0; сохранены named volumes `node_modules`, `yarn-cache`, `yarn-state`, `nx-cache`, `generated`, `test-output` и `tmp-work`.

## Review status

**Latest verdict:** PASS
**Latest report:** `planning/reviews/STEP-016/REVIEW-2026-09-19T11-34-00Z.md`

## Blocker / Failure reason

—
