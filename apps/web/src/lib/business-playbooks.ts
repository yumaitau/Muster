import type { tasks } from "@muster/db";

export type TaskInsert = typeof tasks.$inferInsert;
export type TaskRow = typeof tasks.$inferSelect;

export type PlaybookTask = {
  id: string;
  title: string;
  assignee: string;
  dueInDays: number;
  status?: "open" | "in_progress" | "done" | "blocked";
  automation: string;
};

export type BusinessPlaybook = {
  id: string;
  name: string;
  category: "finance" | "sales" | "operations" | "people" | "marketing" | "service" | "compliance";
  description: string;
  trigger: string;
  tasks: PlaybookTask[];
};

export const businessPlaybooks: BusinessPlaybook[] = [
  {
    id: "weekly-finance-control",
    name: "Weekly finance control",
    category: "finance",
    description: "Close the weekly finance loop with reconciliation, exceptions and committee-ready reporting.",
    trigger: "Every Monday morning",
    tasks: [
      { id: "reconcile-bank-feed", title: "Review unmatched bank feed items", assignee: "Finance", dueInDays: 1, automation: "Queue Xero finance report and flag exceptions." },
      { id: "check-payables", title: "Check bills due in the next 7 days", assignee: "Finance", dueInDays: 1, automation: "Surface supplier bills for approval before payment dates." },
      { id: "publish-committee-note", title: "Prepare weekly finance note", assignee: "Finance", dueInDays: 2, automation: "Generate a plain-English finance narrative from the latest report." }
    ]
  },
  {
    id: "supplier-bill-intake",
    name: "Supplier bill intake",
    category: "finance",
    description: "Capture supplier invoices from email, route them for approval and keep source documents attached.",
    trigger: "When a supplier email arrives",
    tasks: [
      { id: "confirm-invoice-source", title: "Confirm invoice source and supplier identity", assignee: "Finance", dueInDays: 0, automation: "Parse inbound email and preserve source details in the intake record." },
      { id: "review-draft-bill", title: "Review extracted draft bill", assignee: "Finance", dueInDays: 1, automation: "Create an approval item before any accounting write." },
      { id: "resolve-missing-fields", title: "Resolve missing invoice fields", assignee: "Finance", dueInDays: 2, automation: "Use intake metadata to identify missing supplier, amount, due date or account code." }
    ]
  },
  {
    id: "customer-follow-up",
    name: "Customer follow-up",
    category: "sales",
    description: "Keep lead and customer promises moving with reminders, owners and next actions.",
    trigger: "When a new enquiry or deal task is created",
    tasks: [
      { id: "acknowledge-enquiry", title: "Acknowledge new enquiry", assignee: "Admin", dueInDays: 0, automation: "Create a same-day response task from intake." },
      { id: "schedule-next-step", title: "Schedule the next customer step", assignee: "Admin", dueInDays: 2, automation: "Add a dated follow-up so work cannot disappear in email." },
      { id: "close-loop", title: "Close the loop with outcome and notes", assignee: "Admin", dueInDays: 7, automation: "Store the final outcome on the task metadata for reporting." }
    ]
  },
  {
    id: "employee-onboarding",
    name: "Employee or volunteer onboarding",
    category: "people",
    description: "Standardise access, policy acknowledgement and first-week check-ins.",
    trigger: "When a new person joins",
    tasks: [
      { id: "collect-details", title: "Collect onboarding details and emergency contacts", assignee: "Admin", dueInDays: 0, automation: "Start with a structured checklist rather than an email thread." },
      { id: "provision-access", title: "Provision required systems access", assignee: "Admin", dueInDays: 1, automation: "Track access requests as owner-assigned tasks." },
      { id: "first-week-checkin", title: "Complete first-week onboarding check-in", assignee: "Admin", dueInDays: 7, automation: "Create a reminder before context is lost." }
    ]
  },
  {
    id: "campaign-launch",
    name: "Campaign launch",
    category: "marketing",
    description: "Move campaign work from draft to approval, scheduling and post-launch review.",
    trigger: "When a campaign is approved",
    tasks: [
      { id: "draft-campaign-message", title: "Draft campaign message and audience", assignee: "Comms", dueInDays: 1, automation: "Use message records to prepare multi-channel copy once." },
      { id: "approve-campaign-message", title: "Approve external campaign message", assignee: "Comms", dueInDays: 2, automation: "Route publish actions through the approvals queue." },
      { id: "review-campaign-results", title: "Review campaign delivery outcomes", assignee: "Comms", dueInDays: 10, automation: "Tie delivery records back to the campaign task." }
    ]
  },
  {
    id: "event-delivery",
    name: "Event delivery",
    category: "operations",
    description: "Coordinate venues, suppliers, communications and wrap-up for repeatable events.",
    trigger: "When an event date is set",
    tasks: [
      { id: "confirm-venue-suppliers", title: "Confirm venue, suppliers and purchase needs", assignee: "Admin", dueInDays: 2, automation: "Create supplier and payment tasks before the event rush." },
      { id: "send-event-reminders", title: "Send attendee or member reminders", assignee: "Comms", dueInDays: 5, automation: "Queue approved reminders through connected channels." },
      { id: "complete-event-wrap", title: "Complete event wrap-up and invoices", assignee: "Admin", dueInDays: 12, automation: "Capture follow-ups and outstanding supplier bills." }
    ]
  },
  {
    id: "service-issue",
    name: "Customer service issue",
    category: "service",
    description: "Triage issues, assign ownership and make sure every case has a documented outcome.",
    trigger: "When a complaint or support issue arrives",
    tasks: [
      { id: "triage-issue", title: "Triage issue severity and owner", assignee: "Admin", dueInDays: 0, automation: "Classify incoming work and assign a named owner." },
      { id: "respond-with-plan", title: "Respond with next steps", assignee: "Admin", dueInDays: 1, automation: "Create a dated response task to protect service levels." },
      { id: "document-resolution", title: "Document resolution and prevention action", assignee: "Admin", dueInDays: 5, automation: "Capture final notes for recurring-issue reporting." }
    ]
  },
  {
    id: "month-end-governance",
    name: "Month-end governance",
    category: "compliance",
    description: "Prepare month-end controls, approvals and records for managers, boards or committees.",
    trigger: "Last week of the month",
    tasks: [
      { id: "review-open-approvals", title: "Review open approvals and exceptions", assignee: "Admin", dueInDays: 1, automation: "Use the approvals queue as the control list." },
      { id: "archive-key-records", title: "Archive key reports and source documents", assignee: "Admin", dueInDays: 3, automation: "Store artifacts and intake references with the month-end task." },
      { id: "publish-monthly-summary", title: "Publish monthly operating summary", assignee: "Admin", dueInDays: 5, automation: "Combine finance, tasks and message delivery status into a board-ready summary." }
    ]
  }
];

function dueDateFromOffset(now: Date, offsetDays: number) {
  const due = new Date(now);
  due.setDate(due.getDate() + offsetDays);
  due.setHours(17, 0, 0, 0);
  return due;
}

function taskKey(playbookId: string, taskId: string) {
  return `${playbookId}:${taskId}`;
}

export function findPlaybooks(ids: string[]) {
  const requested = new Set(ids);
  return businessPlaybooks.filter((playbook) => requested.has(playbook.id));
}

export function buildPlaybookTasks(input: {
  orgId: string;
  playbookIds: string[];
  existingTasks?: Pick<TaskRow, "metadata">[];
  now?: Date;
}): TaskInsert[] {
  const now = input.now ?? new Date();
  const existing = new Set(
    (input.existingTasks ?? [])
      .map((task) => {
        const metadata = task.metadata as Record<string, unknown>;
        return typeof metadata.playbookTaskKey === "string" ? metadata.playbookTaskKey : null;
      })
      .filter((key): key is string => Boolean(key))
  );

  return findPlaybooks(input.playbookIds).flatMap((playbook) =>
    playbook.tasks
      .filter((task) => !existing.has(taskKey(playbook.id, task.id)))
      .map((task) => ({
        orgId: input.orgId,
        title: task.title,
        assignee: task.assignee,
        dueAt: dueDateFromOffset(now, task.dueInDays),
        status: task.status ?? "open",
        sourceConnectorId: "muster.playbook",
        externalId: taskKey(playbook.id, task.id),
        metadata: {
          playbookId: playbook.id,
          playbookName: playbook.name,
          playbookCategory: playbook.category,
          playbookTaskId: task.id,
          playbookTaskKey: taskKey(playbook.id, task.id),
          trigger: playbook.trigger,
          automation: task.automation
        }
      }))
  );
}

export function taskAutomationSummary(tasks: Pick<TaskRow, "status" | "dueAt" | "assignee" | "metadata">[]) {
  const now = Date.now();
  const active = tasks.filter((task) => task.status !== "done");
  const automated = tasks.filter((task) => {
    const metadata = task.metadata as Record<string, unknown>;
    return typeof metadata.playbookId === "string";
  });

  return {
    activeCount: active.length,
    automatedCount: automated.length,
    overdueCount: active.filter((task) => task.dueAt && task.dueAt.getTime() < now).length,
    unassignedCount: active.filter((task) => !task.assignee).length
  };
}
