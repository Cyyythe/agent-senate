"use client";

import { BlindedResponse } from "@/lib/types";
import { buildPreview, ConfidenceMap, reorderList } from "@/lib/survey-types";
import { useState } from "react";

interface RankingBoardProps {
  responses: BlindedResponse[];
  correctnessOrder: string[];
  confidenceScores: ConfidenceMap;
  onCorrectnessOrderChange: (order: string[]) => void;
  onConfidenceScoresChange: (scores: ConfidenceMap) => void;
  heading: string;
  description: string;
  showSourceLabels?: boolean;
}

export function RankingBoard({
  responses,
  correctnessOrder,
  confidenceScores,
  onCorrectnessOrderChange,
  onConfidenceScoresChange,
  heading,
  description,
  showSourceLabels = false
}: RankingBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      return;
    }

    onCorrectnessOrderChange(reorderList(correctnessOrder, draggingId, targetId));
    setDraggingId(null);
  }

  function moveResponse(id: string, direction: "up" | "down") {
    const currentIndex = correctnessOrder.indexOf(id);
    if (currentIndex === -1) {
      return;
    }

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= correctnessOrder.length) {
      return;
    }

    const nextOrder = [...correctnessOrder];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
    onCorrectnessOrderChange(nextOrder);
  }

  return (
    <section className="ranking-panel">
      <h2>{heading}</h2>
      <p>{description}</p>
      <div className="arrange-list">
        {correctnessOrder.map((blindId, index) => {
          const response = responses.find((item) => item.blindId === blindId);

          if (!response) {
            return null;
          }

          return (
            <article
              key={`arrange-${blindId}`}
              className={`arrange-card ${draggingId === blindId ? "dragging" : ""}`}
              draggable
              onDragStart={() => setDraggingId(blindId)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(blindId)}
            >
              <div className="arrange-head">
                <p>
                  #{index + 1} {blindId}
                </p>
                <span className="drag-hint">Drag to reorder</span>
              </div>
              {showSourceLabels ? <p className="source-chip">{response.sourceConditionLabel}</p> : null}
              <p className="arrange-preview">{buildPreview(response.answer)}</p>
              <label className="confidence-control">
                Confidence in this answer: <strong>{Math.round(confidenceScores[blindId] ?? 50)}%</strong>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={confidenceScores[blindId] ?? 50}
                  onChange={(event) =>
                    onConfidenceScoresChange({
                      ...confidenceScores,
                      [blindId]: Number.parseInt(event.target.value, 10)
                    })
                  }
                />
              </label>
              <div className="arrange-buttons">
                <button type="button" onClick={() => moveResponse(blindId, "up")} disabled={index === 0}>
                  Move up
                </button>
                <button
                  type="button"
                  onClick={() => moveResponse(blindId, "down")}
                  disabled={index === correctnessOrder.length - 1}
                >
                  Move down
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
