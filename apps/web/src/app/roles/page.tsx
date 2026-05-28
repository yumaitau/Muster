import Link from "next/link";
import { Clock, Mail, Play } from "lucide-react";
import { getRoleData } from "../../lib/data";
import { inboundAddressForSlug } from "../../lib/inbound-email";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const { org, roles, connections } = await getRoleData();
  const hasXero = connections.some((connection) => connection.connectorId === "xero" && connection.status === "connected");
  return (
    <section className="grid gap-6">
      <div>
        <h1 className="page-title">Agents</h1>
        <p className="lede">Configure autonomy, schedules, and on-demand procedures for each digital role.</p>
      </div>
      <div className="grid gap-5">
        {roles.map((role) => (
          <div key={role.id} className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold">{role.name}</h2>
                  <span className={`status status-${role.enabled ? "idle" : "offline"}`}>{role.enabled ? "enabled" : "disabled"}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {role.roleType} agent · autonomy tier {role.autonomyCeiling} · schedule {role.schedule ?? "manual only"}
                </p>
                {!hasXero && role.roleType === "finance" && <p className="mt-2 text-sm font-semibold">Connect Xero before running Finance.</p>}
              </div>
              <div className="flex gap-2">
                <form action={`/api/roles/${role.id}/run-now`} method="post">
                  <button className="button" disabled={role.roleType !== "finance" || !hasXero} type="submit"><Play size={16} /> Queue job</button>
                </form>
                <Link className="button secondary" href={`/roles/${role.id}/runs`}><Clock size={16} /> Runs</Link>
              </div>
            </div>
            <form action={`/api/roles/${role.id}`} method="post" className="mt-5 flex flex-wrap gap-3">
              <select name="enabled" defaultValue={role.enabled ? "true" : "false"}>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
              <select name="autonomyCeiling" defaultValue={role.autonomyCeiling}>
                <option value="0">Tier 0, observe and report</option>
                <option value="1">Tier 1, draft only</option>
                <option value="2">Tier 2, guarded action</option>
                <option value="3">Tier 3, autonomous</option>
              </select>
              <input name="schedule" defaultValue={role.schedule ?? "0 9 * * 1"} aria-label="Cron schedule" />
              <button className="button secondary" type="submit">Save</button>
            </form>
            {role.roleType === "finance" && (
              <div className="mt-5 grid max-w-2xl gap-4">
                {org && (
                  <div className="notice">
                    <Mail size={18} />
                    <div>
                      <strong>Finance inbox</strong>
                      <span>Forward supplier bills to {inboundAddressForSlug(org.slug)}. PDF attachments are queued and uploaded to Xero Files.</span>
                    </div>
                  </div>
                )}
                <form action="/api/finance/invoices" method="post" className="grid gap-3">
                  <textarea name="description" className="min-h-24 rounded-md border border-[var(--line)] bg-transparent p-3 text-sm" placeholder="Paste supplier invoice details for draft bill extraction" />
                  <button className="button secondary w-fit" type="submit">Queue draft bill</button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
