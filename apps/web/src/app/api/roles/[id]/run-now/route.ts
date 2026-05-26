import { NextResponse } from "next/server";
import { createModelAdapter } from "@muster/adapter-model";
import { createS3StorageAdapter } from "@muster/adapter-storage-s3";
import { runRoleProcedure, WEEKLY_FINANCE_REPORT_PROCEDURE } from "@muster/core";
import { eq, getDb, roles } from "@muster/db";
import { bootstrapConnectors } from "../../../../../lib/bootstrap";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  bootstrapConnectors();
  const { id } = await params;
  const db = getDb();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }
  await runRoleProcedure(
    { db, model: createModelAdapter(), storage: createS3StorageAdapter() },
    { orgId: role.orgId, roleId: role.id, procedureId: WEEKLY_FINANCE_REPORT_PROCEDURE, triggerSource: "manual" }
  );
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
