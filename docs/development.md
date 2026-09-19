# Development

Nx workspace содержит два независимых приложения: React UI (`web`) и local Node service (`local-service`). Их связь намеренно не задана: transport и `ClientApi` принадлежат STEP-002.

## Prerequisites

- Node.js 22.16.0 или совместимая поддерживаемая LTS-версия;
- npm 10.9.2 или совместимая версия.

## Local setup

```bash
npm ci --legacy-peer-deps
```

Опция `--legacy-peer-deps` повторяет разрешение зависимостей, использованное для зафиксированного lockfile foundation.

## Development commands

```bash
npx nx show projects
npx nx run web:serve
npx nx run local-service:serve
```

## Testing

```bash
npx nx run-many --target=test --projects=web,local-service --parallel=1
```

## Lint / formatting / type checking

```bash
npx nx run-many --target=lint --projects=web,local-service --parallel=1
npx nx run-many --target=typecheck --projects=web,local-service --parallel=1
```

## Build

```bash
npx nx run-many --target=build --projects=web,local-service --parallel=1
```

## Environment / configuration

TBD

## Database / migrations

Не применимо для foundation.

## CI/CD

Project-specific CI ещё не добавлен. Harness Integrity CI является отдельной проверкой protocol layer.

## Git и CI

Repository Git workflow задаётся `docs/harness/GIT_WORKFLOW.md` и `.project/git-policy.toml`. Harness Integrity CI является baseline; project-specific CI добавляется после определения фактического stack/tooling.
