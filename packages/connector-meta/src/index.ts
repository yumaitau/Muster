import { defineCapability, defineConnector } from "@muster/connector-sdk";
import { z } from "zod";

const credentials = z.object({ accessToken: z.string(), pageId: z.string(), instagramBusinessAccountId: z.string().optional() });
const postInput = z.object({ text: z.string(), imageUrl: z.string().url().optional() });
const output = z.object({ providerPostId: z.string().optional(), status: z.string(), raw: z.unknown().optional() });

async function graph(path: string, accessToken: string, payload?: Record<string, unknown>) {
  const params = new URLSearchParams({ access_token: accessToken });
  const init: RequestInit = {
    method: payload ? "POST" : "GET",
    headers: { "Content-Type": "application/json" }
  };
  if (payload) init.body = JSON.stringify(payload);
  const response = await fetch(`https://graph.facebook.com/v20.0/${path}?${params.toString()}`, init);
  const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Meta Graph request failed: ${response.status}`);
  return raw;
}

export const facebookPost = defineCapability({
  id: "meta.facebook.post",
  name: "Publish Facebook Page post",
  kind: "write",
  autonomyFloor: 1,
  requiresApproval: true,
  input: postInput,
  output,
  async execute(ctx, input) {
    const creds = credentials.parse(ctx.credentials);
    const raw = await graph(`${creds.pageId}/feed`, creds.accessToken, { message: input.text, link: input.imageUrl });
    return { providerPostId: typeof raw.id === "string" ? raw.id : undefined, status: "sent", raw };
  }
});

export const instagramPost = defineCapability({
  id: "meta.instagram.post",
  name: "Publish Instagram post",
  kind: "write",
  autonomyFloor: 1,
  requiresApproval: true,
  input: postInput.extend({ imageUrl: z.string().url() }),
  output,
  async execute(ctx, input) {
    const creds = credentials.parse(ctx.credentials);
    if (!creds.instagramBusinessAccountId) throw new Error("Instagram Business account is not configured");
    const container = await graph(`${creds.instagramBusinessAccountId}/media`, creds.accessToken, { image_url: input.imageUrl, caption: input.text });
    const raw = await graph(`${creds.instagramBusinessAccountId}/media_publish`, creds.accessToken, { creation_id: container.id });
    return { providerPostId: typeof raw.id === "string" ? raw.id : undefined, status: "sent", raw };
  }
});

export const metaConnector = defineConnector({
  id: "meta",
  name: "Meta",
  description: "Publishes approved Facebook Page and Instagram Business posts. Instagram requires a Business or Creator account linked to a Page and is subject to Meta publishing limits.",
  auth: {
    type: "oauth2",
    authorizationUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
    scopes: ["pages_manage_posts", "pages_read_engagement", "instagram_content_publish"]
  },
  capabilities: [facebookPost, instagramPost],
  canonicalEntities: [{ entity: "message_delivery", version: "0.1", description: "Social post delivery status." }],
  async testConnection(ctx) {
    const creds = credentials.parse(ctx.credentials);
    await graph(`${creds.pageId}`, creds.accessToken);
    return true;
  }
});
