import { ExperimentRunRecord } from "@/lib/survey-types";

const STORAGE_KEY = "agent-senate-runs-v1";

export function listRuns(): ExperimentRunRecord[] {
  return readRuns();
}

export function getRun(runId: string): ExperimentRunRecord | null {
  return readRuns().find((run) => run.runId === runId) ?? null;
}

export function upsertRun(run: ExperimentRunRecord): void {
  const runs = readRuns();
  const index = runs.findIndex((existing) => existing.runId === run.runId);

  if (index === -1) {
    runs.unshift(run);
  } else {
    runs[index] = run;
  }

  writeRuns(runs);
}

export function patchRun(runId: string, patch: Partial<ExperimentRunRecord>): ExperimentRunRecord | null {
  const runs = readRuns();
  const index = runs.findIndex((run) => run.runId === runId);

  if (index === -1) {
    return null;
  }

  const next: ExperimentRunRecord = {
    ...runs[index],
    ...patch
  };
  runs[index] = next;
  writeRuns(runs);
  return next;
}

function readRuns(): ExperimentRunRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isRunRecord);
  } catch {
    return [];
  }
}

function writeRuns(runs: ExperimentRunRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

function isRunRecord(value: unknown): value is ExperimentRunRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ExperimentRunRecord>;
  return (
    typeof candidate.runId === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.question === "string" &&
    (candidate.mode === "live" || candidate.mode === "preset") &&
    Array.isArray(candidate.responses)
  );
}
