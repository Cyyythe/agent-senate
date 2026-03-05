"use client";

import { RankingBoard } from "@/components/RankingBoard";
import { RankingSummary } from "@/components/RankingSummary";
import { ResponseGrid } from "@/components/ResponseGrid";
import { TranscriptViewer } from "@/components/TranscriptViewer";
import { getRun, patchRun } from "@/lib/survey-store";
import { ConfidenceMap, ExperimentRunRecord, isRankingComplete, makeDefaultConfidenceScores } from "@/lib/survey-types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface ResultsClientProps {
  runId: string;
}

export function ResultsClient({ runId }: ResultsClientProps) {
  const [run, setRun] = useState<ExperimentRunRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [correctnessOrder, setCorrectnessOrder] = useState<string[]>([]);
  const [confidenceScores, setConfidenceScores] = useState<ConfidenceMap>({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const loaded = getRun(runId);

      if (loaded) {
        setRun(loaded);
        const defaultOrder = loaded.responses.map((response) => response.blindId);
        setCorrectnessOrder(
          loaded.informedRanking?.correctnessOrder ?? loaded.blindRanking?.correctnessOrder ?? defaultOrder
        );
        setConfidenceScores(
          loaded.informedRanking?.confidenceScores ??
            loaded.blindRanking?.confidenceScores ??
            makeDefaultConfidenceScores(loaded.responses)
        );
      }

      setReady(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [runId]);

  const canSave = useMemo(() => {
    if (!run) {
      return false;
    }

    return isRankingComplete(run.responses, correctnessOrder, confidenceScores);
  }, [confidenceScores, correctnessOrder, run]);

  function saveInformedRanking() {
    setErrorMessage("");

    if (!run) {
      return;
    }

    if (!isRankingComplete(run.responses, correctnessOrder, confidenceScores)) {
      setErrorMessage("Complete the ordering and confidence sliders before saving.");
      return;
    }

    const updated = patchRun(runId, {
      informedRanking: {
        correctnessOrder,
        confidenceScores,
        submittedAt: new Date().toISOString()
      }
    });

    if (!updated) {
      setErrorMessage("Unable to save reranking for this run.");
      return;
    }

    setRun(updated);
  }

  function exportRunData() {
    if (!run) {
      return;
    }

    const blob = new Blob([JSON.stringify(run, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agent-senate-results-${run.runId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (ready && !run) {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Run Not Found</h2>
          <p>This run ID was not found in local storage.</p>
          <Link href="/">Return Home</Link>
        </section>
      </main>
    );
  }

  if (!run) {
    return (
      <main className="page-shell">
        <section className="panel">
          <p>Loading run data...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Step 3</p>
        <h1>Saved Results and Revealed Sources</h1>
        <p className="hero-copy">Question: {run.question}</p>
      </section>

      <section className="results-wrap">
        <div className="result-header">
          <h2>Revealed Responses</h2>
          <p>
            Run ID: <code>{run.runId}</code>
          </p>
          <p>{new Date(run.createdAt).toLocaleString()}</p>
        </div>

        <ResponseGrid responses={run.responses} showSources />

        {run.blindRanking ? (
          <RankingSummary title="Blind Ranking" responses={run.responses} ranking={run.blindRanking} />
        ) : (
          <section className="panel">
            <p>No blind ranking was saved for this run yet.</p>
          </section>
        )}

        <RankingBoard
          responses={run.responses}
          correctnessOrder={correctnessOrder}
          confidenceScores={confidenceScores}
          onCorrectnessOrderChange={setCorrectnessOrder}
          onConfidenceScoresChange={setConfidenceScores}
          heading="Re-rank with Source Labels"
          description="Now that sources are revealed, drag to re-order correctness and adjust confidence."
          showSourceLabels
        />

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

        <div className="page-actions">
          <button type="button" disabled={!canSave} onClick={saveInformedRanking}>
            Save Reranking
          </button>
          <button type="button" onClick={exportRunData}>
            Export Run JSON
          </button>
          <Link href="/">Return Home</Link>
        </div>

        {run.informedRanking ? (
          <RankingSummary title="Informed Re-ranking" responses={run.responses} ranking={run.informedRanking} />
        ) : null}

        <TranscriptViewer
          responses={run.responses}
          title="Conversation Viewer"
          description="Inspect each response transcript and full agent debate history."
        />
      </section>
    </main>
  );
}
