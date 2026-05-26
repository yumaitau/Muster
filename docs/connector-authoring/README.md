# Connector authoring

Connectors are small packages that declare auth, typed capabilities, optional triggers and canonical mappings. They never store credentials. Muster decrypts connection credentials and passes them into `ConnectorContext` at execution time.

## Minimal connector

```ts
import { defineCapability, defineConnector } from "@muster/connector-sdk";
import { z } from "zod";

const ping = defineCapability({
  id: "example.ping",
  name: "Ping example",
  kind: "read",
  autonomyFloor: 0,
  requiresApproval: false,
  input: z.object({}),
  output: z.object({ ok: z.boolean() }),
  async execute(ctx) {
    ctx.logger.info("ping");
    return { ok: true };
  }
});

export const exampleConnector = defineConnector({
  id: "example",
  name: "Example",
  description: "A minimal connector.",
  auth: { type: "apiKey", label: "API key" },
  capabilities: [ping],
  canonicalEntities: [
    { entity: "task", version: "0.1", description: "Optional canonical mapping" }
  ],
  async testConnection() {
    return true;
  }
});
```

## Capability rules

- Use Zod for every input and output schema.
- Mark external mutations as `kind: "write"`.
- Set `requiresApproval: true` for anything that moves money or posts publicly.
- Use `autonomyFloor` to declare the minimum autonomy needed for the capability.
- Keep provider-specific data in the connector output, then map durable product concepts to canonical tables.

## Canonical mappings

The SDK exposes `canonicalEntities` so connectors can describe how provider data maps into shared Muster entities such as `message`, `message_delivery`, `task`, `campaign`, `content_asset` and `financial_report`. This lets roles use stable data contracts even when provider APIs differ.

## Publishing

`@muster/connector-sdk` is versioned as a workspace package today. Publishing it later should keep the current interfaces backwards compatible and provide a template connector that mirrors the example above.
