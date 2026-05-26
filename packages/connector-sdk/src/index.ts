import type { z } from "zod";

export type AutonomyTier = 0 | 1 | 2 | 3;
export type CapabilityKind = "read" | "write";

export type AuthSpec =
  | {
      type: "oauth2";
      authorizationUrl: string;
      tokenUrl: string;
      scopes: string[];
    }
  | {
      type: "apiKey";
      label: string;
    };

export interface TriggerSpec {
  id: string;
  name: string;
  type: "webhook" | "schedule";
}

export interface CanonicalEntityMapping {
  entity: string;
  version: string;
  description: string;
  schema?: z.ZodType;
  toCanonical?: (source: unknown) => unknown;
  fromCanonical?: (canonical: unknown) => unknown;
}

export interface ConnectorLogger {
  info(message: string, detail?: Record<string, unknown>): void;
  warn(message: string, detail?: Record<string, unknown>): void;
  error(message: string, detail?: Record<string, unknown>): void;
}

export interface ConnectorContext<Credentials = unknown> {
  organisation: {
    id: string;
    name: string;
    slug: string;
  };
  credentials: Credentials;
  logger: ConnectorLogger;
  fetch?: typeof fetch;
}

export interface Capability<I = unknown, O = unknown> {
  id: string;
  name: string;
  kind: CapabilityKind;
  autonomyFloor: AutonomyTier;
  requiresApproval: boolean;
  input: z.ZodType<I>;
  output: z.ZodType<O>;
  execute(ctx: ConnectorContext, input: I): Promise<O>;
}

export interface Connector {
  id: string;
  name: string;
  description: string;
  auth: AuthSpec;
  capabilities: Capability[];
  triggers?: TriggerSpec[];
  canonicalEntities?: CanonicalEntityMapping[];
  testConnection(ctx: ConnectorContext): Promise<boolean>;
}

export function defineCapability<I, O>(capability: Capability<I, O>): Capability<I, O> {
  return capability;
}

export function defineConnector(connector: Connector): Connector {
  const capabilityIds = new Set<string>();
  for (const capability of connector.capabilities) {
    if (capabilityIds.has(capability.id)) {
      throw new Error(`Duplicate capability id ${capability.id}`);
    }
    capabilityIds.add(capability.id);
  }
  return connector;
}

export interface CapabilityTool<I = unknown, O = unknown> {
  id: string;
  description: string;
  input: z.ZodType<I>;
  output: z.ZodType<O>;
  execute(input: I): Promise<O>;
}

export function capabilityToTool<I, O>(capability: Capability<I, O>, ctx: ConnectorContext): CapabilityTool<I, O> {
  return {
    id: capability.id,
    description: `${capability.name} (${capability.kind})`,
    input: capability.input,
    output: capability.output,
    execute: (input) => capability.execute(ctx, input)
  };
}
