# AI_CONTEXT.md

Resumo arquitetural prático do Super Productivity para onboarding e edição rápida.

## 1. Visão geral da arquitetura

- Stack principal: Angular (frontend) + NgRx (estado) + Electron/Capacitor (desktop/mobile).
- Persistência e sync: Operation Log (`src/app/op-log`) com replay/hidratação em startup.
- Estrutura geral:
  - App Angular: `src/app`
  - Pacote de núcleo de sync (reutilizável): `packages/sync-core`
  - Servidor SuperSync: `packages/super-sync-server`

## 2. Módulos principais (frontend)

- Núcleo/app shell:
  - `src/main.ts`
  - `src/app/app.component.ts`
  - `src/app/app.component.html`
  - `src/app/app.routes.ts`
- Estado global:
  - `src/app/root-store/feature-stores.module.ts`
  - `src/app/root-store/meta/meta-reducer-registry.ts`
  - `src/app/root-store/root-state.ts`
- Funcionalidades de domínio:
  - `src/app/features/tasks`
  - `src/app/features/work-context`
  - `src/app/features/project`
  - `src/app/features/tag`
  - `src/app/features/time-tracking`
  - `src/app/features/reminder`
  - `src/app/features/planner`
- UI/core UI:
  - `src/app/core-ui/*`
  - `src/app/ui/*`
- Sync/import/export:
  - `src/app/imex/sync`
  - `src/app/op-log/*`

## 3. UI principal (onde a app "vive")

- Shell raiz: `src/app/app.component.html`
  - Renderiza side nav, header, painel direito, router outlet, add-task bar global.
- Rotas principais:
  - `src/app/app.routes.ts`
  - Página de tarefas por tag (main view): `tag/:id/tasks` -> `TagTaskPageComponent`
- View de trabalho (lista de tarefas, seções, backlog, painéis):
  - `src/app/features/work-view/work-view.component.ts`
  - `src/app/features/tasks/task-list/*`

## 4. Onde ficam as tasks

- Modelo/serviço:
  - `src/app/features/tasks/task.model.ts`
  - `src/app/features/tasks/task.service.ts`
- Store:
  - `src/app/features/tasks/store/task.actions.ts`
  - `src/app/features/tasks/store/task.reducer.ts`
  - `src/app/features/tasks/store/task.selectors.ts`
  - `src/app/features/tasks/store/task-*.effects.ts`
- Ações cross-entity (muito usadas por reducers/meta-reducers):
  - `src/app/root-store/meta/task-shared.actions.ts`
- Regras importantes de consistência em tasks:
  - `ARCHITECTURE-DECISIONS.md` (especialmente dueDay/dueWithTime e TODAY_TAG virtual)

## 5. Onde ficam notificações e lembretes

- Notificação genérica:
  - `src/app/core/notify/notify.service.ts`
- Lembretes de task (web worker):
  - `src/app/features/reminder/reminder.service.ts`
  - `src/app/features/reminder/reminder.worker.ts`
- Efeitos de lembrete de task:
  - `src/app/features/tasks/store/task-reminder.effects.ts`
- Mobile/native notifications:
  - `src/app/features/mobile/store/mobile-notification.effects.ts`
  - `src/app/core/platform/capacitor-reminder.service.ts`
  - `src/app/core/platform/capacitor-notification.service.ts`

## 6. Onde fica sync

- Trigger/orquestração de sync:
  - `src/app/imex/sync/sync-trigger.service.ts`
  - `src/app/imex/sync/sync.effects.ts`
- Engine de sync por op-log:
  - `src/app/op-log/sync/operation-log-sync.service.ts`
  - `src/app/op-log/sync/operation-log-upload.service.ts`
  - `src/app/op-log/sync/operation-log-download.service.ts`
- Providers de sync:
  - `src/app/op-log/sync-providers/*`
  - Manager: `src/app/op-log/sync-providers/provider-manager.service.ts`
- Hidratação na inicialização:
  - `src/app/core/data-init/data-init.service.ts`
  - `src/app/op-log/persistence/operation-log-hydrator.service.ts`

## 7. Fluxo de estado (resumo curto e confiável)

1. UI/Service dispara action NgRx (geralmente em `features/*/service.ts`).
2. Reducers e meta-reducers aplicam mudança no estado.
3. Se a action for persistente (`meta.isPersistent`), ela entra no op-log.
4. `OperationLogEffects` converte action em operação, grava em IndexedDB (`SUP_OPS`) e atualiza vector clock.
5. Sync envia/recebe operações remotas; operações recebidas são aplicadas de volta ao store.
6. No startup, `OperationLogHydratorService` hidrata snapshot + replay de operações pendentes.

Arquivos-chave desse fluxo:

- `src/app/root-store/meta/meta-reducer-registry.ts`
- `src/app/op-log/capture/operation-capture.meta-reducer.ts`
- `src/app/op-log/capture/operation-log.effects.ts`
- `src/app/op-log/apply/operation-applier.service.ts`
- `src/app/op-log/persistence/operation-log-hydrator.service.ts`

## 8. Regras obrigatórias do repo (CLAUDE.md)

- Sempre ler `CLAUDE.md` antes de mexer.
- Em mudanças de estado/sync: revisar `docs/sync-and-op-log/*`.
- Não mutar estado no reducer.
- Em effects, usar `LOCAL_ACTIONS` (não `Actions`) quando for regra do módulo.
- Para alterações em `.ts` / `.scss` modificados: rodar `npm run checkFile <arquivo>`.
- Traduções: alterar apenas `src/assets/i18n/en.json`.

## 9. Como rodar rápido

- Pré-requisito: criar `.env`
  - `cp .env.example .env`
- Frontend web:
  - `npm run startFrontend`
- App desktop (Electron):
  - `npm start`
- Teste unitário:
  - `npm run test:file <arquivo.spec.ts>`
- Lint/format local por arquivo:
  - `npm run checkFile <arquivo.ts|arquivo.scss>`

## 10. Estratégia de edição segura (playbook)

1. Localizar feature em `src/app/features/<modulo>`.
2. Ver se a mudança impacta action persistente/sync.
3. Se impactar múltiplas entidades, preferir meta-reducer em `root-store/meta/task-shared-meta-reducers`.
4. Validar invariantes de scheduling/TODAY_TAG.
5. Rodar `npm run checkFile` nos arquivos alterados.
6. Se alterou lógica de estado, adicionar/ajustar spec junto.

## 11. Referências de arquitetura

- `CLAUDE.md`
- `ARCHITECTURE-DECISIONS.md`
- `docs/sync-and-op-log/operation-log-architecture-diagrams.md`
