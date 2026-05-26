# Muster

Muster is an open source, self-hosted platform for automating back-office work for clubs and not-for-profits. This repository contains the MVP vertical slice: setup, Xero connection, a Finance role, a weekly balance sheet narrative, run history, audit logs and Docker packaging.

## Run locally

1. Copy `.env.example` to `.env` and fill the secrets.
2. Start the stack:

```bash
docker compose up --build
```

3. Open `http://localhost:3000/setup`, create the first organisation and owner, connect Xero, enable the Finance role, then use **Run now**.

The default storage target is MinIO. Model and storage providers are configured by environment variables, so switching from MinIO to S3/R2 or from OpenAI to Ollama does not require code changes.

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
- `apps/web` contains the Next.js dashboard and Trigger.dev tasks.
- `docs/connector-authoring` documents the connector SDK contract and a minimal authoring template.

User-facing copy uses Australian spelling. No secrets are committed; all credentials and keys come from environment variables.

## P1 roadmap coverage

The main branch includes foundations for the P1 roadmap: approval lifecycle and queue, agentic tool-loop contracts, invoice draft proposals, canonical messages and delivery records, ClickSend and Meta connectors, Canva and Monday.com connectors, content and task canonical tables, AI chat over read-only canonical data, and CI.
