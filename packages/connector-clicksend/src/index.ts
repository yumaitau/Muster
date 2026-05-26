import { defineCapability, defineConnector } from "@muster/connector-sdk";
import { z } from "zod";

const credentials = z.object({ username: z.string(), apiKey: z.string() });
const smsInput = z.object({ to: z.string(), body: z.string(), from: z.string().optional() });
const emailInput = z.object({ to: z.string().email(), subject: z.string(), body: z.string(), from: z.string().email().optional() });
const deliveryOutput = z.object({ providerMessageId: z.string().optional(), status: z.string(), raw: z.unknown().optional() });

async function clicksendFetch(creds: z.infer<typeof credentials>, path: string, payload?: unknown) {
  const init: RequestInit = {
    method: payload ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${btoa(`${creds.username}:${creds.apiKey}`)}`,
      "Content-Type": "application/json"
    }
  };
  if (payload) init.body = JSON.stringify(payload);
  const response = await fetch(`https://rest.clicksend.com/v3${path}`, init);
  const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(`ClickSend request failed: ${response.status}`);
  return raw;
}

export const clicksendSmsSend = defineCapability({
  id: "clicksend.sms.send",
  name: "Send SMS",
  kind: "write",
  autonomyFloor: 1,
  requiresApproval: true,
  input: smsInput,
  output: deliveryOutput,
  async execute(ctx, input) {
    const creds = credentials.parse(ctx.credentials);
    const raw = await clicksendFetch(creds, "/sms/send", { messages: [{ to: input.to, body: input.body, from: input.from }] });
    return { status: "sent", raw };
  }
});

export const clicksendEmailSend = defineCapability({
  id: "clicksend.email.send",
  name: "Send email",
  kind: "write",
  autonomyFloor: 1,
  requiresApproval: true,
  input: emailInput,
  output: deliveryOutput,
  async execute(ctx, input) {
    const creds = credentials.parse(ctx.credentials);
    const payload: Record<string, unknown> = {
      to: [{ email: input.to }],
      subject: input.subject,
      body: input.body
    };
    if (input.from) payload.from = { email: input.from };
    const raw = await clicksendFetch(creds, "/email/send", payload);
    return { status: "sent", raw };
  }
});

export const clicksendConnector = defineConnector({
  id: "clicksend",
  name: "ClickSend",
  description: "Sends approved SMS and email messages through ClickSend.",
  auth: { type: "apiKey", label: "ClickSend username and API key" },
  capabilities: [clicksendSmsSend, clicksendEmailSend],
  canonicalEntities: [{ entity: "message_delivery", version: "0.1", description: "Outbound delivery status mapped into Muster messages." }],
  async testConnection(ctx) {
    const creds = credentials.parse(ctx.credentials);
    await clicksendFetch(creds, "/account");
    return true;
  }
});
