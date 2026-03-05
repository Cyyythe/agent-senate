"use client";

import { BlindReviewClient } from "@/components/BlindReviewClient";
import { useParams } from "next/navigation";

export default function ReviewRunPage() {
  const params = useParams<{ runId: string }>();
  const runId = params?.runId;

  if (!runId) {
    return null;
  }

  return <BlindReviewClient runId={runId} />;
}
