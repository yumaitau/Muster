import { NextResponse } from "next/server";
import { eq, getDb, roles } from "@muster/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  await getDb()
    .update(roles)
    .set({
      enabled: form.get("enabled") === "true",
      autonomyCeiling: Number(form.get("autonomyCeiling") ?? 0),
      schedule: String(form.get("schedule") ?? "")
    })
    .where(eq(roles.id, id));
  return NextResponse.redirect(new URL("/roles", request.url), { status: 303 });
}
