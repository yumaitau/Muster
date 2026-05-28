import { CheckSquare, ClipboardList, Sparkles } from "lucide-react";
import { getAdminData } from "../../lib/data";
import { businessPlaybooks, taskAutomationSummary } from "../../lib/business-playbooks";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { tasks, campaigns, assets } = await getAdminData();
  const now = Date.now();
  const overdue = tasks.filter((task) => task.dueAt && task.dueAt.getTime() < now && task.status !== "done");
  const unassigned = tasks.filter((task) => !task.assignee && task.status !== "done");
  const summary = taskAutomationSummary(tasks);
  const installed = new Set(
    tasks
      .map((task) => {
        const metadata = task.metadata as Record<string, unknown>;
        return typeof metadata.playbookId === "string" ? metadata.playbookId : null;
      })
      .filter((id): id is string => Boolean(id))
  );

  return (
    <section className="grid gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="lede">Standard operating tasks, campaign assets and committee readiness.</p>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <span>Active tasks</span>
          <strong>{summary.activeCount}</strong>
        </div>
        <div className="metric">
          <span>Automated tasks</span>
          <strong>{summary.automatedCount}</strong>
        </div>
        <div className="metric">
          <span>Overdue tasks</span>
          <strong>{overdue.length}</strong>
        </div>
        <div className="metric">
          <span>Content assets</span>
          <strong>{assets.length}</strong>
        </div>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Business automation playbooks</h2>
            <p>Install common operating routines as assigned, dated tasks.</p>
          </div>
          <Sparkles size={18} />
        </div>
        <form action="/api/admin/playbooks" method="post" className="playbook-grid">
          {businessPlaybooks.map((playbook) => {
            const isInstalled = installed.has(playbook.id);
            return (
              <label key={playbook.id} className="playbook-option">
                <input name="playbookIds" type="checkbox" value={playbook.id} defaultChecked={!isInstalled} disabled={isInstalled} />
                <span>
                  <strong>{playbook.name}</strong>
                  <small>{playbook.category} · {playbook.trigger}</small>
                  <em>{playbook.description}</em>
                </span>
                {isInstalled && <span className="status status-succeeded">installed</span>}
              </label>
            );
          })}
          <div className="playbook-actions">
            <button className="button" type="submit">
              <CheckSquare size={16} />
              Install selected playbooks
            </button>
          </div>
        </form>
      </section>

      {(unassigned.length > 0 || overdue.length > 0) && (
        <div className="notice warning">
          <ClipboardList size={18} />
          <div>
            <strong>Work needs triage.</strong>
            <span>{overdue.length} overdue and {unassigned.length} unassigned tasks should be reviewed before the next reporting cycle.</span>
          </div>
        </div>
      )}

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Tasks</h2>
            <p>Current operational work across manual and automated routines.</p>
          </div>
        </div>
        <div className="task-table">
          {tasks.map((task) => {
            const metadata = task.metadata as Record<string, unknown>;
            return (
              <div key={task.id} className="task-row">
                <div>
                  <div className="row-title">{task.title}</div>
                  <div className="row-meta">
                    {typeof metadata.playbookName === "string" ? metadata.playbookName : task.sourceConnectorId ?? "Manual task"}
                  </div>
                </div>
                <span>{task.assignee ?? "Unassigned"}</span>
                <span>{task.dueAt?.toLocaleDateString("en-AU") ?? "No due date"}</span>
                <span className={`status status-${task.status === "done" ? "succeeded" : task.status === "blocked" ? "failed" : "idle"}`}>
                  {task.status}
                </span>
              </div>
            );
          })}
          {tasks.length === 0 && <p className="empty">Install a playbook to create the first operating tasks.</p>}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Campaigns</h2>
              <p>Planned initiatives and communications work.</p>
            </div>
          </div>
          <div className="compact-list">
            {campaigns.map((campaign) => <div key={campaign.id} className="compact-row"><strong>{campaign.name}</strong></div>)}
            {campaigns.length === 0 && <p className="empty">Campaigns will appear after they are created.</p>}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Assets</h2>
              <p>Content and documents attached to operating work.</p>
            </div>
          </div>
          <div className="compact-list">
            {assets.map((asset) => (
              <div key={asset.id} className="compact-row">
                <div>
                  <strong>{asset.title}</strong>
                  <span>{asset.type}</span>
                </div>
              </div>
            ))}
            {assets.length === 0 && <p className="empty">No content assets yet.</p>}
          </div>
        </section>
      </div>
    </section>
  );
}
