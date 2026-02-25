"use client";

import { BlindedResponse, ExperimentApiResponse } from "@/lib/types";
import { FormEvent, useMemo, useState } from "react";

type RankingValue = "" | "1" | "2" | "3" | "4";

type RankingMap = Record<string, RankingValue>;

interface SubmittedRanking {
  correctness: RankingMap;
  confidence: RankingMap;
  submittedAt: string;
}

const rankOptions: RankingValue[] = ["", "1", "2", "3", "4"];

export function ExperimentClient() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<ExperimentApiResponse | null>(null);
  const [correctnessRank, setCorrectnessRank] = useState<RankingMap>({});
  const [confidenceRank, setConfidenceRank] = useState<RankingMap>({});
  const [rankingError, setRankingError] = useState("");
  const [submittedRanking, setSubmittedRanking] = useState<SubmittedRanking | null>(null);
  const [revealSources, setRevealSources] = useState(false);

  const responseCount = result?.responses.length ?? 0;

  const canSubmitRanking = useMemo(() => {
    if (!result) {
      return false;
    }

    const correctnessValues = result.responses.map((response) => correctnessRank[response.blindId] ?? "");
    const confidenceValues = result.responses.map((response) => confidenceRank[response.blindId] ?? "");

    return (
      allSelected(correctnessValues) &&
      allSelected(confidenceValues) &&
      noDuplicates(correctnessValues) &&
      noDuplicates(confidenceValues)
    );
  }, [confidenceRank, correctnessRank, result]);

  async function handleRunExperiment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setRankingError("");
    setSubmittedRanking(null);
    setRevealSources(false);

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
      setCorrectnessRank(makeEmptyRanking(payload.responses));
      setConfidenceRank(makeEmptyRanking(payload.responses));
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

    const correctnessValues = result.responses.map((response) => correctnessRank[response.blindId] ?? "");
    const confidenceValues = result.responses.map((response) => confidenceRank[response.blindId] ?? "");

    if (!allSelected(correctnessValues) || !allSelected(confidenceValues)) {
      setRankingError("Assign every response a rank for both correctness and confidence.");
      return;
    }

    if (!noDuplicates(correctnessValues) || !noDuplicates(confidenceValues)) {
      setRankingError("Each rank can only be used once per metric.");
      return;
    }

    setSubmittedRanking({
      correctness: correctnessRank,
      confidence: confidenceRank,
      submittedAt: new Date().toISOString()
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
          Submit one question to four LLM conditions, view responses blind, and rank them by correctness and confidence.
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
            <p>Use 1 as highest and 4 as lowest.</p>

            {result.responses.map((response) => (
              <div className="rank-row" key={`rank-${response.blindId}`}>
                <p>{response.blindId}</p>
                <label>
                  Correctness
                  <select
                    value={correctnessRank[response.blindId] ?? ""}
                    onChange={(event) =>
                      setCorrectnessRank((current) => ({
                        ...current,
                        [response.blindId]: event.target.value as RankingValue
                      }))
                    }
                  >
                    {rankOptions.slice(0, responseCount + 1).map((option) => (
                      <option key={`${response.blindId}-correctness-${option || "blank"}`} value={option}>
                        {option === "" ? "Select rank" : option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Confidence
                  <select
                    value={confidenceRank[response.blindId] ?? ""}
                    onChange={(event) =>
                      setConfidenceRank((current) => ({
                        ...current,
                        [response.blindId]: event.target.value as RankingValue
                      }))
                    }
                  >
                    {rankOptions.slice(0, responseCount + 1).map((option) => (
                      <option key={`${response.blindId}-confidence-${option || "blank"}`} value={option}>
                        {option === "" ? "Select rank" : option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}

            {rankingError ? <p className="error-text">{rankingError}</p> : null}

            <div className="ranking-actions">
              <button type="submit" disabled={!canSubmitRanking}>
                Save ranking
              </button>
              <button type="button" onClick={exportRunData} disabled={!submittedRanking}>
                Export run JSON
              </button>
              <button type="button" onClick={() => setRevealSources((current) => !current)} disabled={!submittedRanking}>
                {revealSources ? "Hide condition labels" : "Reveal condition labels"}
              </button>
            </div>
          </form>

          {submittedRanking ? (
            <RankingSummary responses={result.responses} submittedRanking={submittedRanking} />
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function RankingSummary({
  responses,
  submittedRanking
}: {
  responses: BlindedResponse[];
  submittedRanking: SubmittedRanking;
}) {
  const correctness = orderByRank(responses, submittedRanking.correctness);
  const confidence = orderByRank(responses, submittedRanking.confidence);

  return (
    <section className="panel summary-panel">
      <h2>Saved Ranking</h2>
      <p>Submitted at {new Date(submittedRanking.submittedAt).toLocaleTimeString()}.</p>
      <div className="summary-grid">
        <div>
          <h3>Correctness (High to Low)</h3>
          <ol>
            {correctness.map((response) => (
              <li key={`correctness-${response.blindId}`}>{response.blindId}</li>
            ))}
          </ol>
        </div>
        <div>
          <h3>Confidence (High to Low)</h3>
          <ol>
            {confidence.map((response) => (
              <li key={`confidence-${response.blindId}`}>{response.blindId}</li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function makeEmptyRanking(responses: BlindedResponse[]): RankingMap {
  return responses.reduce<RankingMap>((accumulator, response) => {
    accumulator[response.blindId] = "";
    return accumulator;
  }, {});
}

function allSelected(values: RankingValue[]): boolean {
  return values.every((value) => value !== "");
}

function noDuplicates(values: RankingValue[]): boolean {
  const filtered = values.filter((value) => value !== "");
  return new Set(filtered).size === filtered.length;
}

function orderByRank(responses: BlindedResponse[], ranks: RankingMap): BlindedResponse[] {
  return [...responses].sort((left, right) => Number.parseInt(ranks[left.blindId], 10) - Number.parseInt(ranks[right.blindId], 10));
}
