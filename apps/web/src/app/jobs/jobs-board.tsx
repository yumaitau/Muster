"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw } from "lucide-react";

type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type JobsPayload = {
  org: { id: string; name: string } | null;
  roles: Array<{
    id: string;
    name: string;
    roleType: string;
    enabled: boolean;
    autonomyCeiling: number;
    schedule: string | null;
  }>;
  jobs: Array<{
    id: string;
    roleId: string;
    roleName: string;
    roleType: string;
    runId: string | null;
    type: string;
    status: JobStatus;
    triggerSource: "schedule" | "manual" | "webhook";
    payload: Record<string, unknown>;
    result: Record<string, unknown> | null;
    error: string | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    updatedAt: string;
  }>;
  audits: Array<{
    id: string;
    runId: string | null;
    actorId: string;
    action: string;
    detail: Record<string, unknown>;
    createdAt: string;
  }>;
};

const statusIcon = {
  queued: Clock3,
  running: Activity,
  succeeded: CheckCircle2,
  failed: AlertTriangle,
  cancelled: AlertTriangle
} satisfies Record<JobStatus, typeof Activity>;

function formatDate(value: string | null) {
  if (!value) return "Not started";
  return new Date(value).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

function minutesBetween(start: string | null, end: string | null) {
  if (!start) return "Waiting";
  const finish = end ? new Date(end).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((finish - new Date(start).getTime()) / 60000));
  return minutes < 1 ? "Under 1 min" : `${minutes} min`;
}

export function JobsBoard({ initialData }: { initialData: JobsPayload }) {
  const [data, setData] = useState(initialData);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date());

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const nextData = (await response.json()) as JobsPayload;
      setData(nextData);
      setLastUpdatedAt(new Date());
    };
    const timer = window.setInterval(refresh, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const activeByRole = useMemo(() => {
    const map = new Map<string, JobsPayload["jobs"][number]>();
    for (const job of data.jobs) {
      if ((job.status === "queued" || job.status === "running") && !map.has(job.roleId)) {
        map.set(job.roleId, job);
      }
    }
    return map;
  }, [data.jobs]);

  const activeJobs = data.jobs.filter((job) => job.status === "queued" || job.status === "running");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Operations</h1>
          <p className="lede">Live view of agent work, background jobs, and audit activity.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)]">
          <RefreshCw size={14} />
          Updated {lastUpdatedAt.toLocaleTimeString("en-AU")}
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <span>Active jobs</span>
          <strong>{activeJobs.length}</strong>
        </div>
        <div className="metric">
          <span>Agents online</span>
          <strong>{data.roles.filter((role) => role.enabled).length}</strong>
        </div>
        <div className="metric">
          <span>Failed jobs</span>
          <strong>{data.jobs.filter((job) => job.status === "failed").length}</strong>
        </div>
        <div className="metric">
          <span>Audit events</span>
          <strong>{data.audits.length}</strong>
        </div>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Agent workbench</h2>
            <p>Who is idle, queued, or currently executing work.</p>
          </div>
        </div>
        <div className="agent-list">
          {data.roles.map((role) => {
            const activeJob = activeByRole.get(role.id);
            const state = activeJob?.status ?? (role.enabled ? "idle" : "offline");
            return (
              <div key={role.id} className="agent-row">
                <div>
                  <div className="row-title">{role.name}</div>
                  <div className="row-meta">
                    {role.roleType} agent · autonomy tier {role.autonomyCeiling} · {role.schedule ?? "manual"}
                  </div>
                </div>
                <div className="row-right">
                  <span className={`status status-${state}`}>{state}</span>
                  <span className="row-meta">{activeJob ? activeJob.type.replaceAll("-", " ") : "No active work"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Background jobs</h2>
            <p>Queued, running, and completed work across every agent.</p>
          </div>
        </div>
        <div className="job-table">
          {data.jobs.length === 0 && <p className="empty">No jobs have been queued yet.</p>}
          {data.jobs.map((job) => {
            const Icon = statusIcon[job.status];
            return (
              <div key={job.id} className="job-row">
                <div className="job-main">
                  <Icon size={16} />
                  <div>
                    <div className="row-title">{job.type.replaceAll("-", " ")}</div>
                    <div className="row-meta">
                      {job.roleName} · {job.triggerSource} · queued {formatDate(job.createdAt)}
                    </div>
                  </div>
                </div>
                <span className={`status status-${job.status}`}>{job.status}</span>
                <span className="row-meta">{minutesBetween(job.startedAt, job.finishedAt)}</span>
                <span className="row-meta">{job.runId ? job.runId.slice(0, 8) : "No run"}</span>
                {job.error && <p className="job-error">{job.error}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Recent activity</h2>
            <p>Audit events written by agents and connectors.</p>
          </div>
        </div>
        <div className="activity-list">
          {data.audits.map((entry) => (
            <div key={entry.id} className="activity-row">
              <span>{formatDate(entry.createdAt)}</span>
              <strong>{entry.action}</strong>
              <code>{JSON.stringify(entry.detail)}</code>
            </div>
          ))}
          {data.audits.length === 0 && <p className="empty">Activity will appear after an agent starts work.</p>}
        </div>
      </section>
    </div>
  );
}
