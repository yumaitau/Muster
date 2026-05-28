import { and, desc, eq } from "drizzle-orm";
import type { AutonomyTier } from "@muster/connector-sdk";
import type { MusterDb } from "@muster/db";
import {
  artifacts,
  auditLog,
  backgroundJobs,
  connectorConnections,
  organisations,
  roleConnectorBindings,
  roles,
  runs
} from "@muster/db";
import type { ModelAdapter, StorageAdapter } from "../adapters/contracts";
import { decryptJson } from "../crypto/encryption";
import { getCapability } from "../registry/connectors";
import { requiresHumanApproval, resolveAutonomy } from "./autonomy";
import { WEEKLY_FINANCE_REPORT_PROCEDURE } from "./finance";

export interface RunEngineDeps {
  db: MusterDb;
  model: ModelAdapter;
  storage?: StorageAdapter;
}

export interface RunRoleInput {
  orgId: string;
  roleId: string;
  procedureId: string;
  triggerSource: "schedule" | "manual" | "webhook";
  backgroundJobId?: string;
}

async function writeAudit(db: MusterDb, input: { orgId: string; runId?: string; action: string; detail?: Record<string, unknown> }) {
  await db.insert(auditLog).values({
    orgId: input.orgId,
    runId: input.runId,
    actorType: "role",
    actorId: "finance",
    action: input.action,
    detail: input.detail ?? {}
  });
}

async function markBackgroundJobFailed(db: MusterDb, backgroundJobId: string | undefined, error: string) {
  if (!backgroundJobId) return;
  await db
    .update(backgroundJobs)
    .set({ status: "failed", error, finishedAt: new Date(), updatedAt: new Date() })
    .where(eq(backgroundJobs.id, backgroundJobId));
}

export async function runRoleProcedure(deps: RunEngineDeps, input: RunRoleInput) {
  const { db, model, storage } = deps;
  const [role] = await db.select().from(roles).where(and(eq(roles.id, input.roleId), eq(roles.orgId, input.orgId))).limit(1);
  if (!role) {
    await markBackgroundJobFailed(db, input.backgroundJobId, "Role not found");
    throw new Error("Role not found");
  }
  const [org] = await db.select().from(organisations).where(eq(organisations.id, input.orgId)).limit(1);
  if (!org) {
    await markBackgroundJobFailed(db, input.backgroundJobId, "Organisation not found");
    throw new Error("Organisation not found");
  }

  const [run] = await db
    .insert(runs)
    .values({
      orgId: input.orgId,
      roleId: role.id,
      procedureId: input.procedureId,
      triggerSource: input.triggerSource,
      status: "running",
      startedAt: new Date()
    })
    .returning();

  if (!run) {
    await markBackgroundJobFailed(db, input.backgroundJobId, "Failed to create run");
    throw new Error("Failed to create run");
  }

  try {
    if (input.backgroundJobId) {
      await db
        .update(backgroundJobs)
        .set({ status: "running", runId: run.id, startedAt: new Date(), updatedAt: new Date() })
        .where(eq(backgroundJobs.id, input.backgroundJobId));
    }

    await writeAudit(db, { orgId: input.orgId, runId: run.id, action: "run.started", detail: { procedureId: input.procedureId } });

    if (input.procedureId !== WEEKLY_FINANCE_REPORT_PROCEDURE) {
      throw new Error(`Unsupported procedure ${input.procedureId}`);
    }

    const [binding] = await db
      .select({ connection: connectorConnections })
      .from(roleConnectorBindings)
      .innerJoin(connectorConnections, eq(roleConnectorBindings.connectorConnectionId, connectorConnections.id))
      .where(and(eq(roleConnectorBindings.roleId, role.id), eq(connectorConnections.connectorId, "xero")))
      .orderBy(desc(connectorConnections.createdAt))
      .limit(1);

    if (!binding) {
      throw new Error("Finance role is not bound to a Xero connection");
    }

    const capability = getCapability("xero.report.balance_sheet");
    const autonomy = resolveAutonomy(role.autonomyCeiling as AutonomyTier, capability.autonomyFloor);
    if (requiresHumanApproval(role.autonomyCeiling as AutonomyTier, capability)) {
      throw new Error("Read-only finance report unexpectedly requires approval");
    }

    await writeAudit(db, {
      orgId: input.orgId,
      runId: run.id,
      action: "capability.executing",
      detail: { capabilityId: capability.id, autonomy }
    });

    const credentials = decryptJson(binding.connection.authData);
    const balanceSheet = await capability.execute(
      {
        organisation: org,
        credentials,
        logger: {
          info: (message, detail) =>
            void writeAudit(db, { orgId: input.orgId, runId: run.id, action: `connector.info.${message}`, ...(detail ? { detail } : {}) }),
          warn: (message, detail) =>
            void writeAudit(db, { orgId: input.orgId, runId: run.id, action: `connector.warn.${message}`, ...(detail ? { detail } : {}) }),
          error: (message, detail) =>
            void writeAudit(db, { orgId: input.orgId, runId: run.id, action: `connector.error.${message}`, ...(detail ? { detail } : {}) })
        }
      },
      {}
    );

    await writeAudit(db, { orgId: input.orgId, runId: run.id, action: "model.generating_finance_narrative" });

    const narrative = await model.generateText({
      system: "You write concise, plain-English finance summaries for Australian community organisations. Mention risk, cash position and any obvious movement. Do not invent facts.",
      prompt: `Summarise this Xero balance sheet for a committee member:\n\n${JSON.stringify(balanceSheet, null, 2)}`
    });

    const content = {
      balanceSheet,
      narrative: narrative.text,
      generatedAt: new Date().toISOString()
    };

    const storageKey = storage ? `orgs/${input.orgId}/runs/${run.id}/finance-report.json` : null;
    if (storage && storageKey) {
      await storage.put(storageKey, JSON.stringify(content, null, 2), "application/json");
    }

    const [artifact] = await db
      .insert(artifacts)
      .values({
        orgId: input.orgId,
        runId: run.id,
        type: "finance_report",
        title: "Weekly finance report",
        content,
        storageKey
      })
      .returning();

    await writeAudit(db, {
      orgId: input.orgId,
      runId: run.id,
      action: "artifact.created",
      detail: { artifactId: artifact?.id, type: "finance_report" }
    });

    await db.update(runs).set({ status: "succeeded", finishedAt: new Date() }).where(eq(runs.id, run.id));
    if (input.backgroundJobId) {
      await db
        .update(backgroundJobs)
        .set({
          status: "succeeded",
          result: { runId: run.id, artifactId: artifact?.id ?? null },
          finishedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(backgroundJobs.id, input.backgroundJobId));
    }
    await writeAudit(db, { orgId: input.orgId, runId: run.id, action: "run.succeeded" });
    return { runId: run.id, artifactId: artifact?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.update(runs).set({ status: "failed", finishedAt: new Date(), error: message }).where(eq(runs.id, run.id));
    await markBackgroundJobFailed(db, input.backgroundJobId, message);
    await writeAudit(db, { orgId: input.orgId, runId: run.id, action: "run.failed", detail: { error: message } });
    throw error;
  }
}
