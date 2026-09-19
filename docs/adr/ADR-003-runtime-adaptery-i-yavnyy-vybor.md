# ADR-003 — Runtime adapters и явный выбор

**Status:** Accepted
**Date:** 2026-09-19
**Deciders:** Команда проекта
**Supersedes:** —
**Superseded by:** —

## Context

MVP поддерживает Codex и Claude Code, а runtime output и interactive capabilities отличаются.

## Problem

Нужно избежать скрытого выбора runtime и ненадёжной automation terminal UI.

## Decision

Codex App Server и Claude Agent SDK — first-class programmable integration surfaces. После открытия/переключения проекта runtime равен `none` до выбора пользователя; ошибки не запускают другой adapter автоматически. Каждый run фиксирует runtime context.

## Alternatives considered

Automatic fallback скрывает executor, а PTY/stdout scraping не даёт устойчивую structured semantics.

## Consequences

Adapters публикуют capability model и нормализуют только достоверные events.

## Security implications

Permission/input requests передаются структурированными events; terminal control sequences не получают контроля над UI.

## Data / migration implications

Local-only runtime binding не становится canonical Harness state или Activity store.

## Compatibility / operational implications

Новые runtimes можно добавлять через тот же adapter contract.

## Traceability

- REQ: REQ-003, REQ-012, REQ-013
- STEP: STEP-004, STEP-005, STEP-011
