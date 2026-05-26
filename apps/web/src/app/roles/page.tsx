import Link from "next/link";
import { Clock, Play } from "lucide-react";
import { getRoleData } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const { roles, connections } = await getRoleData();
  const hasXero = connections.some((connection) => connection.connectorId === "xero" && connection.status === "connected");
  return (
    <section>
      <h1 className="text-3xl font-bold">Roles</h1>
      <p className="mt-3 max-w-2xl text-sm">Digital roles run procedures on a schedule or on demand. The MVP includes Finance.</p>
      <div className="mt-8 grid gap-5">
        {roles.map((role) => (
          <div key={role.id} className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{role.name}</h2>
                <p className="mt-2 text-sm">Autonomy tier {role.autonomyCeiling}. Schedule: {role.schedule ?? "not set"}.</p>
                {!hasXero && <p className="mt-2 text-sm font-semibold">Connect Xero before running Finance.</p>}
              </div>
              <div className="flex gap-2">
                <form action={`/api/roles/${role.id}/run-now`} method="post">
                  <button className="button" disabled={!hasXero} type="submit"><Play size={16} /> Run now</button>
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
          </div>
        ))}
      </div>
    </section>
  );
}
