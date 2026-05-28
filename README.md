# Muster

Muster is an open source, self-hosted agent operations platform for clubs and not-for-profits. This repository contains the commercial product slice: setup, connectors, configurable agents, background jobs, approvals, run history, audit logs, finance reports and Docker packaging.

## Run locally

1. Copy `.env.example` to `.env` and fill the secrets.
2. Start the stack:

```bash
docker compose up --build
```

3. Open `http://localhost:3000/setup`, create the first organisation and owner, connect Xero, enable the Finance agent, then use **Queue job**.

The default storage target is MinIO. Model and storage providers are configured by environment variables, so switching from MinIO to S3/R2 or from OpenAI to Ollama does not require code changes.

The Operations screen at `http://localhost:3000/jobs` polls job state every few seconds, showing which agent is queued, running, idle or failed. Manual Finance runs are enqueued through Trigger.dev with a concurrency limit so long-running procedures do not block the web request.

Finance also exposes an inbound email workflow for supplier bills. Configure `MUSTER_INBOUND_EMAIL_DOMAIN` and `MUSTER_INBOUND_EMAIL_SECRET`, then point an email provider webhook at `POST /api/inbound/email` with JSON `{ "raw": "<base64 MIME>", "encoding": "base64", "to": "finance+org-slug@your-domain" }` and `Authorization: Bearer <secret>`. Muster parses PDF attachments, queues a background job, and uploads them to Xero Files so bills sent to the finance person land in Xero without manual forwarding.

The Admin screen includes business automation playbooks that install ready-made operating tasks into the existing task register. The starter library covers weekly finance control, supplier bill intake, customer follow-up, onboarding, campaign launch, event delivery, customer service issues and month-end governance. Playbook tasks are idempotent, dated and tagged in task metadata so teams can adopt common routines without adding schema or connector dependencies.

The Connectors screen also includes an Action API agent for tools that are too custom or too niche for a packaged connector. Provide endpoint notes, method, credentials, a request body template using `{{input.field}}` placeholders, and a small JSON-schema output contract. Muster stores credentials encrypted, routes calls through runs, approvals, artifacts and audit logs, and only executes approval-required actions after an approver confirms them.

## Development

```bash
pnpm install
pnpm db:generate
pnpm typecheck
pnpm test
```

## Architecture

- `@muster/connector-sdk` defines connectors, capabilities, triggers and canonical mappings.
- `@muster/core` owns adapters, registries, encryption, autonomy gates and the run engine.
- `@muster/db` contains Drizzle schema, client and migration configuration.
- `@muster/connector-xero` implements the Xero OAuth connector and `xero.report.balance_sheet`.
- `apps/web` contains the Next.js dashboard, Operations UI, inbound email endpoint and Trigger.dev tasks.
- `docs/connector-authoring` documents the connector SDK contract and a minimal authoring template.

User-facing copy uses Australian spelling. No secrets are committed; all credentials and keys come from environment variables.

## P1 roadmap coverage

The main branch includes foundations for the P1 roadmap: approval lifecycle and queue, agentic tool-loop contracts, invoice draft proposals, canonical messages and delivery records, ClickSend and Meta connectors, Canva and Monday.com connectors, content and task canonical tables, AI chat over read-only canonical data, and CI.
