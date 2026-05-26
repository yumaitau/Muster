import { describe, expect, it } from "vitest";
import { z } from "zod";
import { proposeRunAction } from "@muster/core";
import { defineCapability } from "@muster/connector-sdk";

describe("approval action lifecycle", () => {
  it("queues write actions that require approval", async () => {
    const inserts: Array<{ table: string; values: Record<string, unknown> }> = [];
    const fakeDb = {
      insert(table: { [key: symbol]: unknown }) {
        const tableName = String(table[Symbol.for("drizzle:Name")] ?? "");
        return {
          values(value: Record<string, unknown>) {
            inserts.push({ table: tableName, values: value });
            return {
              returning() {
                if (tableName === "run_actions") return Promise.resolve([{ id: "action-1", ...value }]);
                if (tableName === "approvals") return Promise.resolve([{ id: "approval-1", ...value }]);
                return Promise.resolve([]);
              }
            };
          }
        };
      },
      update() {
        return { set: () => ({ where: () => Promise.resolve() }) };
      }
    };

    const capability = defineCapability({
      id: "provider.write",
      name: "Write",
      kind: "write",
      autonomyFloor: 1,
      requiresApproval: true,
      input: z.object({ text: z.string() }),
      output: z.object({ ok: z.boolean() }),
      async execute() {
        return { ok: true };
      }
    });

    const result = await proposeRunAction({
      db: fakeDb as never,
      orgId: "org-1",
      runId: "run-1",
      roleCeiling: 3,
      capability,
      payload: { text: "hello" }
    });

    expect(result.executed).toBe(false);
    expect(inserts.some((insert) => insert.table === "approvals" && insert.values.status === "pending")).toBe(true);
  });
});
