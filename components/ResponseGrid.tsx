"use client";

import { BlindedResponse } from "@/lib/types";

interface ResponseGridProps {
  responses: BlindedResponse[];
  showSources?: boolean;
}

export function ResponseGrid({ responses, showSources = false }: ResponseGridProps) {
  return (
    <div className="response-grid">
      {responses.map((response, index) => (
        <article
          key={response.blindId}
          className="response-card"
          style={{ animationDelay: `${index * 110}ms` }}
        >
          <h3>{response.blindId}</h3>
          <p className="answer-text">{response.answer}</p>
          {showSources ? <p className="source-chip">{response.sourceConditionLabel}</p> : null}
        </article>
      ))}
    </div>
  );
}
