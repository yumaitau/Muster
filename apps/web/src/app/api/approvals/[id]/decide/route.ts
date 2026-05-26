import { NextResponse } from "next/server";
import { decideApproval } from "@muster/core";
import { getDb } from "@muster/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  const decision = form.get("decision") === "approved" ? "approved" : "rejected";
  await decideApproval({
    db: getDb(),
    approvalId: id,
    status: decision,
    note: String(form.get("note") ?? "")
  });
  return NextResponse.redirect(new URL("/approvals", request.url), { status: 303 });
}
