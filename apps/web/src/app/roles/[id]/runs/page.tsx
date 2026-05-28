import { getRunDetails } from "../../../../lib/data";

export const dynamic = "force-dynamic";

export default async function RoleRunsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { runs, audits, role } = await getRunDetails(id);
  return (
    <section className="grid gap-6">
      <div>
        <h1 className="page-title">{role?.name ?? "Agent"} runs</h1>
        <p className="lede">Execution history, run outcomes, and the latest audit events.</p>
      </div>
      <div className="panel divide-y divide-[var(--line)]">
        {runs.map((run) => (
          <div key={run.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-3 p-4 text-sm">
            <span className="font-semibold">{run.procedureId}</span>
            <span>{run.triggerSource}</span>
            <span className={`status status-${run.status}`}>{run.status}</span>
            <span>{run.startedAt?.toLocaleString("en-AU") ?? "Not started"}</span>
            {run.error && <p className="col-span-full text-[var(--danger)]">{run.error}</p>}
          </div>
        ))}
        {runs.length === 0 && <p className="empty">No runs have started for this agent.</p>}
      </div>
      <div className="panel divide-y divide-[var(--line)]">
        <div className="section-heading">
          <div>
            <h2>Latest audit log</h2>
            <p>Connector, model, and engine events from the newest run.</p>
          </div>
        </div>
        {audits.map((entry) => (
          <div key={entry.id} className="grid grid-cols-[180px_220px_1fr] gap-3 p-4 text-sm">
            <span>{entry.createdAt.toLocaleString("en-AU")}</span>
            <span className="font-semibold">{entry.action}</span>
            <code className="overflow-auto text-xs">{JSON.stringify(entry.detail)}</code>
          </div>
        ))}
        {audits.length === 0 && <p className="empty">No audit entries yet.</p>}
      </div>
    </section>
  );
}
