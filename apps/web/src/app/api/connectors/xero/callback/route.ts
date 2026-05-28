import { NextResponse } from "next/server";
import { createXeroAuthorizationUrl, exchangeXeroCode } from "@muster/connector-xero";
import { encryptJson } from "@muster/core";
import { and, connectorConnections, eq, getDb, organisations, roleConnectorBindings, roles } from "@muster/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const db = getDb();
  const orgId = url.searchParams.get("orgId");
  if (url.searchParams.get("start")) {
    const [org] = orgId
      ? await db.select().from(organisations).where(eq(organisations.id, orgId)).limit(1)
      : await db.select().from(organisations).limit(1);
    if (!org) {
      return NextResponse.redirect(new URL("/setup", request.url));
    }
    return NextResponse.redirect(createXeroAuthorizationUrl(org.id));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.json({ error: "Missing Xero OAuth callback parameters" }, { status: 400 });
  }

  const result = await exchangeXeroCode(code);
  const [connection] = await db.insert(connectorConnections).values({
    orgId: state,
    connectorId: "xero",
    displayName: result.tenantName,
    status: "connected",
    authData: encryptJson(result.credentials),
    metadata: { tenantName: result.tenantName }
  }).returning();

  const [financeRole] = await db.select().from(roles).where(and(eq(roles.orgId, state), eq(roles.roleType, "finance"))).limit(1);
  if (connection && financeRole) {
    await db.insert(roleConnectorBindings).values({ roleId: financeRole.id, connectorConnectionId: connection.id });
  }

  return NextResponse.redirect(new URL("/connectors", request.url), { status: 303 });
}
