import Link from "next/link";
import { JobsBoard, type JobsPayload } from "./jobs-board";
import { getJobsData } from "../../lib/data";

export const dynamic = "force-dynamic";

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

export default async function JobsPage() {
  const { org, jobs, roles, audits } = await getJobsData();

  if (!org) {
    return (
      <section>
        <h1 className="page-title">Operations</h1>
        <p className="lede">Create an organisation before queueing background work.</p>
        <Link href="/setup" className="button mt-6">Start setup</Link>
      </section>
    );
  }

  const initialData: JobsPayload = {
    org: { id: org.id, name: org.name },
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
  };

  return <JobsBoard initialData={initialData} />;
}
