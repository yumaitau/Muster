import { NextResponse } from "next/server";
import { getJobsData } from "../../../lib/data";

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

export async function GET() {
  const { org, jobs, roles, audits } = await getJobsData();
  return NextResponse.json({
    org: org ? { id: org.id, name: org.name } : null,
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      roleType: role.roleType,
      enabled: role.enabled,
      autonomyCeiling: role.autonomyCeiling,
      schedule: role.schedule
    })),
    jobs: jobs.map(({ job, role }) => ({
      id: job.id,
      roleId: role.id,
      roleName: role.name,
      roleType: role.roleType,
      runId: job.runId,
      type: job.type,
      status: job.status,
      triggerSource: job.triggerSource,
      payload: job.payload,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      startedAt: toIso(job.startedAt),
      finishedAt: toIso(job.finishedAt),
      updatedAt: job.updatedAt.toISOString()
    })),
    audits: audits.map((entry) => ({
      id: entry.id,
      runId: entry.runId,
      actorId: entry.actorId,
      action: entry.action,
      detail: entry.detail,
      createdAt: entry.createdAt.toISOString()
    }))
  });
}
