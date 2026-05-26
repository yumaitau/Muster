import { eq } from "drizzle-orm";
import type { AutonomyTier, Capability } from "@muster/connector-sdk";
import type { MusterDb } from "@muster/db";
import { approvals, auditLog, runActions } from "@muster/db";
import { requiresHumanApproval, resolveAutonomy } from "./autonomy";

export interface ProposedActionInput<I = unknown> {
  db: MusterDb;
  orgId: string;
  runId: string;
  roleCeiling: AutonomyTier;
  capability: Capability<I, unknown>;
  payload: I;
  execute?: () => Promise<unknown>;
}

async function audit(db: MusterDb, input: { orgId: string; runId?: string; action: string; detail?: Record<string, unknown> }) {
  await db.insert(auditLog).values({
    orgId: input.orgId,
    runId: input.runId,
    actorType: "role",
    actorId: "action-gate",
    action: input.action,
    detail: input.detail ?? {}
  });
}

export async function proposeRunAction<I>(input: ProposedActionInput<I>) {
  const autonomy = resolveAutonomy(input.roleCeiling, input.capability.autonomyFloor);
  const mustApprove = requiresHumanApproval(input.roleCeiling, input.capability);
  const [action] = await input.db
    .insert(runActions)
    .values({
      runId: input.runId,
      capabilityId: input.capability.id,
      kind: input.capability.kind,
      status: mustApprove ? "proposed" : "executed",
      payload: input.payload as Record<string, unknown>,
      result: null,
      autonomyAtCreation: autonomy,
      requiresApproval: mustApprove
    })
    .returning();
  if (!action) throw new Error("Failed to create run action");

  await audit(input.db, {
    orgId: input.orgId,
    runId: input.runId,
    action: "run_action.proposed",
    detail: { runActionId: action.id, capabilityId: input.capability.id, requiresApproval: mustApprove }
  });

  if (mustApprove) {
    const [approval] = await input.db
      .insert(approvals)
      .values({ runActionId: action.id, orgId: input.orgId, status: "pending" })
      .returning();
    await audit(input.db, {
      orgId: input.orgId,
      runId: input.runId,
      action: "approval.pending",
      detail: { approvalId: approval?.id, runActionId: action.id }
    });
    return { action, approval, executed: false };
  }

  const result = input.execute ? await input.execute() : { executed: true };
  await input.db.update(runActions).set({ status: "executed", result: result as Record<string, unknown> }).where(eq(runActions.id, action.id));
  await audit(input.db, {
    orgId: input.orgId,
    runId: input.runId,
    action: "run_action.executed",
    detail: { runActionId: action.id, capabilityId: input.capability.id }
  });
  return { action: { ...action, result }, approval: null, executed: true };
}

export async function decideApproval(input: {
  db: MusterDb;
  approvalId: string;
  status: "approved" | "rejected";
  decidedBy?: string;
  note?: string;
}) {
  const [approval] = await input.db.select().from(approvals).where(eq(approvals.id, input.approvalId)).limit(1);
  if (!approval) throw new Error("Approval not found");
  const [action] = await input.db.select().from(runActions).where(eq(runActions.id, approval.runActionId)).limit(1);
  if (!action) throw new Error("Run action not found");

  await input.db
    .update(approvals)
    .set({ status: input.status, decidedBy: input.decidedBy, decidedAt: new Date(), note: input.note })
    .where(eq(approvals.id, approval.id));

  if (input.status === "rejected") {
    await input.db.update(runActions).set({ status: "rejected" }).where(eq(runActions.id, action.id));
    await audit(input.db, {
      orgId: approval.orgId,
      action: "approval.rejected",
      detail: { approvalId: approval.id, runActionId: action.id, note: input.note }
    });
    return { approvalId: approval.id, actionId: action.id, status: "rejected" as const };
  }

  await input.db
    .update(runActions)
    .set({ status: "executed", result: { approved: true, executedAt: new Date().toISOString() } })
    .where(eq(runActions.id, action.id));
  await audit(input.db, {
    orgId: approval.orgId,
    action: "approval.approved_and_executed",
    detail: { approvalId: approval.id, runActionId: action.id, capabilityId: action.capabilityId }
  });
  return { approvalId: approval.id, actionId: action.id, status: "executed" as const };
}
