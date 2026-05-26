import { NextResponse } from "next/server";
import { auth } from "@muster/adapter-auth-betterauth";
import { getDb, memberships, organisations, roles } from "@muster/db";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const form = await request.formData();
  const orgName = String(form.get("orgName") ?? "");
  const email = String(form.get("email") ?? "");
  const name = String(form.get("name") ?? "");
  const password = String(form.get("password") ?? "");
  const db = getDb();

  const signUp = await auth.api.signUpEmail({
    body: { email, password, name }
  });

  const [org] = await db.insert(organisations).values({ name: orgName, slug: slugify(orgName) }).returning();
  if (!org) {
    throw new Error("Organisation could not be created");
  }

  await db.insert(memberships).values({ orgId: org.id, userId: signUp.user.id, role: "owner" });
  await db.insert(roles).values({
    orgId: org.id,
    roleType: "finance",
    name: "Finance",
    enabled: false,
    autonomyCeiling: 0,
    schedule: "0 9 * * 1",
    config: {}
  });
  await db.insert(roles).values([
    { orgId: org.id, roleType: "comms", name: "Comms", enabled: false, autonomyCeiling: 0, schedule: null, config: {} },
    { orgId: org.id, roleType: "content", name: "Content", enabled: false, autonomyCeiling: 0, schedule: null, config: {} },
    { orgId: org.id, roleType: "admin", name: "Admin", enabled: false, autonomyCeiling: 0, schedule: "0 9 * * 1", config: {} }
  ]);

  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
