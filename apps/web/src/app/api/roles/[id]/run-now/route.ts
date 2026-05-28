import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";
import { WEEKLY_FINANCE_REPORT_PROCEDURE } from "@muster/core";
import { backgroundJobs, eq, getDb, roles } from "@muster/db";
import type { runFinanceNow } from "../../../../../trigger/finance";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }
  if (role.roleType !== "finance") {
    return NextResponse.json({ error: "Only the Finance agent can be queued for this procedure" }, { status: 400 });
  }

  const [job] = await db
    .insert(backgroundJobs)
    .values({
      orgId: role.orgId,
      roleId: role.id,
      type: "finance-report",
      status: "queued",
      triggerSource: "manual",
      payload: { procedureId: WEEKLY_FINANCE_REPORT_PROCEDURE }
    })
    .returning();

  if (!job) {
    return NextResponse.json({ error: "Background job could not be queued" }, { status: 500 });
  }

  try {
    const handle = await tasks.trigger<typeof runFinanceNow>(
      "run-finance-now",
      { orgId: role.orgId, roleId: role.id, backgroundJobId: job.id },
      {
        idempotencyKey: job.id,
        queue: "finance-report"
      }
    );
    await db
      .update(backgroundJobs)
      .set({ result: { triggerRunId: handle.id }, updatedAt: new Date() })
      .where(eq(backgroundJobs.id, job.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trigger.dev could not queue this job";
    await db
      .update(backgroundJobs)
      .set({ status: "failed", error: message, finishedAt: new Date(), updatedAt: new Date() })
      .where(eq(backgroundJobs.id, job.id));
  }

  return NextResponse.redirect(new URL("/jobs", request.url), { status: 303 });
}
