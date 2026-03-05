"use client";

import { ResultsClient } from "@/components/ResultsClient";
import { useParams } from "next/navigation";

export default function ResultsRunPage() {
  const params = useParams<{ runId: string }>();
  const runId = params?.runId;

  if (!runId) {
    return null;
  }

  return <ResultsClient runId={runId} />;
}
