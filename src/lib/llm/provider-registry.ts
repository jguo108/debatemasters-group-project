import "server-only";
import { getLlmConfig } from "@/lib/llm/env";
import { DeepSeekProvider } from "@/lib/llm/providers/deepseek";
import type { LlmProvider } from "@/lib/llm/types";

export type LlmTaskKind = "opponent" | "judge";

type TaskResolution = {
  provider: LlmProvider;
  model: string;
};

export function resolveLlmTask(task: LlmTaskKind, modelOverride?: string): TaskResolution {
  const cfg = getLlmConfig();
  const provider = new DeepSeekProvider({
    apiKey: cfg.deepseekApiKey,
    baseUrl: cfg.deepseekBaseUrl,
    defaultModel: task === "judge" ? cfg.judgeModel : cfg.opponentModel,
  });
  return {
    provider,
    model:
      modelOverride?.trim() ||
      (task === "judge" ? cfg.judgeModel : cfg.opponentModel),
  };
}
