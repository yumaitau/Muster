import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineCapability, defineConnector } from "@muster/connector-sdk";

describe("connector SDK", () => {
  it("declares typed connector capabilities and rejects duplicate ids", () => {
    const capability = defineCapability({
      id: "example.read",
      name: "Read example",
      kind: "read",
      autonomyFloor: 0,
      requiresApproval: false,
      input: z.object({ id: z.string() }),
      output: z.object({ ok: z.boolean() }),
      async execute(_ctx, input) {
        return { ok: input.id.length > 0 };
      }
    });

    const connector = defineConnector({
      id: "example",
      name: "Example",
      description: "Contract test connector.",
      auth: { type: "apiKey", label: "API key" },
      capabilities: [capability],
      async testConnection() {
        return true;
      }
    });

    expect(connector.capabilities[0]?.input.parse({ id: "abc" })).toEqual({ id: "abc" });
    expect(() => defineConnector({ ...connector, capabilities: [capability, capability] })).toThrow("Duplicate capability id");
  });
});
