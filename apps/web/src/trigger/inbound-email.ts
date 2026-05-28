import { task } from "@trigger.dev/sdk";
import { uploadFileCapability } from "@muster/connector-xero";
import { decryptJson } from "@muster/core";
import { and, artifacts, auditLog, backgroundJobs, connectorConnections, desc, eq, getDb, intakeItems, organisations, roles, runs } from "@muster/db";
import { parseInboundEmail } from "../lib/inbound-email";
import { bootstrapConnectors } from "../lib/bootstrap";

export type ProcessInboundFinanceEmailPayload = {
  orgId: string;
  roleId: string;
  intakeItemId: string;
  backgroundJobId: string;
};

async function writeAudit(input: { orgId: string; runId?: string; action: string; detail?: Record<string, unknown> }) {
  await getDb().insert(auditLog).values({
    orgId: input.orgId,
    runId: input.runId,
    actorType: "role",
    actorId: "finance",
    action: input.action,
    detail: input.detail ?? {}
  });
}

async function fail(input: { backgroundJobId: string; intakeItemId: string; runId?: string; message: string }) {
  const db = getDb();
  await db
    .update(backgroundJobs)
    .set({ status: "failed", error: input.message, finishedAt: new Date(), updatedAt: new Date() })
    .where(eq(backgroundJobs.id, input.backgroundJobId));
  await db.update(intakeItems).set({ status: "failed", error: input.message, updatedAt: new Date() }).where(eq(intakeItems.id, input.intakeItemId));
  if (input.runId) {
    await db.update(runs).set({ status: "failed", error: input.message, finishedAt: new Date() }).where(eq(runs.id, input.runId));
  }
}

export const processInboundFinanceEmail = task({
  id: "process-inbound-finance-email",
  queue: { name: "inbound-finance-email", concurrencyLimit: 2 },
  run: async (payload: ProcessInboundFinanceEmailPayload) => {
    bootstrapConnectors();
    const db = getDb();
    let runId: string | undefined;

    try {
      const [org] = await db.select().from(organisations).where(eq(organisations.id, payload.orgId)).limit(1);
      if (!org) throw new Error("Organisation not found");

      const [role] = await db.select().from(roles).where(eq(roles.id, payload.roleId)).limit(1);
      if (!role) throw new Error("Finance role not found");

      const [intake] = await db.select().from(intakeItems).where(eq(intakeItems.id, payload.intakeItemId)).limit(1);
      if (!intake) throw new Error("Inbound email intake not found");

      const rawBase64 = typeof intake.payload.rawBase64 === "string" ? intake.payload.rawBase64 : null;
      if (!rawBase64) throw new Error("Inbound email payload is missing raw content");

      const [connection] = await db
        .select()
        .from(connectorConnections)
        .where(and(eq(connectorConnections.orgId, payload.orgId), eq(connectorConnections.connectorId, "xero")))
        .orderBy(desc(connectorConnections.createdAt))
        .limit(1);
      if (!connection || connection.connectorId !== "xero" || connection.status !== "connected") {
        throw new Error("A connected Xero account is required before inbound finance email can upload files");
      }

      const [run] = await db
        .insert(runs)
        .values({
          orgId: payload.orgId,
          roleId: payload.roleId,
          procedureId: "inbound-finance-email",
          triggerSource: "webhook",
          status: "running",
          startedAt: new Date()
        })
        .returning();
      if (!run) throw new Error("Run could not be created");
      runId = run.id;

      await db
        .update(backgroundJobs)
        .set({ status: "running", runId, startedAt: new Date(), updatedAt: new Date() })
        .where(eq(backgroundJobs.id, payload.backgroundJobId));
      await db.update(intakeItems).set({ status: "processing", updatedAt: new Date() }).where(eq(intakeItems.id, payload.intakeItemId));
      await writeAudit({ orgId: payload.orgId, runId, action: "inbound_email.processing", detail: { intakeItemId: payload.intakeItemId } });

      const parsed = await parseInboundEmail(Buffer.from(rawBase64, "base64"));
      const credentials = decryptJson(connection.authData);
      const uploadedFiles = [];
      const currentRunId = run.id;

      for (const [index, attachment] of parsed.attachments.entries()) {
        const result = await uploadFileCapability.execute(
          {
            organisation: org,
            credentials,
            logger: {
              info: (message, detail) =>
                void writeAudit({ orgId: payload.orgId, runId: currentRunId, action: `connector.info.${message}`, ...(detail ? { detail } : {}) }),
              warn: (message, detail) =>
                void writeAudit({ orgId: payload.orgId, runId: currentRunId, action: `connector.warn.${message}`, ...(detail ? { detail } : {}) }),
              error: (message, detail) =>
                void writeAudit({ orgId: payload.orgId, runId: currentRunId, action: `connector.error.${message}`, ...(detail ? { detail } : {}) })
            }
          },
          {
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            fileContentBase64: attachment.contentBase64,
            idempotencyKey: `${payload.intakeItemId}-${index}`.slice(0, 128)
          }
        );
        uploadedFiles.push({ ...result, fileName: attachment.fileName, size: attachment.size });
        await writeAudit({
          orgId: payload.orgId,
          runId,
          action: "xero.file.uploaded",
          detail: { fileId: result.fileId, fileName: attachment.fileName, mimeType: attachment.mimeType, size: attachment.size }
        });
      }

      await db.insert(artifacts).values({
        orgId: payload.orgId,
        runId,
        type: "inbound_invoice_email",
        title: parsed.subject,
        content: {
          intakeItemId: payload.intakeItemId,
          from: parsed.from,
          to: parsed.to,
          subject: parsed.subject,
          uploadedFiles
        },
        storageKey: null
      });

      await db
        .update(intakeItems)
        .set({
          status: "completed",
          payload: { ...intake.payload, parsed: { from: parsed.from, to: parsed.to, subject: parsed.subject }, uploadedFiles },
          updatedAt: new Date()
        })
        .where(eq(intakeItems.id, payload.intakeItemId));
      await db.update(runs).set({ status: "succeeded", finishedAt: new Date() }).where(eq(runs.id, runId));
      await db
        .update(backgroundJobs)
        .set({ status: "succeeded", result: { runId, uploadedFiles }, finishedAt: new Date(), updatedAt: new Date() })
        .where(eq(backgroundJobs.id, payload.backgroundJobId));
      await writeAudit({ orgId: payload.orgId, runId, action: "inbound_email.succeeded", detail: { uploadedCount: uploadedFiles.length } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Inbound finance email processing failed";
      await fail({ backgroundJobId: payload.backgroundJobId, intakeItemId: payload.intakeItemId, ...(runId ? { runId } : {}), message });
      if (runId) {
        await writeAudit({ orgId: payload.orgId, runId, action: "inbound_email.failed", detail: { error: message } });
      }
      throw error;
    }
  }
});
