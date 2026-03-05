"use client";

import { listRuns } from "@/lib/survey-store";
import { ExperimentRunRecord } from "@/lib/survey-types";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HomeClient() {
  const [runs, setRuns] = useState<ExperimentRunRecord[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setRuns(listRuns());
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Survey Home</p>
        <h1>Agent Senate Study Flow</h1>
        <p className="hero-copy">
          Run a live question for participant data or use preset controls to save API usage while keeping the ranking process identical.
        </p>
      </section>

      <section className="panel home-actions">
        <Link href="/ask" className="big-action">
          Ask a New Question
        </Link>
        <Link href="/presets" className="big-action secondary">
          View Preset Questions
        </Link>
      </section>

      <section className="panel">
        <h2>Recent Sessions</h2>
        {runs.length === 0 ? (
          <p>No sessions yet. Start from one of the actions above.</p>
        ) : (
          <div className="recent-runs">
            {runs.slice(0, 10).map((run) => {
              const destination = run.blindRanking ? `/results/${run.runId}` : `/review/${run.runId}`;

              return (
                <Link key={run.runId} href={destination} className="run-chip">
                  <span>{run.mode === "preset" ? "Preset" : "Live"}</span>
                  <strong>{new Date(run.createdAt).toLocaleString()}</strong>
                  <span>{run.question}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
