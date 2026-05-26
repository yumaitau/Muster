import Link from "next/link";
import { Play } from "lucide-react";
import { getDashboardData } from "../lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { org, report, runs } = await getDashboardData();
  if (!org) {
    return (
      <section>
        <h1 className="text-3xl font-bold">First run setup</h1>
        <p className="mt-3 max-w-2xl text-sm">Create the organisation and owner account before connecting Xero.</p>
        <Link href="/setup" className="button mt-6">Start setup</Link>
      </section>
    );
  }

  const content = report?.content as { narrative?: string; generatedAt?: string } | undefined;
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{org.name}</h1>
          <p className="mt-2 text-sm text-neutral-700">Latest finance position and recent automation runs.</p>
        </div>
        <Link href="/roles" className="button"><Play size={16} /> Run finance report</Link>
      </div>

      <div className="panel mt-8 p-6">
        <h2 className="text-xl font-bold">Latest finance report</h2>
        {report ? (
          <>
            <p className="mt-1 text-sm text-neutral-600">{content?.generatedAt ? new Date(content.generatedAt).toLocaleString("en-AU") : ""}</p>
            <p className="mt-5 max-w-3xl leading-7">{content?.narrative}</p>
            <Link href={`/reports/${report.id}`} className="button secondary mt-5">Open report</Link>
          </>
        ) : (
          <p className="mt-4 text-sm">No finance report has been generated yet.</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold">Recent runs</h2>
        <div className="panel mt-3 divide-y divide-[var(--line)]">
          {runs.map((run) => (
            <div key={run.id} className="grid grid-cols-4 gap-3 p-4 text-sm">
              <span>{run.procedureId}</span>
              <span>{run.triggerSource}</span>
              <span className="font-semibold">{run.status}</span>
              <span>{run.createdAt.toLocaleString("en-AU")}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
