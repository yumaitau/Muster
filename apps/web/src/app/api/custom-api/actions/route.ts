import { NextResponse } from "next/server";
import { defineCapability } from "@muster/connector-sdk";
import { decryptJson, proposeRunAction } from "@muster/core";
import { and, artifacts, auditLog, backgroundJobs, connectorConnections, eq, getDb, roles, runs } from "@muster/db";
import { z } from "zod";
import {
  customApiCredentialsSchema,
  customApiDefinitionSchema,
  executeCustomApiAction,
  type CustomApiCredentials,
  type CustomApiDefinition
} from "../../../../lib/custom-api-action";
import { getCurrentOrg } from "../../../../lib/data";

const actionInputSchema = z.object({
  connectionId: z.string().uuid(),
  input: z.record(z.string(), z.unknown()).default({})
});

function customApiCapability(definition: CustomApiDefinition) {
  return defineCapability({
    id: "custom_api.request",
    name: "Call custom API",
    kind: "write",
    autonomyFloor: 1,
    requiresApproval: definition.requiresApproval,
    input: actionInputSchema,
    output: z.unknown(),
    async execute(_ctx, input) {
      return input;
    }
  });
}

export async function POST(request: Request) {
  const org = await getCurrentOrg();
  if (!org) return NextResponse.redirect(new URL("/setup", request.url), { status: 303 });

  const form = await request.formData();
  const connectionId = String(form.get("connectionId") ?? "");
  const rawInput = String(form.get("inputJson") ?? "{}").trim() || "{}";
  const input = z.record(z.string(), z.unknown()).parse(JSON.parse(rawInput));
  const db = getDb();

  const [connection] = await db
    .select()
    .from(connectorConnections)
    .where(and(eq(connectorConnections.id, connectionId), eq(connectorConnections.orgId, org.id), eq(connectorConnections.connectorId, "custom-api")))
    .limit(1);
  if (!connection) return NextResponse.json({ error: "Custom API connection not found" }, { status: 404 });

  const [role] = await db.select().from(roles).where(and(eq(roles.orgId, org.id), eq(roles.roleType, "api_action"))).limit(1);
  if (!role) return NextResponse.json({ error: "Action API role not found" }, { status: 404 });

  const definition = customApiDefinitionSchema.parse(connection.metadata);
  const credentials = customApiCredentialsSchema.parse(decryptJson<CustomApiCredentials>(connection.authData));

  const [job] = await db
    .insert(backgroundJobs)
    .values({
      orgId: org.id,
      roleId: role.id,
      type: "custom-api-action",
      status: "running",
      triggerSource: "manual",
      payload: { connectionId, displayName: connection.displayName }
    })
    .returning();

  const [run] = await db
    .insert(runs)
    .values({
      orgId: org.id,
      roleId: role.id,
      procedureId: "custom-api-action",
      triggerSource: "manual",
      status: "running",
      startedAt: new Date()
    })
    .returning();
  if (!run) throw new Error("Run could not be created");

  if (job) await db.update(backgroundJobs).set({ runId: run.id, updatedAt: new Date() }).where(eq(backgroundJobs.id, job.id));
  await db.insert(auditLog).values({
    orgId: org.id,
    runId: run.id,
    actorType: "role",
    actorId: "api_action",
    action: "custom_api.action_requested",
    detail: { connectionId, displayName: connection.displayName, requiresApproval: definition.requiresApproval }
  });

  try {
    const proposal = await proposeRunAction({
      db,
      orgId: org.id,
      runId: run.id,
      roleCeiling: role.autonomyCeiling as 0 | 1 | 2 | 3,
      capability: customApiCapability(definition),
      payload: { connectionId, input },
      execute: async () => executeCustomApiAction({ definition, credentials, payload: input })
    });

    if (proposal.executed) {
      await db.insert(artifacts).values({
        orgId: org.id,
        runId: run.id,
        type: "custom_api_result",
        title: `${connection.displayName} API result`,
        content: proposal.action.result as Record<string, unknown>,
        storageKey: null
      });
    }

    await db.update(runs).set({ status: "succeeded", finishedAt: new Date() }).where(eq(runs.id, run.id));
    if (job) {
      await db
        .update(backgroundJobs)
        .set({
          status: "succeeded",
          result: { runId: run.id, actionId: proposal.action.id, approvalId: proposal.approval?.id ?? null },
          finishedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(backgroundJobs.id, job.id));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Custom API action failed";
    await db.update(runs).set({ status: "failed", error: message, finishedAt: new Date() }).where(eq(runs.id, run.id));
    if (job) await db.update(backgroundJobs).set({ status: "failed", error: message, finishedAt: new Date(), updatedAt: new Date() }).where(eq(backgroundJobs.id, job.id));
    throw error;
  }

  return NextResponse.redirect(new URL(definition.requiresApproval ? "/approvals" : "/jobs", request.url), { status: 303 });
}
