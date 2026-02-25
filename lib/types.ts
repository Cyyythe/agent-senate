export type ProviderName = "openai" | "anthropic" | "gemini" | "xai";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface LlmCallInput {
  provider: ProviderName;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface DebateAgent {
  id: string;
  name: string;
  provider: ProviderName;
  model: string;
  persona: string;
  isModerator?: boolean;
}

export interface DebateTurn {
  round: number;
  agentId: string;
  agentName: string;
  provider: ProviderName;
  model: string;
  content: string;
}

export type ExperimentConditionId =
  | "single_plain"
  | "single_role"
  | "multi_mixed_models"
  | "multi_same_model_roles";

export interface ConditionResult {
  conditionId: ExperimentConditionId;
  conditionLabel: string;
  answer: string;
  transcript: DebateTurn[];
}

export interface BlindedResponse {
  blindId: string;
  answer: string;
  sourceConditionId: ExperimentConditionId;
  sourceConditionLabel: string;
  transcript: DebateTurn[];
}

export interface ExperimentApiResponse {
  runId: string;
  createdAt: string;
  question: string;
  responses: BlindedResponse[];
}
