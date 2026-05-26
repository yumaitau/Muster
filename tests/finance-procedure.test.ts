import { describe, expect, it } from "vitest";
import { registerConnector, runRoleProcedure, WEEKLY_FINANCE_REPORT_PROCEDURE } from "@muster/core";
import { defineCapability, defineConnector } from "@muster/connector-sdk";
import { z } from "zod";

describe("finance procedure smoke test", () => {
  it("uses the balance sheet capability and writes an artifact", async () => {
    const inserts: Array<{ table: string; values: unknown }> = [];
    const updates: unknown[] = [];
    const fakeDb = {
      select() {
        return {
          from(table: { [key: string]: unknown }) {
            const tableName = String(table[Symbol.for("drizzle:Name") as keyof typeof table] ?? "");
            return {
              where() {
                return this;
              },
              innerJoin() {
                return this;
              },
              orderBy() {
                return this;
              },
              limit() {
                if (tableName === "roles") {
                  return Promise.resolve([{ id: "role-1", orgId: "org-1", autonomyCeiling: 0, name: "Finance" }]);
                }
                if (tableName === "organisations") {
                  return Promise.resolve([{ id: "org-1", name: "Club", slug: "club" }]);
                }
                return Promise.resolve([{ connection: { authData: JSON.stringify({ iv: "", tag: "", data: "" }) } }]);
              }
            };
          }
        };
      },
      insert(table: { [key: string]: unknown }) {
        const tableName = String(table[Symbol.for("drizzle:Name") as keyof typeof table] ?? "");
        return {
          values(value: unknown) {
            inserts.push({ table: tableName, values: value });
            return {
              returning() {
                if (tableName === "runs") {
                  return Promise.resolve([{ id: "run-1" }]);
                }
                if (tableName === "artifacts") {
                  return Promise.resolve([{ id: "artifact-1" }]);
                }
                return Promise.resolve([]);
              }
            };
          }
        };
      },
      update() {
        return {
          set(value: unknown) {
            updates.push(value);
            return { where: () => Promise.resolve() };
          }
        };
      }
    };

    registerConnector(
      defineConnector({
        id: "xero",
        name: "Xero",
        description: "Mock Xero",
        auth: { type: "apiKey", label: "token" },
        capabilities: [
          defineCapability({
            id: "xero.report.balance_sheet",
            name: "Read balance sheet",
            kind: "read",
            autonomyFloor: 0,
            requiresApproval: false,
            input: z.object({}),
            output: z.object({ rows: z.array(z.string()) }),
            async execute() {
              return { rows: ["Assets 100", "Liabilities 30"] };
            }
          })
        ],
        async testConnection() {
          return true;
        }
      })
    );

    process.env.MUSTER_ENCRYPTION_KEY = Buffer.alloc(32).toString("base64");
    const { encryptJson } = await import("@muster/core");
    const connectionInsert = inserts;
    fakeDb.select = function () {
      return {
        from(table: { [key: string]: unknown }) {
          const tableName = String(table[Symbol.for("drizzle:Name") as keyof typeof table] ?? "");
          return {
            where() {
              return this;
            },
            innerJoin() {
              return this;
            },
            orderBy() {
              return this;
            },
            limit() {
              if (tableName === "roles") return Promise.resolve([{ id: "role-1", orgId: "org-1", autonomyCeiling: 0, name: "Finance" }]);
              if (tableName === "organisations") return Promise.resolve([{ id: "org-1", name: "Club", slug: "club" }]);
              return Promise.resolve([{ connection: { authData: encryptJson({ token: "ok" }) } }]);
            }
          };
        }
      };
    };

    const result = await runRoleProcedure(
      {
        db: fakeDb as never,
        model: {
          async generateText() {
            return { text: "The club has a positive net position." };
          },
          async generateObject() {
            return {};
          },
          async *streamText() {
            yield "The club has a positive net position.";
          }
        }
      },
      { orgId: "org-1", roleId: "role-1", procedureId: WEEKLY_FINANCE_REPORT_PROCEDURE, triggerSource: "manual" }
    );

    expect(result.artifactId).toBe("artifact-1");
    expect(connectionInsert.some((entry) => entry.table === "artifacts")).toBe(true);
    expect(updates).toContainEqual(expect.objectContaining({ status: "succeeded" }));
  });
});
