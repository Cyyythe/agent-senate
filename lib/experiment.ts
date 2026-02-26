import { callLlm, getModelCatalog } from "@/lib/providers";
import {
  BlindedResponse,
  ChatMessage,
  ConditionResult,
  DebateAgent,
  DebateTurn,
  ExperimentApiResponse,
  ExperimentConditionId,
  ProviderName
} from "@/lib/types";

const MAX_SINGLE_RESPONSE_TOKENS = 1000;
const MAX_DEBATE_RESPONSE_TOKENS = Number.parseInt(process.env.DEBATE_MAX_OUTPUT_TOKENS ?? "450", 10);
const DEFAULT_DEBATE_ROUNDS = Number.parseInt(process.env.DEBATE_ROUNDS ?? "2", 10);
const FORCE_GEMINI_ONLY = (process.env.FORCE_GEMINI_ONLY ?? "true").toLowerCase() === "true";
const SERIALIZE_CONDITIONS = (process.env.SERIALIZE_CONDITIONS ?? "true").toLowerCase() === "true";

const CORE_SINGLE_INSTRUCTIONS = [
  "You are helping evaluate answer quality for a capstone project.",
  "Provide a direct answer first, then concise justification.",
  "If uncertain, clearly state uncertainty instead of over-claiming.",
  "Keep the response under 220 words."
].join(" ");

const ROLE_BASED_SINGLE_INSTRUCTIONS = [
  "You are a methodical evaluator with expertise in critical reasoning.",
  "Explain the answer as if your work will be audited for correctness.",
  "Include one brief caveat if there is meaningful uncertainty.",
  "Keep the response under 240 words."
].join(" ");

const DEBATE_SYSTEM_TEMPLATE = `
You are participating in a structured multi-agent debate to find the best possible answer.
Persona: {PERSONA}

Rules:
1) Prioritize correctness over persuasion.
2) Challenge weak reasoning from peers and concede when another argument is stronger.
3) Be specific and concrete; do not use filler.
4) Keep each round response under 200 words.

Round 1 goal: propose an initial answer and your reasoning.
Round 2+ goal: evaluate peers, refine your position, and ask targeted questions.
Final goal: support a single best answer, with uncertainty explicitly noted when needed.
`.trim();

interface DebateRunResult {
  answer: string;
  transcript: DebateTurn[];
}

export async function runExperiment(question: string): Promise<ExperimentApiResponse> {
  const models = getModelCatalog();
  const runId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const singleProvider: ProviderName = FORCE_GEMINI_ONLY ? "gemini" : "openai";
  const singleModel = FORCE_GEMINI_ONLY ? models.gemini : models.openai;
  const conditionLabels = getConditionLabels(FORCE_GEMINI_ONLY);

  const conditionRunners: Array<() => Promise<ConditionResult>> = [
    () =>
      runSingleCondition({
      conditionId: "single_plain",
      conditionLabel: conditionLabels.single_plain,
      question,
      systemPrompt: CORE_SINGLE_INSTRUCTIONS,
      provider: singleProvider,
      model: singleModel
    }),
    () =>
      runDebateCondition({
      conditionId: "multi_mixed_models",
      conditionLabel: conditionLabels.multi_mixed_models,
      question,
      agents: buildMixedModelAgents(models, FORCE_GEMINI_ONLY),
      rounds: DEFAULT_DEBATE_ROUNDS
    }),
    () =>
      runDebateCondition({
      conditionId: "multi_same_model_roles",
      conditionLabel: conditionLabels.multi_same_model_roles,
      question,
      agents: buildSameModelRoleAgents(singleProvider, singleModel),
      rounds: DEFAULT_DEBATE_ROUNDS
    }),
    () =>
      runSingleCondition({
      conditionId: "single_role",
      conditionLabel: conditionLabels.single_role,
      question,
      systemPrompt: ROLE_BASED_SINGLE_INSTRUCTIONS,
      provider: singleProvider,
      model: singleModel
    })
  ];

  const conditionResults = SERIALIZE_CONDITIONS
    ? await runConditionsSequentially(conditionRunners)
    : await runConditionsInParallel(conditionRunners);

  const blinded = blindAndShuffle(conditionResults);

  return {
    runId,
    createdAt,
    question,
    responses: blinded
  };
}

interface SingleConditionInput {
  conditionId: ExperimentConditionId;
  conditionLabel: string;
  question: string;
  systemPrompt: string;
  provider: ProviderName;
  model: string;
}

async function runSingleCondition(input: SingleConditionInput): Promise<ConditionResult> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: input.systemPrompt
    },
    {
      role: "user",
      content: `Question: ${input.question}`
    }
  ];

  const answer = await callLlm({
    provider: input.provider,
    model: input.model,
    messages,
    temperature: 0.2,
    maxTokens: MAX_SINGLE_RESPONSE_TOKENS
  });

  return {
    conditionId: input.conditionId,
    conditionLabel: input.conditionLabel,
    answer,
    transcript: [
      {
        round: 1,
        agentId: "single",
        agentName: "Single Model",
        provider: input.provider,
        model: input.model,
        content: answer
      }
    ]
  };
}

interface DebateConditionInput {
  conditionId: ExperimentConditionId;
  conditionLabel: string;
  question: string;
  agents: DebateAgent[];
  rounds: number;
}

async function runDebateCondition(input: DebateConditionInput): Promise<ConditionResult> {
  const debate = await runDebate({
    question: input.question,
    agents: input.agents,
    rounds: Math.max(1, input.rounds)
  });

  return {
    conditionId: input.conditionId,
    conditionLabel: input.conditionLabel,
    answer: debate.answer,
    transcript: debate.transcript
  };
}

interface DebateInput {
  question: string;
  agents: DebateAgent[];
  rounds: number;
}

async function runDebate(input: DebateInput): Promise<DebateRunResult> {
  const histories = new Map<string, ChatMessage[]>();
  const transcript: DebateTurn[] = [];

  input.agents.forEach((agent) => {
    histories.set(agent.id, [
      {
        role: "system",
        content: DEBATE_SYSTEM_TEMPLATE.replace("{PERSONA}", agent.persona)
      }
    ]);
  });

  for (let round = 1; round <= input.rounds; round += 1) {
    const previousRoundTurns = transcript.filter((turn) => turn.round === round - 1);

    const contributions: DebateTurn[] = [];

    for (const agent of input.agents) {
      const roundPrompt = buildRoundPrompt({
        question: input.question,
        round,
        totalRounds: input.rounds,
        agent,
        previousRoundTurns
      });

      const history = histories.get(agent.id);

      if (!history) {
        throw new Error(`Missing chat history for agent ${agent.id}`);
      }

      history.push({
        role: "user",
        content: roundPrompt
      });

      const content = await callLlm({
        provider: agent.provider,
        model: agent.model,
        messages: history,
        temperature: 0.5,
        maxTokens: MAX_DEBATE_RESPONSE_TOKENS
      });

      history.push({
        role: "assistant",
        content
      });

      contributions.push({
        round,
        agentId: agent.id,
        agentName: agent.name,
        provider: agent.provider,
        model: agent.model,
        content
      });
    }

    transcript.push(...contributions);
  }

  const moderator = input.agents.find((agent) => agent.isModerator) ?? input.agents[0];
  const moderatorHistory = histories.get(moderator.id);

  if (!moderatorHistory) {
    throw new Error(`Missing moderator history for agent ${moderator.id}`);
  }

  moderatorHistory.push({
    role: "user",
    content: buildModeratorPrompt(input.question, transcript, input.rounds)
  });

  const finalAnswer = await callLlm({
    provider: moderator.provider,
    model: moderator.model,
    messages: moderatorHistory,
    temperature: 0.2,
    maxTokens: 950
  });

  transcript.push({
    round: input.rounds + 1,
    agentId: moderator.id,
    agentName: `${moderator.name} (Final Synthesis)`,
    provider: moderator.provider,
    model: moderator.model,
    content: finalAnswer
  });

  return {
    answer: finalAnswer,
    transcript
  };
}

interface RoundPromptInput {
  question: string;
  round: number;
  totalRounds: number;
  agent: DebateAgent;
  previousRoundTurns: DebateTurn[];
}

function buildRoundPrompt(input: RoundPromptInput): string {
  const header = [`Question: ${input.question}`, `Round ${input.round} of ${input.totalRounds}`].join("\n");

  if (input.round === 1) {
    return [
      header,
      "",
      "Task:",
      "- Provide your initial best answer.",
      "- Explain your strongest reasoning in 3-5 concise bullets.",
      "- End with confidence score from 0-100.",
      "",
      "Format:",
      "Answer:",
      "Reasoning:",
      "Questions for peers:",
      "Confidence:"
    ].join("\n");
  }

  const peerContext = formatPeerContext(input.previousRoundTurns, input.agent.id);

  return [
    header,
    "",
    "Peer updates from the previous round:",
    peerContext,
    "",
    "Task:",
    "- Critique at least one peer claim.",
    "- Defend your current answer or concede to a stronger answer.",
    "- Ask up to 2 pointed questions only if needed.",
    "- End with an updated confidence score from 0-100.",
    "",
    "Format:",
    "Current answer:",
    "Why this is stronger (or concession):",
    "Questions for peers:",
    "Confidence:"
  ].join("\n");
}

function buildModeratorPrompt(question: string, transcript: DebateTurn[], rounds: number): string {
  const condensedTranscript = transcript
    .filter((turn) => turn.round <= rounds)
    .map((turn) => {
      const snippet = clampText(turn.content, 360);
      return `Round ${turn.round} - ${turn.agentName}: ${snippet}`;
    })
    .join("\n\n");

  return [
    `Question: ${question}`,
    "",
    "You are the moderator. Synthesize the debate into one final answer.",
    "Use the transcript below. If no full consensus exists, still provide the single best answer and mention unresolved disagreement briefly.",
    "",
    "Return exactly this structure:",
    "Final answer:",
    "Why this answer wins:",
    "Remaining uncertainty:",
    "Final confidence (0-100):",
    "",
    "Transcript:",
    condensedTranscript
  ].join("\n");
}

function formatPeerContext(turns: DebateTurn[], selfAgentId: string): string {
  const peers = turns.filter((turn) => turn.agentId !== selfAgentId);

  if (peers.length === 0) {
    return "- No prior peer statements available.";
  }

  return peers
    .map((turn) => `- ${turn.agentName}: ${clampText(turn.content, 280)}`)
    .join("\n");
}

function clampText(input: string, maxChars: number): string {
  if (input.length <= maxChars) {
    return input;
  }

  return `${input.slice(0, maxChars - 3)}...`;
}

function blindAndShuffle(results: ConditionResult[]): BlindedResponse[] {
  const shuffled = [...results];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  const labels = ["Response A", "Response B", "Response C", "Response D"];

  return shuffled.map((result, index) => ({
    blindId: labels[index] ?? `Response ${index + 1}`,
    answer: result.answer,
    sourceConditionId: result.conditionId,
    sourceConditionLabel: result.conditionLabel,
    transcript: result.transcript
  }));
}

function buildFailedConditionResult(index: number, reason: unknown): ConditionResult {
  const fallbackMappings: Array<{ id: ExperimentConditionId; label: string }> = [
    { id: "single_plain", label: "Single model (first attempt)" },
    { id: "multi_mixed_models", label: "4-agent mixed-model debate" },
    { id: "multi_same_model_roles", label: "4 same-model agents with distinct roles" },
    { id: "single_role", label: "Single model with role prompt" }
  ];
  const fallback = fallbackMappings[index] ?? fallbackMappings[0];
  const errorMessage = reason instanceof Error ? reason.message : "Unknown failure";

  return {
    conditionId: fallback.id,
    conditionLabel: fallback.label,
    answer: `This condition failed to run.\n\nError: ${errorMessage}`,
    transcript: []
  };
}

function buildMixedModelAgents(models: ReturnType<typeof getModelCatalog>, forceGeminiOnly: boolean): DebateAgent[] {
  if (forceGeminiOnly) {
    return buildGeminiBackedMixedAgents(models.gemini);
  }

  return [
    {
      id: "chatgpt_moderator",
      name: "ChatGPT Moderator",
      provider: "openai",
      model: models.openai,
      persona:
        "Debate moderator focused on extracting the strongest shared answer. Push peers to justify claims and integrate valid objections.",
      isModerator: true
    },
    {
      id: "claude_reasoner",
      name: "Claude",
      provider: "anthropic",
      model: models.anthropic,
      persona:
        "Careful reasoner. Stress-test assumptions, clarify ambiguity, and highlight hidden edge cases before accepting a conclusion."
    },
    {
      id: "gemini_evidence",
      name: "Gemini",
      provider: "gemini",
      model: models.gemini,
      persona:
        "Evidence-oriented analyst. Prefer verifiable facts, explicit logic steps, and concise error bounds or caveats."
    },
    {
      id: "grok_challenger",
      name: "Grok",
      provider: "xai",
      model: models.xai,
      persona:
        "Constructive challenger. Attack weak arguments and propose alternative hypotheses until they are disproven."
    }
  ];
}

function buildSameModelRoleAgents(provider: ProviderName, model: string): DebateAgent[] {
  return [
    {
      id: "lead_moderator",
      name: "Lead Moderator",
      provider,
      model,
      persona:
        "Lead moderator responsible for convergence. Keep the team focused, call out contradictions, and synthesize the strongest final answer.",
      isModerator: true
    },
    {
      id: "skeptic",
      name: "Skeptic",
      provider,
      model,
      persona:
        "Skeptical reviewer. Your role is to find mistakes, weak assumptions, and overconfidence in every claim."
    },
    {
      id: "researcher",
      name: "Researcher",
      provider,
      model,
      persona:
        "Research-oriented analyst. Bring structured, evidence-first reasoning and compare plausible alternatives."
    },
    {
      id: "pragmatist",
      name: "Pragmatist",
      provider,
      model,
      persona:
        "Pragmatic decision-maker. Select answers that are actionable and robust under realistic constraints."
    }
  ];
}

function buildGeminiBackedMixedAgents(geminiModel: string): DebateAgent[] {
  return [
    {
      id: "chatgpt_slot",
      name: "ChatGPT Slot (Gemini backend)",
      provider: "gemini",
      model: geminiModel,
      persona:
        "Debate moderator focused on extracting the strongest shared answer. Push peers to justify claims and integrate valid objections.",
      isModerator: true
    },
    {
      id: "claude_slot",
      name: "Claude Slot (Gemini backend)",
      provider: "gemini",
      model: geminiModel,
      persona:
        "Careful reasoner. Stress-test assumptions, clarify ambiguity, and highlight hidden edge cases before accepting a conclusion."
    },
    {
      id: "gemini_slot",
      name: "Gemini Slot",
      provider: "gemini",
      model: geminiModel,
      persona:
        "Evidence-oriented analyst. Prefer verifiable facts, explicit logic steps, and concise error bounds or caveats."
    },
    {
      id: "grok_slot",
      name: "Grok Slot (Gemini backend)",
      provider: "gemini",
      model: geminiModel,
      persona:
        "Constructive challenger. Attack weak arguments and propose alternative hypotheses until they are disproven."
    }
  ];
}

function getConditionLabels(forceGeminiOnly: boolean): Record<ExperimentConditionId, string> {
  if (forceGeminiOnly) {
    return {
      single_plain: "Single Gemini (first attempt)",
      multi_mixed_models: "4-agent debate (Gemini-backed stand-ins)",
      multi_same_model_roles: "4 Gemini agents with distinct roles",
      single_role: "Single Gemini with role prompt"
    };
  }

  return {
    single_plain: "Single ChatGPT (first attempt)",
    multi_mixed_models: "4-model debate (ChatGPT + Claude + Gemini + Grok)",
    multi_same_model_roles: "4 ChatGPT agents with distinct roles",
    single_role: "Single ChatGPT with role prompt"
  };
}

async function runConditionsSequentially(
  conditionRunners: Array<() => Promise<ConditionResult>>
): Promise<ConditionResult[]> {
  const results: ConditionResult[] = [];

  for (const [index, runCondition] of conditionRunners.entries()) {
    try {
      results.push(await runCondition());
    } catch (error) {
      results.push(buildFailedConditionResult(index, error));
    }
  }

  return results;
}

async function runConditionsInParallel(conditionRunners: Array<() => Promise<ConditionResult>>): Promise<ConditionResult[]> {
  const settled = await Promise.allSettled(conditionRunners.map((runCondition) => runCondition()));

  return settled.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    return buildFailedConditionResult(index, result.reason);
  });
}
