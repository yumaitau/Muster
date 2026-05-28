import Link from "next/link";
import { KeyRound, Play, PlugZap } from "lucide-react";
import { getRoleData } from "../../lib/data";
import { customApiDefinitionSchema } from "../../lib/custom-api-action";

export const dynamic = "force-dynamic";

export default async function ConnectorsPage() {
  const { org, connections } = await getRoleData();
  const xero = connections.find((connection) => connection.connectorId === "xero");
  const customApis = connections.filter((connection) => connection.connectorId === "custom-api");
  return (
    <section className="grid gap-7">
      <div>
        <h1 className="page-title">Connectors</h1>
        <p className="lede">Connect the tools Muster reads from and acts through, including custom APIs that do not need a packaged connector.</p>
      </div>

      <div className="panel flex flex-wrap items-center justify-between gap-4 p-6">
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

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Action API agent</h2>
            <p>Teach Muster how to call a private or niche business API with guarded execution.</p>
          </div>
          <KeyRound size={18} />
        </div>
        <form action="/api/connectors/custom-api" method="post" className="connector-form">
          <label>
            <span>Action name</span>
            <input name="displayName" required placeholder="Create CRM follow-up" />
          </label>
          <label>
            <span>Endpoint URL</span>
            <input name="endpointUrl" type="url" required placeholder="https://api.example.com/v1/tasks" />
          </label>
          <label>
            <span>Method</span>
            <select name="method" defaultValue="POST">
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="GET">GET</option>
            </select>
          </label>
          <label>
            <span>Auth type</span>
            <select name="authType" defaultValue="bearer">
              <option value="bearer">Bearer token</option>
              <option value="apiKey">API key header</option>
              <option value="basic">Basic auth</option>
              <option value="none">No auth</option>
            </select>
          </label>
          <label>
            <span>Bearer token</span>
            <input name="bearerToken" type="password" autoComplete="off" />
          </label>
          <label>
            <span>API key header</span>
            <input name="apiKeyHeader" placeholder="X-API-Key" />
          </label>
          <label>
            <span>API key value</span>
            <input name="apiKeyValue" type="password" autoComplete="off" />
          </label>
          <label>
            <span>Basic username</span>
            <input name="basicUsername" autoComplete="off" />
          </label>
          <label>
            <span>Basic password</span>
            <input name="basicPassword" type="password" autoComplete="off" />
          </label>
          <label className="wide">
            <span>API docs or operating notes</span>
            <textarea name="documentation" placeholder="Paste the relevant API behaviour, limits, idempotency rules or example responses." />
          </label>
          <label className="wide">
            <span>Extra headers JSON</span>
            <textarea name="headers" placeholder={'{ "Idempotency-Key": "{{input.requestId}}" }'} />
          </label>
          <label className="wide">
            <span>Request body template</span>
            <textarea
              name="bodyTemplate"
              defaultValue={'{ "title": "{{input.title}}", "due_date": "{{input.dueDate}}", "notes": "{{input.notes}}" }'}
            />
          </label>
          <label className="wide">
            <span>Expected output schema</span>
            <textarea name="outputSchema" defaultValue={'{ "type": "object", "required": ["id"], "properties": { "id": { "type": "string" } } }'} />
          </label>
          <label className="checkbox-row wide">
            <input name="requiresApproval" type="hidden" value="false" />
            <input name="requiresApproval" type="checkbox" value="true" defaultChecked />
            <span>Require approval before this API is called</span>
          </label>
          <div className="form-actions wide">
            <button className="button" type="submit">
              <PlugZap size={16} />
              Save custom API action
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Custom API actions</h2>
            <p>Run saved actions with a JSON input payload. Approval-required actions move to the approvals queue first.</p>
          </div>
        </div>
        <div className="custom-api-list">
          {customApis.map((connection) => {
            const definition = customApiDefinitionSchema.parse(connection.metadata);
            return (
              <div key={connection.id} className="custom-api-row">
                <div>
                  <div className="row-title">{connection.displayName}</div>
                  <div className="row-meta">
                    {definition.method} {definition.endpointUrl} · {definition.requiresApproval ? "approval required" : "executes immediately"}
                  </div>
                </div>
                <form action="/api/custom-api/actions" method="post" className="custom-api-runner">
                  <input type="hidden" name="connectionId" value={connection.id} />
                  <textarea name="inputJson" defaultValue={'{ "title": "Follow up new enquiry", "dueDate": "2026-06-01", "notes": "Created from Muster" }'} />
                  <button className="button secondary" type="submit">
                    <Play size={16} />
                    Run
                  </button>
                </form>
              </div>
            );
          })}
          {customApis.length === 0 && <p className="empty">No custom API actions yet.</p>}
        </div>
      </section>
    </section>
  );
}
