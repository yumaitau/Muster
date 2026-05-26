import Link from "next/link";
import { PlugZap } from "lucide-react";
import { getRoleData } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function ConnectorsPage() {
  const { org, connections } = await getRoleData();
  const xero = connections.find((connection) => connection.connectorId === "xero");
  return (
    <section>
      <h1 className="text-3xl font-bold">Connectors</h1>
      <p className="mt-3 max-w-2xl text-sm">Connect the tools Muster reads from and acts through. The MVP only enables Xero.</p>
      <div className="panel mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-xl font-bold">Xero</h2>
          <p className="mt-2 text-sm">{xero ? `Connected as ${xero.displayName}` : "Read balance sheet reports for the Finance role."}</p>
          {!org && <p className="mt-2 text-sm">Complete setup before connecting Xero.</p>}
        </div>
        {org && (
          <Link href={`/api/connectors/xero/callback?start=1&orgId=${org.id}`} className="button">
            <PlugZap size={16} /> {xero ? "Reconnect" : "Connect Xero"}
          </Link>
        )}
      </div>
    </section>
  );
}
