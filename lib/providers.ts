import { ChatMessage, LlmCallInput, ProviderName } from "@/lib/types";

const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.LLM_TIMEOUT_MS ?? "90000", 10);
const ALLOW_MOCK_RESPONSES = (process.env.ALLOW_MOCK_RESPONSES ?? "true").toLowerCase() === "true";

export interface ModelCatalog {
  openai: string;
  anthropic: string;
  gemini: string;
  xai: string;
}

export function getModelCatalog(): ModelCatalog {
  return {
    openai: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    anthropic: process.env.ANTHROPIC_MODEL ?? "claude-3-7-sonnet-latest",
    gemini: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    xai: process.env.XAI_MODEL ?? "grok-2-latest"
  };
}

export async function callLlm(input: LlmCallInput): Promise<string> {
  const apiKey = getApiKey(input.provider);

  if (!apiKey) {
    if (ALLOW_MOCK_RESPONSES) {
      return buildMockResponse(input);
    }

    throw new Error(
      `Missing API key for ${input.provider}. Set the key in your .env.local file or enable ALLOW_MOCK_RESPONSES.`
    );
  }

  switch (input.provider) {
    case "openai":
      return callOpenAiCompatible({
        input,
        apiKey,
        baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
      });
    case "xai":
      return callOpenAiCompatible({
        input,
        apiKey,
        baseUrl: process.env.XAI_BASE_URL ?? "https://api.x.ai/v1"
      });
    case "anthropic":
      return callAnthropic(input, apiKey);
    case "gemini":
      return callGemini(input, apiKey);
    default:
      return assertNever(input.provider);
  }
}

function getApiKey(provider: ProviderName): string | undefined {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "xai":
      return process.env.XAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "gemini":
      return process.env.GEMINI_API_KEY;
    default:
      return undefined;
  }
}

function buildMockResponse(input: LlmCallInput): string {
  const latestUserInput =
    [...input.messages].reverse().find((message) => message.role === "user")?.content ??
    "No prompt provided.";
  const condensedPrompt = latestUserInput.replace(/\s+/g, " ").slice(0, 220);

  return [
    `[Mock ${input.provider}/${input.model}]`,
    "Final answer: This is a placeholder response because API keys are not configured.",
    `Prompt excerpt: ${condensedPrompt}`,
    "Why: Fill in provider keys in .env.local to run the real experiment."
  ].join("\n");
}

interface OpenAiCompatibleInput {
  input: LlmCallInput;
  apiKey: string;
  baseUrl: string;
}

async function callOpenAiCompatible({ input, apiKey, baseUrl }: OpenAiCompatibleInput): Promise<string> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: input.model,
      temperature: input.temperature ?? 0.4,
      max_tokens: input.maxTokens ?? 900,
      messages: input.messages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI-compatible request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ text?: string; type?: string }>;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text ?? "")
      .join("\n")
      .trim();
  }

  throw new Error("OpenAI-compatible response was missing message content.");
}

async function callAnthropic(input: LlmCallInput, apiKey: string): Promise<string> {
  const baseUrl = normalizeBaseUrl(process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com");
  const systemPrompt = collectSystemPrompt(input.messages);
  const messages = input.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: [{ type: "text", text: message.content }]
    }));

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": process.env.ANTHROPIC_VERSION ?? "2023-06-01"
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens ?? 1000,
      temperature: input.temperature ?? 0.4,
      system: systemPrompt || undefined,
      messages
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content
    ?.filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic response was missing text content.");
  }

  return text;
}

async function callGemini(input: LlmCallInput, apiKey: string): Promise<string> {
  const baseUrl = normalizeBaseUrl(
    process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta"
  );
  const systemPrompt = collectSystemPrompt(input.messages);
  const contents = input.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    }));

  const response = await fetch(`${baseUrl}/models/${encodeURIComponent(input.model)}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents,
      generationConfig: {
        temperature: input.temperature ?? 0.4,
        maxOutputTokens: input.maxTokens ?? 1000
      }
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini response was missing text content.");
  }

  return text;
}

function collectSystemPrompt(messages: ChatMessage[]): string {
  return messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n")
    .trim();
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function assertNever(value: never): never {
  throw new Error(`Unsupported provider: ${String(value)}`);
}
