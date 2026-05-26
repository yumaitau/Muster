import { defineCapability, defineConnector, type ConnectorContext } from "@muster/connector-sdk";
import { XeroClient } from "xero-node";
import { z } from "zod";

export const xeroCredentialsSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  tenantId: z.string(),
  expiresAt: z.string().optional(),
  idToken: z.string().optional()
});

export type XeroCredentials = z.infer<typeof xeroCredentialsSchema>;

export const balanceSheetOutputSchema = z.object({
  reportId: z.string().optional(),
  reportName: z.string().optional(),
  rows: z.unknown(),
  fetchedAt: z.string()
});

export const draftBillInputSchema = z.object({
  supplier: z.string(),
  amount: z.number(),
  date: z.string(),
  dueDate: z.string().optional(),
  accountCode: z.string().optional(),
  lineItems: z
    .array(z.object({ description: z.string(), quantity: z.number().default(1), unitAmount: z.number(), accountCode: z.string().optional() }))
    .default([])
});

export const draftBillOutputSchema = z.object({
  billId: z.string().optional(),
  status: z.string(),
  raw: z.unknown().optional()
});

function createClient(credentials: XeroCredentials) {
  const client = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID ?? "",
    clientSecret: process.env.XERO_CLIENT_SECRET ?? "",
    redirectUris: [process.env.XERO_REDIRECT_URI ?? "http://localhost:3000/api/connectors/xero/callback"],
    scopes: ["openid", "profile", "email", "accounting.reports.read", "offline_access"]
  });
  const tokenSet: Record<string, string | number> = {
    access_token: credentials.accessToken,
  };
  if (credentials.refreshToken) tokenSet.refresh_token = credentials.refreshToken;
  if (credentials.idToken) tokenSet.id_token = credentials.idToken;
  if (credentials.expiresAt) tokenSet.expires_at = Math.floor(new Date(credentials.expiresAt).getTime() / 1000);
  client.setTokenSet(tokenSet);
  return client;
}

export const balanceSheetCapability = defineCapability({
  id: "xero.report.balance_sheet",
  name: "Read balance sheet",
  kind: "read",
  autonomyFloor: 0,
  requiresApproval: false,
  input: z.object({}),
  output: balanceSheetOutputSchema,
  async execute(ctx: ConnectorContext<XeroCredentials>) {
    const credentials = xeroCredentialsSchema.parse(ctx.credentials);
    const client = createClient(credentials);
    const response = await client.accountingApi.getReportBalanceSheet(credentials.tenantId);
    const report = response.body.reports?.[0];
    return {
      reportId: report?.reportID,
      reportName: report?.reportName,
      rows: report?.rows ?? [],
      fetchedAt: new Date().toISOString()
    };
  }
});

export const createDraftBillCapability = defineCapability({
  id: "xero.bill.create_draft",
  name: "Create draft bill",
  kind: "write",
  autonomyFloor: 1,
  requiresApproval: true,
  input: draftBillInputSchema,
  output: draftBillOutputSchema,
  async execute(ctx: ConnectorContext<XeroCredentials>, input) {
    const credentials = xeroCredentialsSchema.parse(ctx.credentials);
    const client = createClient(credentials);
    const lineItems =
      input.lineItems.length > 0
        ? input.lineItems.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitAmount: line.unitAmount,
            ...(line.accountCode ?? input.accountCode ? { accountCode: line.accountCode ?? input.accountCode } : {})
          }))
        : [{ description: "Supplier invoice", quantity: 1, unitAmount: input.amount, ...(input.accountCode ? { accountCode: input.accountCode } : {}) }];
    const response = await client.accountingApi.createInvoices(credentials.tenantId, {
      invoices: [
        {
          type: "ACCPAY",
          status: "DRAFT",
          contact: { name: input.supplier },
          date: input.date,
          dueDate: input.dueDate,
          lineItems
        }
      ]
    } as never);
    const invoice = response.body.invoices?.[0];
    return { billId: invoice?.invoiceID, status: String(invoice?.status ?? "DRAFT"), raw: invoice };
  }
});

export const xeroConnector = defineConnector({
  id: "xero",
  name: "Xero",
  description: "Reads finance reports from a connected Xero organisation.",
  auth: {
    type: "oauth2",
    authorizationUrl: "https://login.xero.com/identity/connect/authorize",
    tokenUrl: "https://identity.xero.com/connect/token",
    scopes: ["openid", "profile", "email", "accounting.reports.read", "offline_access"]
  },
  capabilities: [balanceSheetCapability, createDraftBillCapability],
  canonicalEntities: [
    {
      entity: "financial_report",
      version: "0.1",
      description: "Read-only finance reports normalised from accounting systems."
    }
  ],
  async testConnection(ctx) {
    const credentials = xeroCredentialsSchema.parse(ctx.credentials);
    const client = createClient(credentials);
    const response = await client.accountingApi.getOrganisations(credentials.tenantId);
    return Boolean(response.body.organisations?.length);
  }
});

export function createXeroAuthorizationUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.XERO_CLIENT_ID ?? "",
    redirect_uri: process.env.XERO_REDIRECT_URI ?? "http://localhost:3000/api/connectors/xero/callback",
    scope: "openid profile email accounting.reports.read offline_access",
    state
  });
  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
}

export async function exchangeXeroCode(code: string) {
  const client = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID ?? "",
    clientSecret: process.env.XERO_CLIENT_SECRET ?? "",
    redirectUris: [process.env.XERO_REDIRECT_URI ?? "http://localhost:3000/api/connectors/xero/callback"],
    scopes: ["openid", "profile", "email", "accounting.reports.read", "offline_access"]
  });
  const tokenSet = await client.apiCallback(`${process.env.XERO_REDIRECT_URI}?code=${code}`);
  await client.updateTenants();
  const tenant = client.tenants[0];
  if (!tenant) {
    throw new Error("No Xero tenant was returned");
  }
  return {
    credentials: {
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      idToken: tokenSet.id_token,
      expiresAt: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000).toISOString() : undefined,
      tenantId: tenant.tenantId
    },
    tenantName: tenant.tenantName ?? "Xero organisation"
  };
}
