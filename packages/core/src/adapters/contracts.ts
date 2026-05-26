import type { z } from "zod";

export interface CurrentUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthAdapter {
  getCurrentUser(headers: Headers): Promise<CurrentUser | null>;
  signOut(headers: Headers): Promise<void>;
}

export interface StorageAdapter {
  put(key: string, body: Uint8Array | string, contentType?: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

export interface GenerateTextInput {
  system?: string;
  prompt: string;
  model?: string;
}

export interface ModelTool<I = unknown, O = unknown> {
  id: string;
  description: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  execute(input: I): Promise<O>;
}

export interface ModelAdapter {
  generateText(input: GenerateTextInput): Promise<{ text: string }>;
  generateObject<T>(input: GenerateTextInput & { schema: z.ZodType<T> }): Promise<T>;
  streamText(input: GenerateTextInput): AsyncIterable<string>;
  generateWithTools?(input: GenerateTextInput & { tools: ModelTool[]; maxSteps?: number }): Promise<{ text: string; toolCalls: Array<{ toolId: string; input: unknown; output: unknown }> }>;
}
