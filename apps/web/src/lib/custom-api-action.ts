import { z } from "zod";

export const customApiCredentialsSchema = z.object({
  authType: z.enum(["none", "bearer", "apiKey", "basic"]).default("none"),
  bearerToken: z.string().optional(),
  apiKeyHeader: z.string().optional(),
  apiKeyValue: z.string().optional(),
  basicUsername: z.string().optional(),
  basicPassword: z.string().optional(),
  headers: z.record(z.string(), z.string()).default({})
});

export const jsonSchemaSubsetSchema: z.ZodType<JsonSchemaSubset> = z.lazy(() =>
  z.object({
    type: z.enum(["object", "array", "string", "number", "integer", "boolean", "null"]).optional(),
    required: z.array(z.string()).optional(),
    properties: z.record(z.string(), jsonSchemaSubsetSchema).optional(),
    items: jsonSchemaSubsetSchema.optional()
  })
);

export type JsonSchemaSubset = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null" | undefined;
  required?: string[] | undefined;
  properties?: Record<string, JsonSchemaSubset> | undefined;
  items?: JsonSchemaSubset | undefined;
};

export const customApiDefinitionSchema = z.object({
  documentation: z.string().max(8000).optional(),
  endpointUrl: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  bodyTemplate: z.string().max(20000).optional(),
  outputSchema: jsonSchemaSubsetSchema.default({ type: "object" }),
  requiresApproval: z.boolean().default(true)
});

export type CustomApiCredentials = z.infer<typeof customApiCredentialsSchema>;
export type CustomApiDefinition = z.infer<typeof customApiDefinitionSchema>;

export type CustomApiExecutionResult = {
  ok: boolean;
  status: number;
  statusText: string;
  response: unknown;
  validationErrors: string[];
};

function readPath(source: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((value, part) => {
    if (value && typeof value === "object" && part in value) {
      return (value as Record<string, unknown>)[part];
    }
    return "";
  }, source);
}

export function renderTemplate(template: string, context: { input: Record<string, unknown>; credentials: Record<string, unknown> }) {
  return template.replace(/\{\{\s*(input|credentials)\.([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, source: "input" | "credentials", path: string) => {
    const value = readPath(context[source], path);
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  });
}

function headerRecord(value: string) {
  const parsed = value.trim() ? JSON.parse(value) : {};
  return z.record(z.string(), z.string()).parse(parsed);
}

export function parseCustomApiForm(form: FormData) {
  const outputSchemaRaw = String(form.get("outputSchema") ?? "").trim();
  const headersRaw = String(form.get("headers") ?? "").trim();
  const credentials = customApiCredentialsSchema.parse({
    authType: String(form.get("authType") ?? "none"),
    bearerToken: String(form.get("bearerToken") ?? "") || undefined,
    apiKeyHeader: String(form.get("apiKeyHeader") ?? "") || undefined,
    apiKeyValue: String(form.get("apiKeyValue") ?? "") || undefined,
    basicUsername: String(form.get("basicUsername") ?? "") || undefined,
    basicPassword: String(form.get("basicPassword") ?? "") || undefined,
    headers: headerRecord(headersRaw)
  });

  const definition = customApiDefinitionSchema.parse({
    documentation: String(form.get("documentation") ?? "") || undefined,
    endpointUrl: String(form.get("endpointUrl") ?? ""),
    method: String(form.get("method") ?? "POST"),
    bodyTemplate: String(form.get("bodyTemplate") ?? "") || undefined,
    outputSchema: outputSchemaRaw ? JSON.parse(outputSchemaRaw) : { type: "object" },
    requiresApproval: form.getAll("requiresApproval").map(String).includes("true")
  });

  return {
    displayName: String(form.get("displayName") ?? "Custom API action").trim() || "Custom API action",
    definition,
    credentials
  };
}

function authHeaders(credentials: CustomApiCredentials, context: { input: Record<string, unknown>; credentials: Record<string, unknown> }) {
  const headers: Record<string, string> = Object.fromEntries(
    Object.entries(credentials.headers).map(([key, value]) => [key, renderTemplate(value, context)])
  );
  if (credentials.authType === "bearer" && credentials.bearerToken) {
    headers.Authorization = `Bearer ${credentials.bearerToken}`;
  }
  if (credentials.authType === "apiKey" && credentials.apiKeyHeader && credentials.apiKeyValue) {
    headers[credentials.apiKeyHeader] = credentials.apiKeyValue;
  }
  if (credentials.authType === "basic" && credentials.basicUsername && credentials.basicPassword) {
    headers.Authorization = `Basic ${Buffer.from(`${credentials.basicUsername}:${credentials.basicPassword}`).toString("base64")}`;
  }
  return headers;
}

function validateType(value: unknown, schema: JsonSchemaSubset, path: string, errors: string[]) {
  const type = schema.type;
  if (!type) return;
  const fail = () => errors.push(`${path} must be ${type}`);
  if (type === "null") {
    if (value !== null) fail();
    return;
  }
  if (type === "array") {
    if (!Array.isArray(value)) {
      fail();
      return;
    }
    if (schema.items) value.forEach((item, index) => validateJsonSchema(item, schema.items!, `${path}[${index}]`, errors));
    return;
  }
  if (type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      fail();
    }
    return;
  }
  if (type === "integer") {
    if (!Number.isInteger(value)) fail();
    return;
  }
  if (typeof value !== type) fail();
}

export function validateJsonSchema(value: unknown, schema: JsonSchemaSubset, path = "$", errors: string[] = []) {
  validateType(value, schema, path, errors);
  if (schema.type === "object" && value && typeof value === "object" && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    for (const field of schema.required ?? []) {
      if (!(field in object)) errors.push(`${path}.${field} is required`);
    }
    for (const [field, childSchema] of Object.entries(schema.properties ?? {})) {
      if (field in object) validateType(object[field], childSchema, `${path}.${field}`, errors);
    }
  }
  return errors;
}

function assertAllowedUrl(endpointUrl: string) {
  const url = new URL(endpointUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Custom API endpoint must use http or https");
  }
  if (url.protocol === "http:" && process.env.NODE_ENV === "production") {
    throw new Error("Custom API endpoint must use https in production");
  }
}

export async function executeCustomApiAction(input: {
  definition: CustomApiDefinition;
  credentials: CustomApiCredentials;
  payload: Record<string, unknown>;
  fetchImpl?: typeof fetch;
}): Promise<CustomApiExecutionResult> {
  const definition = customApiDefinitionSchema.parse(input.definition);
  const credentials = customApiCredentialsSchema.parse(input.credentials);
  assertAllowedUrl(definition.endpointUrl);

  const context = { input: input.payload, credentials: credentials as unknown as Record<string, unknown> };
  const headers = {
    Accept: "application/json",
    ...authHeaders(credentials, context)
  };
  const init: RequestInit = { method: definition.method, headers };
  if (definition.method !== "GET" && definition.bodyTemplate) {
    (headers as Record<string, string>)["Content-Type"] ??= "application/json";
    init.body = renderTemplate(definition.bodyTemplate, context);
  }

  const response = await (input.fetchImpl ?? fetch)(definition.endpointUrl, init);
  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json") ? await response.json() : await response.text();
  const validationErrors = validateJsonSchema(responseBody, definition.outputSchema);
  if (validationErrors.length > 0) {
    throw new Error(`Custom API response did not match output schema: ${validationErrors.join("; ")}`);
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    response: responseBody,
    validationErrors
  };
}
