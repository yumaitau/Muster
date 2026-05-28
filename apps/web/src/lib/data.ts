import {
  approvals,
  artifacts,
  auditLog,
  backgroundJobs,
  campaigns,
  connectorConnections,
  contentAssets,
  desc,
  eq,
  getDb,
  messageDeliveries,
  messages,
  organisations,
  roles,
  runActions,
  runs,
  tasks
} from "@muster/db";

export async function getCurrentOrg() {
  const db = getDb();
  const [org] = await db.select().from(organisations).orderBy(desc(organisations.createdAt)).limit(1);
  return org ?? null;
}

export async function getDashboardData() {
  const db = getDb();
  const org = await getCurrentOrg();
  if (!org) {
    return { org: null, report: null, runs: [], roles: [], connections: [], approvals: [], jobs: [], audits: [], tasks: [] };
  }
  const [report] = await db.select().from(artifacts).where(eq(artifacts.orgId, org.id)).orderBy(desc(artifacts.createdAt)).limit(1);
  const recentRuns = await db
    .select({ run: runs, role: roles })
    .from(runs)
    .innerJoin(roles, eq(runs.roleId, roles.id))
    .where(eq(runs.orgId, org.id))
    .orderBy(desc(runs.createdAt))
    .limit(8);
  const roleRows = await db.select().from(roles).where(eq(roles.orgId, org.id)).orderBy(desc(roles.createdAt));
  const connections = await db.select().from(connectorConnections).where(eq(connectorConnections.orgId, org.id));
  const approvalRows = await db.select().from(approvals).where(eq(approvals.orgId, org.id)).orderBy(desc(approvals.createdAt));
  const jobRows = await db
    .select({ job: backgroundJobs, role: roles })
    .from(backgroundJobs)
    .innerJoin(roles, eq(backgroundJobs.roleId, roles.id))
    .where(eq(backgroundJobs.orgId, org.id))
    .orderBy(desc(backgroundJobs.createdAt))
    .limit(12);
  const auditRows = await db.select().from(auditLog).where(eq(auditLog.orgId, org.id)).orderBy(desc(auditLog.createdAt)).limit(8);
  const taskRows = await db.select().from(tasks).where(eq(tasks.orgId, org.id)).orderBy(desc(tasks.createdAt)).limit(20);
  return { org, report: report ?? null, runs: recentRuns, roles: roleRows, connections, approvals: approvalRows, jobs: jobRows, audits: auditRows, tasks: taskRows };
}

export async function getRoleData() {
  const db = getDb();
  const org = await getCurrentOrg();
  if (!org) {
    return { org: null, roles: [], connections: [] };
  }
  const roleRows = await db.select().from(roles).where(eq(roles.orgId, org.id)).orderBy(desc(roles.createdAt));
  const connections = await db.select().from(connectorConnections).where(eq(connectorConnections.orgId, org.id));
  return { org, roles: roleRows, connections };
}

export async function getRunDetails(roleId: string) {
  const db = getDb();
  const org = await getCurrentOrg();
  if (!org) {
    return { org: null, runs: [], audits: [], role: null };
  }
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
  const roleRuns = await db.select().from(runs).where(eq(runs.roleId, roleId)).orderBy(desc(runs.createdAt));
  const latestRun = roleRuns[0];
  const audits = latestRun
    ? await db.select().from(auditLog).where(eq(auditLog.runId, latestRun.id)).orderBy(desc(auditLog.createdAt))
    : [];
  return { org, runs: roleRuns, audits, role: role ?? null };
}

export async function getApprovalQueue() {
  const db = getDb();
  const org = await getCurrentOrg();
  if (!org) return { org: null, approvals: [] };
  const rows = await db
    .select({ approval: approvals, action: runActions, run: runs, role: roles })
    .from(approvals)
    .innerJoin(runActions, eq(approvals.runActionId, runActions.id))
    .innerJoin(runs, eq(runActions.runId, runs.id))
    .innerJoin(roles, eq(runs.roleId, roles.id))
    .where(eq(approvals.orgId, org.id))
    .orderBy(desc(approvals.createdAt));
  return { org, approvals: rows };
}

export async function getMessagesData() {
  const db = getDb();
  const org = await getCurrentOrg();
  if (!org) return { org: null, messages: [], deliveries: [] };
  const messageRows = await db.select().from(messages).where(eq(messages.orgId, org.id)).orderBy(desc(messages.createdAt));
  const deliveryRows = await db.select().from(messageDeliveries).where(eq(messageDeliveries.orgId, org.id)).orderBy(desc(messageDeliveries.createdAt));
  return { org, messages: messageRows, deliveries: deliveryRows };
}

export async function getAdminData() {
  const db = getDb();
  const org = await getCurrentOrg();
  if (!org) return { org: null, tasks: [], campaigns: [], assets: [] };
  const taskRows = await db.select().from(tasks).where(eq(tasks.orgId, org.id)).orderBy(desc(tasks.createdAt));
  const campaignRows = await db.select().from(campaigns).where(eq(campaigns.orgId, org.id)).orderBy(desc(campaigns.createdAt));
  const assetRows = await db.select().from(contentAssets).where(eq(contentAssets.orgId, org.id)).orderBy(desc(contentAssets.createdAt));
  return { org, tasks: taskRows, campaigns: campaignRows, assets: assetRows };
}

export async function getJobsData() {
  const db = getDb();
  const org = await getCurrentOrg();
  if (!org) return { org: null, jobs: [], roles: [], audits: [] };
  const jobRows = await db
    .select({ job: backgroundJobs, role: roles })
    .from(backgroundJobs)
    .innerJoin(roles, eq(backgroundJobs.roleId, roles.id))
    .where(eq(backgroundJobs.orgId, org.id))
    .orderBy(desc(backgroundJobs.createdAt))
    .limit(50);
  const roleRows = await db.select().from(roles).where(eq(roles.orgId, org.id)).orderBy(desc(roles.createdAt));
  const auditRows = await db.select().from(auditLog).where(eq(auditLog.orgId, org.id)).orderBy(desc(auditLog.createdAt)).limit(30);
  return { org, jobs: jobRows, roles: roleRows, audits: auditRows };
}
