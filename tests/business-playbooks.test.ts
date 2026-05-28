import { describe, expect, it } from "vitest";
import { buildPlaybookTasks, businessPlaybooks, taskAutomationSummary } from "../apps/web/src/lib/business-playbooks";

describe("business playbooks", () => {
  it("builds dated tasks from selected playbooks", () => {
    const tasks = buildPlaybookTasks({
      orgId: "org-1",
      playbookIds: ["weekly-finance-control"],
      now: new Date("2026-05-28T09:00:00+10:00")
    });

    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({
      orgId: "org-1",
      assignee: "Finance",
      sourceConnectorId: "muster.playbook",
      externalId: "weekly-finance-control:reconcile-bank-feed"
    });
    expect(tasks[0]?.dueAt?.toISOString().startsWith("2026-05-29")).toBe(true);
  });

  it("does not rebuild tasks that already exist", () => {
    const tasks = buildPlaybookTasks({
      orgId: "org-1",
      playbookIds: ["supplier-bill-intake"],
      existingTasks: [
        {
          metadata: {
            playbookTaskKey: "supplier-bill-intake:confirm-invoice-source"
          }
        }
      ],
      now: new Date("2026-05-28T09:00:00+10:00")
    });

    expect(tasks.map((task) => task.externalId)).not.toContain("supplier-bill-intake:confirm-invoice-source");
    expect(tasks).toHaveLength(2);
  });

  it("covers common operating categories", () => {
    const categories = new Set(businessPlaybooks.map((playbook) => playbook.category));

    expect(categories).toEqual(new Set(["finance", "sales", "people", "marketing", "operations", "service", "compliance"]));
  });

  it("summarises automated work", () => {
    const dueAt = new Date("2026-05-27T09:00:00+10:00");
    const summary = taskAutomationSummary([
      { status: "open", assignee: "Finance", dueAt, metadata: { playbookId: "weekly-finance-control" } },
      { status: "done", assignee: null, dueAt: null, metadata: {} }
    ]);

    expect(summary.activeCount).toBe(1);
    expect(summary.automatedCount).toBe(1);
  });
});
