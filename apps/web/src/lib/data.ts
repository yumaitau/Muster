import { artifacts, auditLog, connectorConnections, desc, eq, getDb, organisations, roles, runs } from "@muster/db";

export async function getCurrentOrg() {
  const db = getDb();
  const [org] = await db.select().from(organisations).orderBy(desc(organisations.createdAt)).limit(1);
  return org ?? null;
}

export async function getDashboardData() {
  const db = getDb();
  const org = await getCurrentOrg();
  if (!org) {
    return { org: null, report: null, runs: [] };
  }
  const [report] = await db.select().from(artifacts).where(eq(artifacts.orgId, org.id)).orderBy(desc(artifacts.createdAt)).limit(1);
  const recentRuns = await db.select().from(runs).where(eq(runs.orgId, org.id)).orderBy(desc(runs.createdAt)).limit(8);
  return { org, report: report ?? null, runs: recentRuns };
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
    return { org: null, runs: [], audits: [] };
  }
  const roleRuns = await db.select().from(runs).where(eq(runs.roleId, roleId)).orderBy(desc(runs.createdAt));
  const latestRun = roleRuns[0];
  const audits = latestRun
    ? await db.select().from(auditLog).where(eq(auditLog.runId, latestRun.id)).orderBy(desc(auditLog.createdAt))
    : [];
  return { org, runs: roleRuns, audits };
}
