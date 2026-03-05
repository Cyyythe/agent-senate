"use client";

import { upsertRun } from "@/lib/survey-store";
import { ExperimentRunRecord } from "@/lib/survey-types";
import { ExperimentApiResponse } from "@/lib/types";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function AskQuestionClient() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRunExperiment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

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

      const runRecord: ExperimentRunRecord = {
        runId: payload.runId,
        createdAt: payload.createdAt,
        question: payload.question,
        mode: "live",
        responses: payload.responses
      };
      upsertRun(runRecord);
      router.push(`/review/${payload.runId}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error while running experiment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Step 1</p>
        <h1>Ask a Question</h1>
        <p className="hero-copy">
          Submit one question and the system will run all four conditions. You will rank outputs blind on the next page.
        </p>
      </section>

      <section className="panel">
        <form onSubmit={handleRunExperiment} className="question-form">
          <label htmlFor="question">Question for all conditions</label>
          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Example: Should cities ban private cars in downtown zones?"
            rows={6}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Running experiment..." : "Run experiment"}
          </button>
        </form>
        {loading ? (
          <div className="thinking-box">
            <p>Generating responses. Multi-agent debate rounds may take around 30-90 seconds.</p>
          </div>
        ) : null}
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </section>
    </main>
  );
}
