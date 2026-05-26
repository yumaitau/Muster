import { NextResponse } from "next/server";
import { createModelAdapter } from "@muster/adapter-model";
import { artifacts, desc, getDb, messages, tasks } from "@muster/db";
import { getCurrentOrg } from "../../../lib/data";

export async function POST(request: Request) {
  const form = await request.formData();
  const org = await getCurrentOrg();
  if (!org) return NextResponse.redirect(new URL("/setup", request.url), { status: 303 });
  const db = getDb();
  const [latestReport] = await db.select().from(artifacts).orderBy(desc(artifacts.createdAt)).limit(1);
  const taskRows = await db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(20);
  const messageRows = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(20);
  const answer = await createModelAdapter().generateText({
    system: "Answer using only the provided read-only Muster data. Mention which data you inspected.",
    prompt: JSON.stringify({
      question: String(form.get("question") ?? ""),
      toolsInspected: ["finance_reports.read", "tasks.read", "messages.read"],
      latestReport: latestReport?.content,
      tasks: taskRows,
      messages: messageRows
    })
  });
  return NextResponse.json({ answer: answer.text, toolCalls: ["finance_reports.read", "tasks.read", "messages.read"] });
}
