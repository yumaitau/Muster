import { NextResponse } from "next/server";
import { encryptJson } from "@muster/core";
import { and, connectorConnections, eq, getDb, roleConnectorBindings, roles } from "@muster/db";
import { parseCustomApiForm } from "../../../../lib/custom-api-action";
import { getCurrentOrg } from "../../../../lib/data";

async function ensureActionApiRole(orgId: string) {
  const db = getDb();
  const [existing] = await db.select().from(roles).where(and(eq(roles.orgId, orgId), eq(roles.roleType, "api_action"))).limit(1);
  if (existing) return existing;
  const [role] = await db
    .insert(roles)
    .values({
      orgId,
      roleType: "api_action",
      name: "Action API",
      enabled: true,
      autonomyCeiling: 1,
      schedule: null,
      config: {}
    })
    .returning();
  if (!role) throw new Error("Action API role could not be created");
  return role;
}

export async function POST(request: Request) {
  const org = await getCurrentOrg();
  if (!org) return NextResponse.redirect(new URL("/setup", request.url), { status: 303 });

  const form = await request.formData();
  const { displayName, definition, credentials } = parseCustomApiForm(form);
  const db = getDb();
  const role = await ensureActionApiRole(org.id);

  const [connection] = await db
    .insert(connectorConnections)
    .values({
      orgId: org.id,
      connectorId: "custom-api",
      displayName,
      status: "connected",
      authData: encryptJson(credentials),
      metadata: definition
    })
    .returning();
  if (connection) {
    await db.insert(roleConnectorBindings).values({ roleId: role.id, connectorConnectionId: connection.id });
  }

  return NextResponse.redirect(new URL("/connectors", request.url), { status: 303 });
}
