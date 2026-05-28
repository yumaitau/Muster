import { NextResponse } from "next/server";
import { decideApproval, decryptJson } from "@muster/core";
import { artifacts, connectorConnections, eq, getDb } from "@muster/db";
import {
  customApiCredentialsSchema,
  customApiDefinitionSchema,
  executeCustomApiAction,
  type CustomApiCredentials
} from "../../../../../lib/custom-api-action";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  const decision = form.get("decision") === "approved" ? "approved" : "rejected";
  const db = getDb();
  await decideApproval({
    db,
    approvalId: id,
    status: decision,
    note: String(form.get("note") ?? ""),
    executeApproved: async (action) => {
      if (action.capabilityId !== "custom_api.request") {
        return { approved: true, executedAt: new Date().toISOString() };
      }
      const payload = action.payload as { connectionId?: unknown; input?: unknown };
      if (typeof payload.connectionId !== "string") throw new Error("Custom API action is missing a connection id");
      const input = payload.input && typeof payload.input === "object" && !Array.isArray(payload.input) ? (payload.input as Record<string, unknown>) : {};
      const [connection] = await db.select().from(connectorConnections).where(eq(connectorConnections.id, payload.connectionId)).limit(1);
      if (!connection) throw new Error("Custom API connection not found");
      const definition = customApiDefinitionSchema.parse(connection.metadata);
      const credentials = customApiCredentialsSchema.parse(decryptJson<CustomApiCredentials>(connection.authData));
      const result = await executeCustomApiAction({ definition, credentials, payload: input });
      await db.insert(artifacts).values({
        orgId: connection.orgId,
        runId: action.runId,
        type: "custom_api_result",
        title: `${connection.displayName} API result`,
        content: result as Record<string, unknown>,
        storageKey: null
      });
      return result;
    }
  });
  return NextResponse.redirect(new URL("/approvals", request.url), { status: 303 });
}
