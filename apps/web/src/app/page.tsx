import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, Clock3, Play, ShieldCheck } from "lucide-react";
import { getDashboardData } from "../lib/data";
import { taskAutomationSummary } from "../lib/business-playbooks";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { org, report, runs, roles, connections, approvals, jobs, audits, tasks } = await getDashboardData();
  if (!org) {
    return (
      <section>
        <h1 className="page-title">First run setup</h1>
        <p className="lede">Create the organisation and owner account before connecting your first system.</p>
        <Link href="/setup" className="button mt-6">Start setup</Link>
      </section>
    );
  }

  const content = report?.content as { narrative?: string; generatedAt?: string } | undefined;
  const connectedCount = connections.filter((connection) => connection.status === "connected").length;
  const pendingApprovals = approvals.filter((approval) => approval.status === "pending").length;
  const activeJobs = jobs.filter(({ job }) => job.status === "queued" || job.status === "running");
  const lastFailedJob = jobs.find(({ job }) => job.status === "failed");
  const taskSummary = taskAutomationSummary(tasks);

  return (
    <section className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{org.name}</h1>
          <p className="lede">Agent command centre for finance, communications, content, and admin work.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/jobs" className="button secondary"><Clock3 size={16} /> Operations</Link>
          <Link href="/roles" className="button"><Play size={16} /> Queue work</Link>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <span>Agents enabled</span>
          <strong>{roles.filter((role) => role.enabled).length}/{roles.length}</strong>
        </div>
        <div className="metric">
          <span>Jobs in flight</span>
          <strong>{activeJobs.length}</strong>
        </div>
        <div className="metric">
          <span>Approvals pending</span>
          <strong>{pendingApprovals}</strong>
        </div>
        <div className="metric">
          <span>Connected systems</span>
          <strong>{connectedCount}</strong>
        </div>
      </div>

      {lastFailedJob && (
        <div className="notice warning">
          <AlertTriangle size={18} />
          <div>
            <strong>{lastFailedJob.role.name} needs attention.</strong>
            <span>{lastFailedJob.job.error ?? "The last background job failed."}</span>
          </div>
        </div>
      )}

      {taskSummary.automatedCount === 0 && (
        <div className="notice">
          <ClipboardList size={18} />
          <div>
            <strong>Install operating playbooks to standardise recurring work.</strong>
            <span>Admin can create ready-made finance, service, onboarding, campaign, event and governance task routines.</span>
          </div>
          <Link href="/admin" className="button secondary">Open admin</Link>
        </div>
      )}

      <div className="dashboard-grid">
        <section className="panel feature-panel">
          <div className="section-heading">
            <div>
              <h2>Latest finance report</h2>
              <p>{content?.generatedAt ? new Date(content.generatedAt).toLocaleString("en-AU") : "No report generated yet"}</p>
            </div>
            {report && <Link href={`/reports/${report.id}`} className="button secondary">Open report</Link>}
          </div>
          {report ? (
            <p className="report-narrative">{content?.narrative}</p>
          ) : (
            <div className="empty-state">
              <ShieldCheck size={22} />
              <p>Connect Xero, enable Finance, then queue the first report.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Agent status</h2>
              <p>Current work by role.</p>
            </div>
          </div>
          <div className="compact-list">
            {roles.map((role) => {
              const activeJob = activeJobs.find(({ job }) => job.roleId === role.id);
              return (
                <div key={role.id} className="compact-row">
                  <div>
                    <strong>{role.name}</strong>
                    <span>{role.roleType} · tier {role.autonomyCeiling}</span>
                  </div>
                  <span className={`status status-${activeJob?.job.status ?? (role.enabled ? "idle" : "offline")}`}>
                    {activeJob?.job.status ?? (role.enabled ? "idle" : "offline")}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Recent background jobs</h2>
              <p>What has been queued and how it finished.</p>
            </div>
            <Link href="/jobs" className="button secondary">View all</Link>
          </div>
          <div className="compact-list">
            {jobs.map(({ job, role }) => (
              <div key={job.id} className="compact-row">
                <div>
                  <strong>{job.type.replaceAll("-", " ")}</strong>
                  <span>{role.name} · {job.triggerSource} · {job.createdAt.toLocaleString("en-AU")}</span>
                </div>
                <span className={`status status-${job.status}`}>{job.status}</span>
              </div>
            ))}
            {jobs.length === 0 && <p className="empty">No background jobs yet.</p>}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Recent runs</h2>
              <p>Run records created by the engine.</p>
            </div>
          </div>
          <div className="compact-list">
            {runs.map(({ run, role }) => (
              <div key={run.id} className="compact-row">
                <div>
                  <strong>{run.procedureId}</strong>
                  <span>{role.name} · {run.createdAt.toLocaleString("en-AU")}</span>
                </div>
                {run.status === "succeeded" ? <CheckCircle2 size={16} /> : <span className={`status status-${run.status}`}>{run.status}</span>}
              </div>
            ))}
            {runs.length === 0 && <p className="empty">Runs will appear after a job starts.</p>}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Audit trail</h2>
            <p>Latest events from agents and connectors.</p>
          </div>
        </div>
        <div className="activity-list">
          {audits.map((entry) => (
            <div key={entry.id} className="activity-row">
              <span>{entry.createdAt.toLocaleString("en-AU")}</span>
              <strong>{entry.action}</strong>
              <code>{JSON.stringify(entry.detail)}</code>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
