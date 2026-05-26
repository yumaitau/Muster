import type { Capability, ConnectorContext } from "@muster/connector-sdk";
import type { ModelAdapter, ModelTool } from "../adapters/contracts";

export interface AgenticLoopInput {
  model: ModelAdapter;
  prompt: string;
  system?: string;
  capabilities: Array<{ capability: Capability; ctx: ConnectorContext }>;
  maxSteps?: number;
  timeoutMs?: number;
  onToolCall?: (event: { capabilityId: string; input: unknown; output: unknown }) => Promise<void> | void;
}

export async function runAgenticToolLoop(input: AgenticLoopInput) {
  const tools: ModelTool[] = input.capabilities.map(({ capability, ctx }) => ({
    id: capability.id,
    description: capability.name,
    inputSchema: capability.input,
    outputSchema: capability.output,
    execute: async (toolInput: unknown) => {
      const parsed = capability.input.parse(toolInput);
      const output = await capability.execute(ctx, parsed);
      await input.onToolCall?.({ capabilityId: capability.id, input: parsed, output });
      return output;
    }
  }));

  if (input.model.generateWithTools) {
    return input.model.generateWithTools({
      prompt: input.prompt,
      ...(input.system ? { system: input.system } : {}),
      tools,
      maxSteps: input.maxSteps ?? 6
    });
  }

  const descriptions = tools.map((tool) => `- ${tool.id}: ${tool.description}`).join("\n");
  const text = await input.model.generateText({
    prompt: `${input.prompt}\n\nAvailable read/write tools:\n${descriptions}`,
    ...(input.system ? { system: input.system } : {})
  });
  return { text: text.text, toolCalls: [] };
}
