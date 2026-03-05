"use client";

import { RankingSubmission } from "@/lib/survey-types";
import { BlindedResponse } from "@/lib/types";

interface RankingSummaryProps {
  title: string;
  responses: BlindedResponse[];
  ranking: RankingSubmission;
}

export function RankingSummary({ title, responses, ranking }: RankingSummaryProps) {
  const ordered = ranking.correctnessOrder
    .map((id) => responses.find((response) => response.blindId === id))
    .filter((response): response is BlindedResponse => response !== undefined);

  return (
    <section className="panel summary-panel">
      <h2>{title}</h2>
      <p>Saved at {new Date(ranking.submittedAt).toLocaleString()}.</p>
      <ol>
        {ordered.map((response) => (
          <li key={`${title}-${response.blindId}`}>
            {response.blindId} ({Math.round(ranking.confidenceScores[response.blindId] ?? 0)}% confidence)
          </li>
        ))}
      </ol>
    </section>
  );
}
