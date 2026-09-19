# Глоссарий продукта

- **ClientApi** — граница между React UI и transport/application service.
- **Runtime adapter** — адаптер Codex или Claude Code, приводящий программный runtime surface к общему client contract.
- **Repository projection** — read model, полученная из реальных файлов, Git и deterministic Harness output.
- **Execution Run** — UI projection над Harness Execution Status, runtime event stream и repository projections.
- **Activity / Runs** — будущая client-owned observability/analytics возможность; не заменяет Execution Status.
- **Explicit runtime selection** — обязательный явный выбор runtime без automatic fallback.

Термины Harness protocol определены в [docs/harness/GLOSSARY.md](harness/GLOSSARY.md) и здесь не дублируются.
