import { defineCapability, defineConnector } from "@muster/connector-sdk";
import { z } from "zod";

const credentials = z.object({ accessToken: z.string() });
const template = z.object({ id: z.string(), title: z.string(), thumbnailUrl: z.string().optional() });
const exportOutput = z.object({ designId: z.string(), exportUrl: z.string().url().optional(), status: z.string(), raw: z.unknown().optional() });

async function canva(path: string, token: string, payload?: unknown) {
  const init: RequestInit = {
    method: payload ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
  };
  if (payload) init.body = JSON.stringify(payload);
  const response = await fetch(`https://api.canva.com/rest/v1${path}`, init);
  const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Canva request failed: ${response.status}`);
  return raw;
}

export const canvaTemplateList = defineCapability({
  id: "canva.template.list",
  name: "List Canva brand templates",
  kind: "read",
  autonomyFloor: 0,
  requiresApproval: false,
  input: z.object({}),
  output: z.object({ templates: z.array(template) }),
  async execute(ctx) {
    const creds = credentials.parse(ctx.credentials);
    const raw = await canva("/brand-templates", creds.accessToken);
    const items = Array.isArray(raw.items) ? raw.items : [];
    return { templates: items.map((item) => template.parse({ id: String(item.id), title: String(item.title ?? "Untitled") })) };
  }
});

export const canvaTemplateAutofill = defineCapability({
  id: "canva.template.autofill",
  name: "Autofill Canva brand template",
  kind: "write",
  autonomyFloor: 1,
  requiresApproval: true,
  input: z.object({ templateId: z.string(), data: z.record(z.string(), z.unknown()) }),
  output: z.object({ designId: z.string(), raw: z.unknown().optional() }),
  async execute(ctx, input) {
    const creds = credentials.parse(ctx.credentials);
    const raw = await canva(`/brand-templates/${input.templateId}/autofill`, creds.accessToken, { data: input.data });
    return { designId: String(raw.design_id ?? raw.id), raw };
  }
});

export const canvaDesignExport = defineCapability({
  id: "canva.design.export",
  name: "Export Canva design",
  kind: "read",
  autonomyFloor: 0,
  requiresApproval: false,
  input: z.object({ designId: z.string(), format: z.enum(["pdf", "png", "jpg"]).default("png") }),
  output: exportOutput,
  async execute(ctx, input) {
    const creds = credentials.parse(ctx.credentials);
    const raw = await canva(`/designs/${input.designId}/export`, creds.accessToken, { format: input.format });
    return { designId: input.designId, exportUrl: typeof raw.url === "string" ? raw.url : undefined, status: "exported", raw };
  }
});

export const canvaConnector = defineConnector({
  id: "canva",
  name: "Canva",
  description: "Lists, autofills and exports Canva brand templates through the Canva Connect API. It autofills brand templates, not freeform designs.",
  auth: {
    type: "oauth2",
    authorizationUrl: "https://www.canva.com/api/oauth/authorize",
    tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
    scopes: ["design:content:read", "design:content:write", "brandtemplate:meta:read"]
  },
  capabilities: [canvaTemplateList, canvaTemplateAutofill, canvaDesignExport],
  canonicalEntities: [{ entity: "content_asset", version: "0.1", description: "Exported designs stored as reusable content assets." }],
  async testConnection(ctx) {
    const creds = credentials.parse(ctx.credentials);
    await canva("/users/me", creds.accessToken);
    return true;
  }
});
