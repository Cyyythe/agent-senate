"use client";

import { RankingBoard } from "@/components/RankingBoard";
import { ResponseGrid } from "@/components/ResponseGrid";
import { getRun, patchRun } from "@/lib/survey-store";
import { ConfidenceMap, ExperimentRunRecord, isRankingComplete, makeDefaultConfidenceScores } from "@/lib/survey-types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface BlindReviewClientProps {
  runId: string;
}

export function BlindReviewClient({ runId }: BlindReviewClientProps) {
  const router = useRouter();
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
        setCorrectnessOrder(loaded.blindRanking?.correctnessOrder ?? defaultOrder);
        setConfidenceScores(loaded.blindRanking?.confidenceScores ?? makeDefaultConfidenceScores(loaded.responses));
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

  function saveBlindRanking() {
    setErrorMessage("");

    if (!run) {
      return;
    }

    if (!isRankingComplete(run.responses, correctnessOrder, confidenceScores)) {
      setErrorMessage("Complete the ordering and confidence sliders before continuing.");
      return;
    }

    const updated = patchRun(runId, {
      blindRanking: {
        correctnessOrder,
        confidenceScores,
        submittedAt: new Date().toISOString()
      }
    });

    if (!updated) {
      setErrorMessage("Unable to save this run. Try again from the home page.");
      return;
    }

    router.push(`/results/${runId}`);
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
        <p className="eyebrow">Step 2</p>
        <h1>Blind Review</h1>
        <p className="hero-copy">Question: {run.question}</p>
      </section>

      <section className="results-wrap">
        <div className="result-header">
          <h2>Blinded Responses</h2>
          <p>
            Run ID: <code>{run.runId}</code>
          </p>
          <p>{new Date(run.createdAt).toLocaleString()}</p>
        </div>

        <ResponseGrid responses={run.responses} />

        <RankingBoard
          responses={run.responses}
          correctnessOrder={correctnessOrder}
          confidenceScores={confidenceScores}
          onCorrectnessOrderChange={setCorrectnessOrder}
          onConfidenceScoresChange={setConfidenceScores}
          heading="Rank Outputs"
          description="Drag cards from highest to lowest correctness, then set your confidence in each answer."
        />

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

        <div className="page-actions">
          <button type="button" disabled={!canSave} onClick={saveBlindRanking}>
            Save Ranking and Continue
          </button>
          <Link href="/">Return Home</Link>
        </div>
      </section>
    </main>
  );
}
