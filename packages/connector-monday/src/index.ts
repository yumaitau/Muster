import { defineCapability, defineConnector } from "@muster/connector-sdk";
import { z } from "zod";

const credentials = z.object({ accessToken: z.string() });
const task = z.object({ id: z.string(), title: z.string(), assignee: z.string().optional(), dueAt: z.string().optional(), status: z.string().optional() });

async function monday(token: string, query: string, variables?: Record<string, unknown>) {
  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || raw.errors) throw new Error("Monday.com GraphQL request failed");
  return raw;
}

export const mondayItemList = defineCapability({
  id: "monday.item.list",
  name: "List Monday.com items",
  kind: "read",
  autonomyFloor: 0,
  requiresApproval: false,
  input: z.object({ boardId: z.string() }),
  output: z.object({ tasks: z.array(task), raw: z.unknown().optional() }),
  async execute(ctx, input) {
    const creds = credentials.parse(ctx.credentials);
    const raw = await monday(creds.accessToken, "query($boardId:[ID!]){boards(ids:$boardId){items_page{items{id name}}}}", { boardId: input.boardId });
    const boards = (raw.data as { boards?: Array<{ items_page?: { items?: Array<{ id: string; name: string }> } }> } | undefined)?.boards ?? [];
    const items = boards.flatMap((board) => board.items_page?.items ?? []);
    return { tasks: items.map((item) => ({ id: item.id, title: item.name })), raw };
  }
});

export const mondayItemCreate = defineCapability({
  id: "monday.item.create",
  name: "Create Monday.com item",
  kind: "write",
  autonomyFloor: 1,
  requiresApproval: true,
  input: z.object({ boardId: z.string(), title: z.string(), columnValues: z.record(z.string(), z.unknown()).optional() }),
  output: task,
  async execute(ctx, input) {
    const creds = credentials.parse(ctx.credentials);
    const raw = await monday(creds.accessToken, "mutation($boardId:ID!,$title:String!,$values:JSON){create_item(board_id:$boardId,item_name:$title,column_values:$values){id name}}", {
      boardId: input.boardId,
      title: input.title,
      values: input.columnValues ? JSON.stringify(input.columnValues) : undefined
    });
    const item = (raw.data as { create_item?: { id: string; name: string } } | undefined)?.create_item;
    return { id: item?.id ?? "pending", title: item?.name ?? input.title };
  }
});

export const mondayItemUpdate = defineCapability({
  id: "monday.item.update",
  name: "Update Monday.com item",
  kind: "write",
  autonomyFloor: 1,
  requiresApproval: true,
  input: z.object({ boardId: z.string(), itemId: z.string(), columnValues: z.record(z.string(), z.unknown()) }),
  output: task,
  async execute(ctx, input) {
    const creds = credentials.parse(ctx.credentials);
    await monday(creds.accessToken, "mutation($boardId:ID!,$itemId:ID!,$values:JSON!){change_multiple_column_values(board_id:$boardId,item_id:$itemId,column_values:$values){id name}}", {
      boardId: input.boardId,
      itemId: input.itemId,
      values: JSON.stringify(input.columnValues)
    });
    return { id: input.itemId, title: input.itemId, status: "updated" };
  }
});

export const mondayConnector = defineConnector({
  id: "monday",
  name: "Monday.com",
  description: "Reads and proposes changes to Monday.com boards over GraphQL.",
  auth: {
    type: "oauth2",
    authorizationUrl: "https://auth.monday.com/oauth2/authorize",
    tokenUrl: "https://auth.monday.com/oauth2/token",
    scopes: ["boards:read", "boards:write"]
  },
  capabilities: [mondayItemList, mondayItemCreate, mondayItemUpdate],
  canonicalEntities: [{ entity: "task", version: "0.1", description: "Board items mapped to canonical tasks." }],
  async testConnection(ctx) {
    const creds = credentials.parse(ctx.credentials);
    await monday(creds.accessToken, "query{me{id name}}");
    return true;
  }
});
