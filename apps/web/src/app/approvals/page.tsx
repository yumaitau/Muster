import { Check, X } from "lucide-react";
import { getApprovalQueue } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const { approvals } = await getApprovalQueue();
  const pending = approvals.filter((row) => row.approval.status === "pending");
  return (
    <section>
      <h1 className="text-3xl font-bold">Approvals</h1>
      <p className="mt-3 max-w-2xl text-sm">Actions that move money or publish externally wait here until an owner or admin decides them.</p>
      <div className="panel mt-8 divide-y divide-[var(--line)]">
        {pending.length === 0 && <p className="p-5 text-sm">No pending approvals.</p>}
        {pending.map(({ approval, action, run, role }) => (
          <div key={approval.id} className="grid gap-4 p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-bold">{action.capabilityId}</h2>
                <p className="mt-1 text-sm">{role.name} proposed this during {run.procedureId}.</p>
              </div>
              <span className="text-sm font-semibold">{approval.createdAt.toLocaleString("en-AU")}</span>
            </div>
            <pre className="overflow-auto rounded-md bg-[var(--muted)] p-3 text-xs">{JSON.stringify(action.payload, null, 2)}</pre>
            <div className="flex flex-wrap gap-2">
              <form action={`/api/approvals/${approval.id}/decide`} method="post">
                <input type="hidden" name="decision" value="approved" />
                <button className="button" type="submit"><Check size={16} /> Approve</button>
              </form>
              <form action={`/api/approvals/${approval.id}/decide`} method="post" className="flex gap-2">
                <input type="hidden" name="decision" value="rejected" />
                <input name="note" required placeholder="Reason" />
                <button className="button secondary" type="submit"><X size={16} /> Reject</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
