import { NextResponse } from "next/server";
import { eq, getDb, tasks } from "@muster/db";
import { buildPlaybookTasks } from "../../../../lib/business-playbooks";
import { getCurrentOrg } from "../../../../lib/data";

export async function POST(request: Request) {
  const form = await request.formData();
  const org = await getCurrentOrg();
  if (!org) return NextResponse.redirect(new URL("/setup", request.url), { status: 303 });

  const playbookIds = form.getAll("playbookIds").map(String);
  const db = getDb();
  const existingTasks = await db.select().from(tasks).where(eq(tasks.orgId, org.id));
  const values = buildPlaybookTasks({ orgId: org.id, playbookIds, existingTasks });

  if (values.length > 0) {
    await db.insert(tasks).values(values);
  }

  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
