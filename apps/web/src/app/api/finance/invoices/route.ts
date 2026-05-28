import { NextResponse } from "next/server";
import { z } from "zod";
import { createModelAdapter } from "@muster/adapter-model";
import { proposeRunAction } from "@muster/core";
import { createDraftBillCapability } from "@muster/connector-xero";
import { and, artifacts, backgroundJobs, eq, getDb, intakeItems, roles, runs } from "@muster/db";
import { getCurrentOrg } from "../../../../lib/data";

const extractedInvoiceSchema = z.object({
  supplier: z.string(),
  amount: z.number(),
  date: z.string(),
  dueDate: z.string().optional(),
  accountCode: z.string().optional(),
  lineItems: z
    .array(z.object({ description: z.string(), quantity: z.number().default(1), unitAmount: z.number(), accountCode: z.string().optional() }))
    .default([])
});

export async function POST(request: Request) {
  const form = await request.formData();
  const org = await getCurrentOrg();
  if (!org) return NextResponse.redirect(new URL("/setup", request.url), { status: 303 });
  const description = String(form.get("description") ?? "");
  const db = getDb();
  const [role] = await db.select().from(roles).where(and(eq(roles.orgId, org.id), eq(roles.roleType, "finance"))).limit(1);
  if (!role) return NextResponse.json({ error: "Finance role not found" }, { status: 404 });

  const [job] = await db
    .insert(backgroundJobs)
    .values({
      orgId: org.id,
      roleId: role.id,
      type: "finance-invoice-ingestion",
      status: "running",
      triggerSource: "manual",
      payload: { source: "form" },
      startedAt: new Date()
    })
    .returning();

  let runId: string | null = null;
  try {
    const [intake] = await db.insert(intakeItems).values({ orgId: org.id, source: "upload", status: "processing", payload: { description } }).returning();
    const extracted = await createModelAdapter().generateObject({
      schema: extractedInvoiceSchema,
      system: "Extract supplier invoice fields from plain text. Use today's date if no date is present.",
      prompt: description
    });
    const [run] = await db
      .insert(runs)
      .values({ orgId: org.id, roleId: role.id, procedureId: "finance-invoice-ingestion", triggerSource: "manual", status: "running", startedAt: new Date() })
      .returning();
    if (!run) throw new Error("Run could not be created");
    runId = run.id;
    if (job) {
      await db.update(backgroundJobs).set({ runId: run.id, updatedAt: new Date() }).where(eq(backgroundJobs.id, job.id));
    }
    const proposal = await proposeRunAction({
      db,
      orgId: org.id,
      runId: run.id,
      roleCeiling: role.autonomyCeiling as 0 | 1 | 2 | 3,
      capability: createDraftBillCapability,
      payload: extracted
    });
    await db.insert(artifacts).values({
      orgId: org.id,
      runId: run.id,
      type: "invoice_intake",
      title: `Invoice from ${extracted.supplier}`,
      content: { extracted, intakeId: intake?.id, actionId: proposal.action.id },
      storageKey: null
    });
    if (intake) {
      await db.update(intakeItems).set({ status: "queued_for_approval", payload: { description, extracted } }).where(eq(intakeItems.id, intake.id));
    }
    await db.update(runs).set({ status: "succeeded", finishedAt: new Date() }).where(eq(runs.id, run.id));
    if (job) {
      await db
        .update(backgroundJobs)
        .set({ status: "succeeded", result: { runId: run.id, actionId: proposal.action.id }, finishedAt: new Date(), updatedAt: new Date() })
        .where(eq(backgroundJobs.id, job.id));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invoice ingestion failed";
    if (runId) {
      await db.update(runs).set({ status: "failed", error: message, finishedAt: new Date() }).where(eq(runs.id, runId));
    }
    if (job) {
      await db
        .update(backgroundJobs)
        .set({ status: "failed", error: message, finishedAt: new Date(), updatedAt: new Date() })
        .where(eq(backgroundJobs.id, job.id));
    }
    throw error;
  }
  return NextResponse.redirect(new URL("/approvals", request.url), { status: 303 });
}
