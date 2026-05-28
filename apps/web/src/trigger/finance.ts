import { schedules, task } from "@trigger.dev/sdk";
import { createModelAdapter } from "@muster/adapter-model";
import { createS3StorageAdapter } from "@muster/adapter-storage-s3";
import { runRoleProcedure, WEEKLY_FINANCE_REPORT_PROCEDURE } from "@muster/core";
import { and, backgroundJobs, eq, getDb, isNotNull, roles } from "@muster/db";
import { bootstrapConnectors } from "../lib/bootstrap";

export type RunFinanceNowPayload = {
  orgId: string;
  roleId: string;
  backgroundJobId: string;
};

export const scheduledFinanceReports = schedules.task({
  id: "scheduled-finance-reports",
  cron: "*/15 * * * *",
  run: async () => {
    bootstrapConnectors();
    const db = getDb();
    const enabledRoles = await db
      .select()
      .from(roles)
      .where(and(eq(roles.roleType, "finance"), eq(roles.enabled, true), isNotNull(roles.schedule)));
    for (const role of enabledRoles) {
      const [job] = await db
        .insert(backgroundJobs)
        .values({
          orgId: role.orgId,
          roleId: role.id,
          type: "finance-report",
          status: "queued",
          triggerSource: "schedule",
          payload: { procedureId: WEEKLY_FINANCE_REPORT_PROCEDURE, schedule: role.schedule }
        })
        .returning();

      const input = {
        orgId: role.orgId,
        roleId: role.id,
        procedureId: WEEKLY_FINANCE_REPORT_PROCEDURE,
        triggerSource: "schedule" as const,
        ...(job ? { backgroundJobId: job.id } : {})
      };

      await runRoleProcedure(
        { db, model: createModelAdapter(), storage: createS3StorageAdapter() },
        input
      );
    }
  }
});

export const runFinanceNow = task({
  id: "run-finance-now",
  queue: { name: "finance-report", concurrencyLimit: 1 },
  run: async (payload: RunFinanceNowPayload) => {
    bootstrapConnectors();
    await runRoleProcedure(
      { db: getDb(), model: createModelAdapter(), storage: createS3StorageAdapter() },
      {
        orgId: payload.orgId,
        roleId: payload.roleId,
        procedureId: WEEKLY_FINANCE_REPORT_PROCEDURE,
        triggerSource: "manual",
        backgroundJobId: payload.backgroundJobId
      }
    );
  }
});
