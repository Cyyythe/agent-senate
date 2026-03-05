"use client";

import { PRESET_QUESTIONS, buildPresetRun } from "@/lib/presets";
import { upsertRun } from "@/lib/survey-store";
import { useRouter } from "next/navigation";

export function PresetQuestionsClient() {
  const router = useRouter();

  function startPreset(id: string) {
    const preset = PRESET_QUESTIONS.find((entry) => entry.id === id);
    if (!preset) {
      return;
    }

    const run = buildPresetRun(preset);
    upsertRun(run);
    router.push(`/review/${run.runId}`);
  }

  function startRandomPreset() {
    const randomIndex = Math.floor(Math.random() * PRESET_QUESTIONS.length);
    const preset = PRESET_QUESTIONS[randomIndex];
    if (!preset) {
      return;
    }

    const run = buildPresetRun(preset);
    upsertRun(run);
    router.push(`/review/${run.runId}`);
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Control Track</p>
        <h1>Preset Questions</h1>
        <p className="hero-copy">
          Use pre-answered control prompts to run the same ranking workflow without spending additional API calls.
        </p>
      </section>

      <section className="panel">
        <div className="preset-header">
          <h2>Start a Preset Run</h2>
          <button type="button" onClick={startRandomPreset}>
            Use Random Preset
          </button>
        </div>

        <div className="preset-list">
          {PRESET_QUESTIONS.map((preset) => (
            <article key={preset.id} className="preset-card">
              <h3>{preset.title}</h3>
              <p>{preset.question}</p>
              <button type="button" onClick={() => startPreset(preset.id)}>
                Run This Preset
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
