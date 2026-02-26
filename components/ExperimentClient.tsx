"use client";

import { BlindedResponse, ExperimentApiResponse } from "@/lib/types";
import { FormEvent, useMemo, useState } from "react";

type ConfidenceMap = Record<string, number>;

interface SubmittedRanking {
  correctnessOrder: string[];
  confidenceScores: ConfidenceMap;
  submittedAt: string;
}

export function ExperimentClient() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<ExperimentApiResponse | null>(null);
  const [correctnessOrder, setCorrectnessOrder] = useState<string[]>([]);
  const [confidenceScores, setConfidenceScores] = useState<ConfidenceMap>({});
  const [rankingError, setRankingError] = useState("");
  const [submittedRanking, setSubmittedRanking] = useState<SubmittedRanking | null>(null);
  const [revealSources, setRevealSources] = useState(false);
  const [showTranscripts, setShowTranscripts] = useState(false);
  const [activeTranscriptId, setActiveTranscriptId] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const canSubmitRanking = useMemo(() => {
    if (!result) {
      return false;
    }

    const ids = result.responses.map((response) => response.blindId);

    return (
      ids.length === correctnessOrder.length &&
      new Set(correctnessOrder).size === correctnessOrder.length &&
      ids.every((id) => correctnessOrder.includes(id)) &&
      ids.every((id) => Number.isFinite(confidenceScores[id]))
    );
  }, [confidenceScores, correctnessOrder, result]);

  async function handleRunExperiment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setRankingError("");
    setSubmittedRanking(null);
    setRevealSources(false);
    setShowTranscripts(false);
    setActiveTranscriptId("");
    setDraggingId(null);

    if (question.trim().length < 8) {
      setErrorMessage("Enter a fuller question (at least 8 characters).");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/experiment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question })
      });

      const payload = (await response.json()) as ExperimentApiResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Experiment request failed.");
      }

      setResult(payload);
      setCorrectnessOrder(payload.responses.map((response) => response.blindId));
      setConfidenceScores(makeDefaultConfidenceScores(payload.responses));
      setActiveTranscriptId(payload.responses[0]?.blindId ?? "");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error while running experiment.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleRankingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRankingError("");

    if (!result) {
      return;
    }

    const ids = result.responses.map((response) => response.blindId);

    if (ids.length !== correctnessOrder.length || new Set(correctnessOrder).size !== correctnessOrder.length) {
      setRankingError("Arrange all responses into a unique correctness order.");
      return;
    }

    const invalidConfidence = ids.some((id) => !Number.isFinite(confidenceScores[id]));
    if (invalidConfidence) {
      setRankingError("Set a confidence score for every response.");
      return;
    }

    setSubmittedRanking({
      correctnessOrder,
      confidenceScores,
      submittedAt: new Date().toISOString()
    });
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      return;
    }

    setCorrectnessOrder((current) => reorderList(current, draggingId, targetId));
    setDraggingId(null);
  }

  function moveResponse(id: string, direction: "up" | "down") {
    setCorrectnessOrder((current) => {
      const currentIndex = current.indexOf(id);
      if (currentIndex === -1) {
        return current;
      }

      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return next;
    });
  }

  function exportRunData() {
    if (!result) {
      return;
    }

    const payload = {
      ...result,
      ranking: submittedRanking
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agent-senate-run-${result.runId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Capstone MVP</p>
        <h1>Agent Senate</h1>
        <p className="hero-copy">
          Submit one question to four LLM conditions, view responses blind, drag them into correctness order, and set confidence with sliders.
        </p>
      </section>

      <section className="panel">
        <form onSubmit={handleRunExperiment} className="question-form">
          <label htmlFor="question">Question for all conditions</label>
          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Example: Should a city ban private cars downtown to reduce emissions?"
            rows={5}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Running experiment..." : "Run all 4 conditions"}
          </button>
        </form>

        {loading ? (
          <div className="thinking-box">
            <p>Generating responses. Multi-agent debate rounds can take 30-90 seconds.</p>
          </div>
        ) : null}

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </section>

      {result ? (
        <section className="results-wrap">
          <div className="result-header">
            <h2>Blinded Responses</h2>
            <p>
              Run ID: <code>{result.runId}</code>
            </p>
            <p>{new Date(result.createdAt).toLocaleString()}</p>
          </div>

          <div className="response-grid">
            {result.responses.map((response, index) => (
              <article
                key={response.blindId}
                className="response-card"
                style={{ animationDelay: `${index * 110}ms` }}
              >
                <h3>{response.blindId}</h3>
                <p className="answer-text">{response.answer}</p>
                {revealSources ? <p className="source-chip">{response.sourceConditionLabel}</p> : null}
              </article>
            ))}
          </div>

          <form className="ranking-panel" onSubmit={handleRankingSubmit}>
            <h2>Rank Outputs</h2>
            <p>Drag cards top-to-bottom for correctness (highest to lowest), then set your confidence in each answer.</p>

            <div className="arrange-list">
              {correctnessOrder.map((blindId, index) => {
                const response = result.responses.find((item) => item.blindId === blindId);

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
                          setConfidenceScores((current) => ({
                            ...current,
                            [blindId]: Number.parseInt(event.target.value, 10)
                          }))
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

            {rankingError ? <p className="error-text">{rankingError}</p> : null}

            <div className="ranking-actions">
              <button type="submit" disabled={!canSubmitRanking}>
                Save ranking
              </button>
              <button type="button" onClick={exportRunData} disabled={!submittedRanking}>
                Export run JSON
              </button>
              <button type="button" onClick={() => setShowTranscripts((current) => !current)} disabled={!submittedRanking}>
                {showTranscripts ? "Hide conversations" : "View conversations"}
              </button>
              <button type="button" onClick={() => setRevealSources((current) => !current)} disabled={!submittedRanking}>
                {revealSources ? "Hide condition labels" : "Reveal condition labels"}
              </button>
            </div>
          </form>

          {submittedRanking ? (
            <RankingSummary responses={result.responses} submittedRanking={submittedRanking} />
          ) : null}

          {submittedRanking && showTranscripts ? (
            <TranscriptViewer
              responses={result.responses}
              activeTranscriptId={activeTranscriptId}
              onTranscriptChange={setActiveTranscriptId}
            />
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function TranscriptViewer({
  responses,
  activeTranscriptId,
  onTranscriptChange
}: {
  responses: BlindedResponse[];
  activeTranscriptId: string;
  onTranscriptChange: (value: string) => void;
}) {
  const activeResponse =
    responses.find((response) => response.blindId === activeTranscriptId) ?? responses[0] ?? null;

  if (!activeResponse) {
    return null;
  }

  return (
    <section className="panel transcript-panel">
      <h2>Post-Rating Conversation View</h2>
      <p>Unlocked after rating to reduce bias. Select a blinded response to inspect its full discussion transcript.</p>
      <div className="transcript-tabs">
        {responses.map((response) => (
          <button
            key={`transcript-tab-${response.blindId}`}
            type="button"
            className={`transcript-tab ${response.blindId === activeResponse.blindId ? "active" : ""}`}
            onClick={() => onTranscriptChange(response.blindId)}
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
                Round {turn.round} - {turn.agentName}
              </p>
              <p className="turn-content">{turn.content}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function RankingSummary({
  responses,
  submittedRanking
}: {
  responses: BlindedResponse[];
  submittedRanking: SubmittedRanking;
}) {
  const correctness = submittedRanking.correctnessOrder
    .map((id) => responses.find((response) => response.blindId === id))
    .filter((response): response is BlindedResponse => response !== undefined);

  return (
    <section className="panel summary-panel">
      <h2>Saved Ranking</h2>
      <p>Submitted at {new Date(submittedRanking.submittedAt).toLocaleTimeString()}.</p>
      <h3>Correctness Order with Confidence</h3>
      <ol>
        {correctness.map((response) => (
          <li key={`correctness-${response.blindId}`}>
            {response.blindId} ({Math.round(submittedRanking.confidenceScores[response.blindId] ?? 0)}% confidence)
          </li>
        ))}
      </ol>
    </section>
  );
}

function makeDefaultConfidenceScores(responses: BlindedResponse[]): ConfidenceMap {
  return responses.reduce<ConfidenceMap>((accumulator, response) => {
    accumulator[response.blindId] = 50;
    return accumulator;
  }, {});
}

function reorderList(list: string[], sourceId: string, targetId: string): string[] {
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

function buildPreview(answer: string): string {
  const normalized = answer.replace(/\s+/g, " ").trim();
  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
}
