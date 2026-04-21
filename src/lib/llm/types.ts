export type LlmProviderName = "deepseek";

export type LlmChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmJsonSchemaMode = "off" | "json_object";

export type LlmGenerateRequest = {
  messages: LlmChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: LlmJsonSchemaMode;
};

export type LlmGenerateResponse = {
  text: string;
  model: string;
};

export interface LlmProvider {
  readonly name: LlmProviderName;
  generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse>;
}
