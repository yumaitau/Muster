import { NextResponse } from "next/server";
import { getDb, messageDeliveries, messages } from "@muster/db";
import { getCurrentOrg } from "../../../lib/data";

const channelCapabilities: Record<string, { connectorId: string; capabilityId: string }> = {
  sms: { connectorId: "clicksend", capabilityId: "clicksend.sms.send" },
  email: { connectorId: "clicksend", capabilityId: "clicksend.email.send" },
  facebook: { connectorId: "meta", capabilityId: "meta.facebook.post" },
  instagram: { connectorId: "meta", capabilityId: "meta.instagram.post" }
};

export async function POST(request: Request) {
  const form = await request.formData();
  const org = await getCurrentOrg();
  if (!org) return NextResponse.redirect(new URL("/setup", request.url), { status: 303 });
  const channels = form.getAll("channels").map(String);
  const db = getDb();
  const [message] = await db
    .insert(messages)
    .values({
      orgId: org.id,
      subject: String(form.get("subject") ?? ""),
      body: String(form.get("body") ?? ""),
      targetChannels: channels,
      status: "queued"
    })
    .returning();
  if (message) {
    await db.insert(messageDeliveries).values(
      channels.map((channel) => ({
        orgId: org.id,
        messageId: message.id,
        connectorId: channelCapabilities[channel]?.connectorId ?? channel,
        capabilityId: channelCapabilities[channel]?.capabilityId ?? channel,
        status: "queued" as const,
        result: { awaitingApproval: true }
      }))
    );
  }
  return NextResponse.redirect(new URL("/messages", request.url), { status: 303 });
}
