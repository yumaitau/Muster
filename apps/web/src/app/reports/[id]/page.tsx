import { artifacts, eq, getDb } from "@muster/db";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [report] = await getDb().select().from(artifacts).where(eq(artifacts.id, id)).limit(1);
  if (!report) {
    return <h1 className="text-3xl font-bold">Report not found</h1>;
  }
  const content = report.content as { narrative?: string; balanceSheet?: unknown; generatedAt?: string };
  return (
    <section>
      <h1 className="text-3xl font-bold">{report.title}</h1>
      <p className="mt-2 text-sm">{content.generatedAt ? new Date(content.generatedAt).toLocaleString("en-AU") : ""}</p>
      <div className="panel mt-8 p-6">
        <h2 className="text-xl font-bold">Narrative</h2>
        <p className="mt-4 max-w-3xl leading-7">{content.narrative}</p>
      </div>
      <div className="panel mt-6 p-6">
        <h2 className="text-xl font-bold">Raw balance sheet</h2>
        <pre className="mt-4 overflow-auto text-xs">{JSON.stringify(content.balanceSheet, null, 2)}</pre>
      </div>
    </section>
  );
}
