import { BlindedResponse } from "@/lib/types";

export type ConfidenceMap = Record<string, number>;

export interface RankingSubmission {
  correctnessOrder: string[];
  confidenceScores: ConfidenceMap;
  submittedAt: string;
}

export type RunMode = "live" | "preset";

export interface ExperimentRunRecord {
  runId: string;
  createdAt: string;
  question: string;
  mode: RunMode;
  presetId?: string;
  responses: BlindedResponse[];
  blindRanking?: RankingSubmission;
  informedRanking?: RankingSubmission;
}

export function makeDefaultConfidenceScores(responses: BlindedResponse[]): ConfidenceMap {
  return responses.reduce<ConfidenceMap>((accumulator, response) => {
    accumulator[response.blindId] = 50;
    return accumulator;
  }, {});
}

export function isRankingComplete(
  responses: BlindedResponse[],
  correctnessOrder: string[],
  confidenceScores: ConfidenceMap
): boolean {
  const ids = responses.map((response) => response.blindId);

  return (
    ids.length === correctnessOrder.length &&
    new Set(correctnessOrder).size === correctnessOrder.length &&
    ids.every((id) => correctnessOrder.includes(id)) &&
    ids.every((id) => Number.isFinite(confidenceScores[id]))
  );
}

export function reorderList(list: string[], sourceId: string, targetId: string): string[] {
  const sourceIndex = list.indexOf(sourceId);
  const targetIndex = list.indexOf(targetId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return list;
  }

  const next = [...list];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function buildPreview(answer: string): string {
  const normalized = answer.replace(/\s+/g, " ").trim();
  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
}
