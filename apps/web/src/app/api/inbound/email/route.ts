import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";
import { and, backgroundJobs, eq, getDb, intakeItems, organisations, roles } from "@muster/db";
import { inboundAddressForSlug, orgSlugFromInboundAddress, parseInboundEmail } from "../../../../lib/inbound-email";
import type { processInboundFinanceEmail } from "../../../../trigger/inbound-email";

const maxEmailBytes = Number(process.env.MUSTER_INBOUND_EMAIL_MAX_BYTES ?? 15 * 1024 * 1024);

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { raw?: unknown; to?: unknown; encoding?: unknown };
    if (typeof body.raw !== "string") throw new Error("Missing raw email content");
    const rawBase64 = body.encoding === "base64" ? body.raw : Buffer.from(body.raw).toString("base64");
    return { rawBase64, explicitTo: typeof body.to === "string" ? body.to : null };
  }
  const raw = await request.text();
  return { rawBase64: Buffer.from(raw).toString("base64"), explicitTo: request.headers.get("x-muster-email-to") };
}

function isAuthorised(request: Request) {
  const secret = process.env.MUSTER_INBOUND_EMAIL_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(token) && token === secret;
}

export async function POST(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rawBase64, explicitTo } = await readPayload(request);
  const rawBytes = Buffer.byteLength(rawBase64, "base64");
  if (rawBytes > maxEmailBytes) {
    return NextResponse.json({ error: "Email is too large" }, { status: 413 });
  }

  const parsed = await parseInboundEmail(Buffer.from(rawBase64, "base64"));
  const addresses = Array.from(new Set([...parsed.to, ...(explicitTo ? [explicitTo.toLowerCase()] : [])]));
  const slugs = addresses.map(orgSlugFromInboundAddress).filter((slug): slug is string => Boolean(slug));
  if (slugs.length === 0) {
    return NextResponse.json({ status: "not_found", addresses });
  }

  const db = getDb();
  const [org] = await db.select().from(organisations).where(eq(organisations.slug, slugs[0]!)).limit(1);
  if (!org) {
    return NextResponse.json({ status: "not_found", addresses, expected: slugs.map(inboundAddressForSlug) });
  }

  const [role] = await db.select().from(roles).where(and(eq(roles.orgId, org.id), eq(roles.roleType, "finance"))).limit(1);
  if (!role) {
    return NextResponse.json({ error: "Finance role not found" }, { status: 404 });
  }

  const [intake] = await db
    .insert(intakeItems)
    .values({
      orgId: org.id,
      source: "email",
      status: "received",
      payload: {
        rawBase64,
        from: parsed.from,
        to: addresses,
        subject: parsed.subject,
        attachmentCount: parsed.attachments.length
      }
    })
    .returning();
  if (!intake) {
    return NextResponse.json({ error: "Inbound email intake could not be created" }, { status: 500 });
  }

  const [job] = await db
    .insert(backgroundJobs)
    .values({
      orgId: org.id,
      roleId: role.id,
      type: "inbound-finance-email",
      status: "queued",
      triggerSource: "webhook",
      payload: { intakeItemId: intake.id, from: parsed.from, to: addresses, subject: parsed.subject, attachmentCount: parsed.attachments.length }
    })
    .returning();
  if (!job) {
    return NextResponse.json({ error: "Background job could not be queued" }, { status: 500 });
  }

  try {
    const handle = await tasks.trigger<typeof processInboundFinanceEmail>(
      "process-inbound-finance-email",
      { orgId: org.id, roleId: role.id, intakeItemId: intake.id, backgroundJobId: job.id },
      { idempotencyKey: intake.id, queue: "inbound-finance-email" }
    );
    await db.update(backgroundJobs).set({ result: { triggerRunId: handle.id }, updatedAt: new Date() }).where(eq(backgroundJobs.id, job.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trigger.dev could not queue inbound email processing";
    await db
      .update(backgroundJobs)
      .set({ status: "failed", error: message, finishedAt: new Date(), updatedAt: new Date() })
      .where(eq(backgroundJobs.id, job.id));
    await db.update(intakeItems).set({ status: "failed", error: message, updatedAt: new Date() }).where(eq(intakeItems.id, intake.id));
    return NextResponse.json({ error: message, intakeItemId: intake.id, jobId: job.id }, { status: 502 });
  }

  return NextResponse.json({ status: "queued", orgId: org.id, intakeItemId: intake.id, jobId: job.id });
}
