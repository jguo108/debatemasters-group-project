import "server-only";
import type { LlmGenerateRequest, LlmGenerateResponse, LlmProvider } from "@/lib/llm/types";

type DeepSeekProviderOptions = {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
};

type DeepSeekChoice = {
  message?: {
    content?: string | null;
  };
};

type DeepSeekResponse = {
  model?: string;
  choices?: DeepSeekChoice[];
};

export class DeepSeekProvider implements LlmProvider {
  readonly name = "deepseek" as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(options: DeepSeekProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.defaultModel = options.defaultModel;
  }

  async generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    const model = request.model ?? this.defaultModel;
    const payload: Record<string, unknown> = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 600,
      stream: false,
    };
    if (request.jsonMode === "json_object") {
      payload.response_format = { type: "json_object" };
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DeepSeek request failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as DeepSeekResponse;
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new Error("DeepSeek returned empty content.");
    }
    return {
      text,
      model: data.model ?? model,
    };
  }
}
