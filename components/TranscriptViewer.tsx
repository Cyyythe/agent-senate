"use client";

import { BlindedResponse } from "@/lib/types";
import { useState } from "react";

interface TranscriptViewerProps {
  responses: BlindedResponse[];
  title: string;
  description: string;
}

export function TranscriptViewer({ responses, title, description }: TranscriptViewerProps) {
  const [activeTranscriptId, setActiveTranscriptId] = useState(responses[0]?.blindId ?? "");
  const activeResponse = responses.find((response) => response.blindId === activeTranscriptId) ?? responses[0] ?? null;

  if (!activeResponse) {
    return null;
  }

  return (
    <section className="panel transcript-panel">
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="transcript-tabs">
        {responses.map((response) => (
          <button
            key={`transcript-tab-${response.blindId}`}
            type="button"
            className={`transcript-tab ${response.blindId === activeResponse.blindId ? "active" : ""}`}
            onClick={() => setActiveTranscriptId(response.blindId)}
          >
            {response.blindId}
          </button>
        ))}
      </div>
      <div className="transcript-thread">
        {activeResponse.transcript.length === 0 ? (
          <p>No transcript available for this response.</p>
        ) : (
          activeResponse.transcript.map((turn, index) => (
            <article className="transcript-turn" key={`${activeResponse.blindId}-${turn.round}-${index}`}>
              <p className="turn-meta">
                Round {turn.round} - {turn.agentName} ({turn.provider}/{turn.model})
              </p>
              <p className="turn-content">{turn.content}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
