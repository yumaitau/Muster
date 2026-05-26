import { getRunDetails } from "../../../../lib/data";

export const dynamic = "force-dynamic";

export default async function RoleRunsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { runs, audits } = await getRunDetails(id);
  return (
    <section>
      <h1 className="text-3xl font-bold">Run history</h1>
      <div className="panel mt-8 divide-y divide-[var(--line)]">
        {runs.map((run) => (
          <div key={run.id} className="grid grid-cols-5 gap-3 p-4 text-sm">
            <span>{run.procedureId}</span>
            <span>{run.triggerSource}</span>
            <span className="font-semibold">{run.status}</span>
            <span>{run.startedAt?.toLocaleString("en-AU")}</span>
            <span>{run.error}</span>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-xl font-bold">Latest audit log</h2>
      <div className="panel mt-3 divide-y divide-[var(--line)]">
        {audits.map((entry) => (
          <div key={entry.id} className="grid grid-cols-3 gap-3 p-4 text-sm">
            <span>{entry.createdAt.toLocaleString("en-AU")}</span>
            <span className="font-semibold">{entry.action}</span>
            <code className="overflow-auto text-xs">{JSON.stringify(entry.detail)}</code>
          </div>
        ))}
      </div>
    </section>
  );
}
