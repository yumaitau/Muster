import { describe, expect, it } from "vitest";
import { executeCustomApiAction, renderTemplate, validateJsonSchema } from "../apps/web/src/lib/custom-api-action";

describe("custom API action", () => {
  it("renders input and credential placeholders", () => {
    const rendered = renderTemplate("{{input.title}}:{{credentials.accountId}}", {
      input: { title: "Follow up" },
      credentials: { accountId: "acct-1" }
    });

    expect(rendered).toBe("Follow up:acct-1");
  });

  it("validates response shape with a JSON schema subset", () => {
    const errors = validateJsonSchema(
      { id: "task-1", count: 2 },
      { type: "object", required: ["id"], properties: { id: { type: "string" }, count: { type: "integer" } } }
    );

    expect(errors).toEqual([]);
  });

  it("executes an API call and validates the expected output", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const result = await executeCustomApiAction({
      definition: {
        endpointUrl: "https://api.example.com/tasks",
        method: "POST",
        bodyTemplate: '{ "title": "{{input.title}}" }',
        outputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
        requiresApproval: true
      },
      credentials: {
        authType: "apiKey",
        apiKeyHeader: "X-API-Key",
        apiKeyValue: "secret",
        headers: {}
      },
      payload: { title: "Call customer" },
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init });
        return new Response(JSON.stringify({ id: "task-1" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
    });

    expect(result.response).toEqual({ id: "task-1" });
    expect(calls[0]?.init.headers).toMatchObject({ "X-API-Key": "secret", "Content-Type": "application/json" });
    expect(calls[0]?.init.body).toBe('{ "title": "Call customer" }');
  });
});
