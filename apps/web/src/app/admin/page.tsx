import { getAdminData } from "../../lib/data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { tasks, campaigns, assets } = await getAdminData();
  const now = Date.now();
  const overdue = tasks.filter((task) => task.dueAt && task.dueAt.getTime() < now && task.status !== "done");
  const unassigned = tasks.filter((task) => !task.assignee && task.status !== "done");
  return (
    <section>
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="mt-3 max-w-2xl text-sm">Task status, campaign assets and weekly committee readiness.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="panel p-5"><strong>{overdue.length}</strong><p className="text-sm">Overdue tasks</p></div>
        <div className="panel p-5"><strong>{unassigned.length}</strong><p className="text-sm">Unassigned tasks</p></div>
        <div className="panel p-5"><strong>{assets.length}</strong><p className="text-sm">Content assets</p></div>
      </div>
      <h2 className="mt-8 text-xl font-bold">Tasks</h2>
      <div className="panel mt-3 divide-y divide-[var(--line)]">
        {tasks.map((task) => (
          <div key={task.id} className="grid grid-cols-4 gap-3 p-4 text-sm">
            <span>{task.title}</span>
            <span>{task.assignee ?? "Unassigned"}</span>
            <span>{task.dueAt?.toLocaleDateString("en-AU") ?? "No due date"}</span>
            <span>{task.status}</span>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-xl font-bold">Campaigns</h2>
      <div className="panel mt-3 divide-y divide-[var(--line)]">
        {campaigns.map((campaign) => <div key={campaign.id} className="p-4 text-sm">{campaign.name}</div>)}
      </div>
    </section>
  );
}
