import { BlindedResponse, DebateTurn, ExperimentConditionId } from "@/lib/types";
import { ExperimentRunRecord } from "@/lib/survey-types";

interface PresetConditionResponse {
  sourceConditionId: ExperimentConditionId;
  sourceConditionLabel: string;
  answer: string;
  transcript: DebateTurn[];
}

export interface PresetQuestion {
  id: string;
  title: string;
  question: string;
  responses: PresetConditionResponse[];
}

export const PRESET_QUESTIONS: PresetQuestion[] = [
  {
    id: "hotdog-sandwich",
    title: "Definition Check",
    question: "Is a hotdog a sandwich?",
    responses: [
      {
        sourceConditionId: "single_plain",
        sourceConditionLabel: "Single ChatGPT (first attempt)",
        answer:
          "Yes in a functional culinary sense. A hotdog is a filling held by bread and served like a sandwich, even if people use a separate word for it.",
        transcript: [
          {
            round: 1,
            agentId: "single",
            agentName: "Single Model",
            provider: "openai",
            model: "gpt-4.1-mini",
            content:
              "Answer: Yes, a hotdog can be treated as a sandwich under a broad definition (filling enclosed in bread). Confidence: 72."
          }
        ]
      },
      {
        sourceConditionId: "single_role",
        sourceConditionLabel: "Single ChatGPT with role prompt",
        answer:
          "Technically yes under broad food taxonomy, but culturally many people categorize hotdogs separately. The strongest answer is 'yes with caveat.'",
        transcript: [
          {
            round: 1,
            agentId: "single",
            agentName: "Single Role Model",
            provider: "openai",
            model: "gpt-4.1-mini",
            content:
              "Final answer: Yes with caveat. Reasoning: taxonomy supports yes; social category often says no. Confidence: 76."
          }
        ]
      },
      {
        sourceConditionId: "multi_mixed_models",
        sourceConditionLabel: "4-model debate (ChatGPT + Claude + Gemini + Grok)",
        answer:
          "The group converged on: yes for formal definition, no for everyday labeling. Final output: classify it as a sandwich in strict definitions but note cultural exception.",
        transcript: [
          {
            round: 1,
            agentId: "chatgpt_moderator",
            agentName: "ChatGPT Moderator",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Initial stance: yes by structural definition."
          },
          {
            round: 1,
            agentId: "claude_reasoner",
            agentName: "Claude",
            provider: "anthropic",
            model: "claude-sonnet-4-6",
            content: "Initial stance: yes technically, but category use differs in practice."
          },
          {
            round: 1,
            agentId: "gemini_evidence",
            agentName: "Gemini",
            provider: "gemini",
            model: "gemini-2.5-flash",
            content: "Initial stance: yes under common 'filling between bread' schema."
          },
          {
            round: 1,
            agentId: "grok_challenger",
            agentName: "Grok",
            provider: "xai",
            model: "grok-4-fast-reasoning",
            content: "Counterpoint: culinary naming conventions can override strict schema."
          },
          {
            round: 2,
            agentId: "chatgpt_moderator",
            agentName: "ChatGPT Moderator (Final Synthesis)",
            provider: "openai",
            model: "gpt-4.1-mini",
            content:
              "Final answer: yes in formal taxonomy; culturally often treated as its own class. Confidence: 81."
          }
        ]
      },
      {
        sourceConditionId: "multi_same_model_roles",
        sourceConditionLabel: "4 ChatGPT agents with distinct roles",
        answer:
          "Role-based panel output: yes as default classification, while explicitly acknowledging social-language disagreement.",
        transcript: [
          {
            round: 1,
            agentId: "lead_moderator",
            agentName: "Lead Moderator",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Proposal: yes, with a caveat section."
          },
          {
            round: 1,
            agentId: "skeptic",
            agentName: "Skeptic",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Objection: everyday taxonomy says no; define scope clearly."
          },
          {
            round: 1,
            agentId: "researcher",
            agentName: "Researcher",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Evidence: dictionary-style criteria lean yes."
          },
          {
            round: 1,
            agentId: "pragmatist",
            agentName: "Pragmatist",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Recommendation: answer yes but include social caveat."
          },
          {
            round: 2,
            agentId: "lead_moderator",
            agentName: "Lead Moderator (Final Synthesis)",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Consensus answer: yes with caveat. Confidence: 79."
          }
        ]
      }
    ]
  },
  {
    id: "electoral-college",
    title: "Policy Tradeoff",
    question: "Should the US eliminate the Electoral College?",
    responses: [
      {
        sourceConditionId: "single_plain",
        sourceConditionLabel: "Single ChatGPT (first attempt)",
        answer:
          "A direct national popular vote would better match one-person-one-vote principles, so yes, the US should move away from the Electoral College.",
        transcript: [
          {
            round: 1,
            agentId: "single",
            agentName: "Single Model",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Answer: yes, eliminate it in favor of a national popular vote. Confidence: 68."
          }
        ]
      },
      {
        sourceConditionId: "single_role",
        sourceConditionLabel: "Single ChatGPT with role prompt",
        answer:
          "Yes, but only with careful transition design. It improves democratic proportionality, while federal-balance concerns should be addressed through institutional safeguards.",
        transcript: [
          {
            round: 1,
            agentId: "single",
            agentName: "Single Role Model",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Answer: yes with implementation caveats and constitutional path awareness. Confidence: 74."
          }
        ]
      },
      {
        sourceConditionId: "multi_mixed_models",
        sourceConditionLabel: "4-model debate (ChatGPT + Claude + Gemini + Grok)",
        answer:
          "Debate result: majority favored replacing or bypassing the Electoral College, but with concerns about transition legitimacy and state representation.",
        transcript: [
          {
            round: 1,
            agentId: "chatgpt_moderator",
            agentName: "ChatGPT Moderator",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Position: remove EC to align outcomes with popular vote."
          },
          {
            round: 1,
            agentId: "claude_reasoner",
            agentName: "Claude",
            provider: "anthropic",
            model: "claude-sonnet-4-6",
            content: "Position: likely yes; caution about constitutional transition and minority protection."
          },
          {
            round: 1,
            agentId: "gemini_evidence",
            agentName: "Gemini",
            provider: "gemini",
            model: "gemini-2.5-flash",
            content: "Position: yes for democratic proportionality."
          },
          {
            round: 1,
            agentId: "grok_challenger",
            agentName: "Grok",
            provider: "xai",
            model: "grok-4-fast-reasoning",
            content: "Challenge: what mechanisms protect small-state leverage post-change?"
          },
          {
            round: 2,
            agentId: "chatgpt_moderator",
            agentName: "ChatGPT Moderator (Final Synthesis)",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Final: yes overall, with explicit transition and legitimacy safeguards. Confidence: 73."
          }
        ]
      },
      {
        sourceConditionId: "multi_same_model_roles",
        sourceConditionLabel: "4 ChatGPT agents with distinct roles",
        answer:
          "Role panel ended at: move toward popular-vote alignment, but include legal and trust-building safeguards to avoid institutional instability.",
        transcript: [
          {
            round: 1,
            agentId: "lead_moderator",
            agentName: "Lead Moderator",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Proposal: yes, replace EC."
          },
          {
            round: 1,
            agentId: "skeptic",
            agentName: "Skeptic",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Concern: removal could reduce incentives for geographic coalition-building."
          },
          {
            round: 1,
            agentId: "researcher",
            agentName: "Researcher",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Evidence: mismatch risk between popular vote and electoral outcome."
          },
          {
            round: 1,
            agentId: "pragmatist",
            agentName: "Pragmatist",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Practical path: incremental interstate compact or amendment route."
          },
          {
            round: 2,
            agentId: "lead_moderator",
            agentName: "Lead Moderator (Final Synthesis)",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Final: reform toward popular-vote alignment with implementation safeguards. Confidence: 71."
          }
        ]
      }
    ]
  },
  {
    id: "ai-homework",
    title: "Classroom Policy",
    question: "Should high schools allow AI tools for homework?",
    responses: [
      {
        sourceConditionId: "single_plain",
        sourceConditionLabel: "Single ChatGPT (first attempt)",
        answer:
          "Yes, but with constraints. Banning AI entirely is unrealistic; schools should require disclosure and design assignments that check understanding.",
        transcript: [
          {
            round: 1,
            agentId: "single",
            agentName: "Single Model",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Answer: allow with guardrails and transparency. Confidence: 77."
          }
        ]
      },
      {
        sourceConditionId: "single_role",
        sourceConditionLabel: "Single ChatGPT with role prompt",
        answer:
          "Allow regulated use: citation rules, process logs, and oral checks. This keeps academic integrity while teaching responsible AI literacy.",
        transcript: [
          {
            round: 1,
            agentId: "single",
            agentName: "Single Role Model",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Answer: yes with disclosure, teacher oversight, and assessment redesign. Confidence: 82."
          }
        ]
      },
      {
        sourceConditionId: "multi_mixed_models",
        sourceConditionLabel: "4-model debate (ChatGPT + Claude + Gemini + Grok)",
        answer:
          "Mixed-model debate consensus: permit AI under explicit integrity policies and assignment redesign, not blanket prohibition.",
        transcript: [
          {
            round: 1,
            agentId: "chatgpt_moderator",
            agentName: "ChatGPT Moderator",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Yes with disclosure and rubric changes."
          },
          {
            round: 1,
            agentId: "claude_reasoner",
            agentName: "Claude",
            provider: "anthropic",
            model: "claude-sonnet-4-6",
            content: "Need anti-cheating controls plus equity checks."
          },
          {
            round: 1,
            agentId: "gemini_evidence",
            agentName: "Gemini",
            provider: "gemini",
            model: "gemini-2.5-flash",
            content: "Evidence trend favors guided adoption over prohibition."
          },
          {
            round: 1,
            agentId: "grok_challenger",
            agentName: "Grok",
            provider: "xai",
            model: "grok-4-fast-reasoning",
            content: "Challenge: low-resource schools may face uneven implementation."
          },
          {
            round: 2,
            agentId: "chatgpt_moderator",
            agentName: "ChatGPT Moderator (Final Synthesis)",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Final: allow with policy guardrails, teacher training, and integrity instrumentation. Confidence: 84."
          }
        ]
      },
      {
        sourceConditionId: "multi_same_model_roles",
        sourceConditionLabel: "4 ChatGPT agents with distinct roles",
        answer:
          "Role-group decision: permit AI as a supervised learning aid, with mandatory attribution and periodic no-AI assessment checkpoints.",
        transcript: [
          {
            round: 1,
            agentId: "lead_moderator",
            agentName: "Lead Moderator",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Proposal: permit with disclosure rules."
          },
          {
            round: 1,
            agentId: "skeptic",
            agentName: "Skeptic",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Concern: over-reliance can reduce skill development."
          },
          {
            round: 1,
            agentId: "researcher",
            agentName: "Researcher",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Evidence: guided use can improve feedback loops."
          },
          {
            round: 1,
            agentId: "pragmatist",
            agentName: "Pragmatist",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Implementation: AI logs, attribution requirement, oral defense samples."
          },
          {
            round: 2,
            agentId: "lead_moderator",
            agentName: "Lead Moderator (Final Synthesis)",
            provider: "openai",
            model: "gpt-4.1-mini",
            content: "Final: allow with checks; no-AI checkpoints maintain baseline competence. Confidence: 80."
          }
        ]
      }
    ]
  }
];

export function buildPresetRun(preset: PresetQuestion): ExperimentRunRecord {
  const runId = safeUuid();
  const createdAt = new Date().toISOString();
  const shuffled = shuffle(preset.responses);
  const blindIds = ["Response A", "Response B", "Response C", "Response D"];
  const responses: BlindedResponse[] = shuffled.map((response, index) => ({
    blindId: blindIds[index] ?? `Response ${index + 1}`,
    answer: response.answer,
    sourceConditionId: response.sourceConditionId,
    sourceConditionLabel: response.sourceConditionLabel,
    transcript: response.transcript
  }));

  return {
    runId,
    createdAt,
    question: preset.question,
    mode: "preset",
    presetId: preset.id,
    responses
  };
}

function safeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function shuffle<T>(input: T[]): T[] {
  const next = [...input];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}
