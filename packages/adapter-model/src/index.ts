import { createOpenAI } from "@ai-sdk/openai";
import type { ModelAdapter } from "@muster/core";
import { generateObject, generateText, streamText } from "ai";
import { createOllama } from "ollama-ai-provider";

export function createModelAdapter(config: { provider?: string } = {}): ModelAdapter {
  const provider = config.provider ?? process.env.MODEL_PROVIDER ?? "openai";
  const modelId = process.env.MODEL_ID ?? "gpt-4.1-mini";
  const model =
    provider === "ollama"
      ? createOllama({ baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/api" })(modelId)
      : createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" })(modelId);
  const typedModel = model as never;

  return {
    async generateText(input) {
      const result = await generateText({
        model: typedModel,
        ...(input.system ? { system: input.system } : {}),
        prompt: input.prompt
      });
      return { text: result.text };
    },
    async generateObject(input) {
      const result = await generateObject({
        model: typedModel,
        ...(input.system ? { system: input.system } : {}),
        prompt: input.prompt,
        schema: input.schema
      });
      return result.object;
    },
    async *streamText(input) {
      const result = streamText({ model: typedModel, ...(input.system ? { system: input.system } : {}), prompt: input.prompt });
      for await (const chunk of result.textStream) {
        yield chunk;
      }
    },
    async generateWithTools(input) {
      const result = await generateText({
        model: typedModel,
        ...(input.system ? { system: input.system } : {}),
        prompt: `${input.prompt}\n\nTools available:\n${input.tools.map((tool) => `- ${tool.id}: ${tool.description}`).join("\n")}\n\nReturn a concise plan and do not claim that a tool ran unless it appears in the audited tool log.`
      });
      return { text: result.text, toolCalls: [] };
    }
  };
}
