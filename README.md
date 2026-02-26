# Agent Senate MVP

MVP website for your capstone experiment comparing four LLM answer-generation conditions:

1. Single ChatGPT first-pass answer
2. Multi-agent debate across ChatGPT + Claude + Gemini + Grok
3. Multi-agent debate using 4 copies of ChatGPT with different roles
4. Single ChatGPT answer with a role prompt

Users submit one question, review four blinded outputs, rank each by correctness and confidence, and optionally reveal condition labels after ranking.
After ranking, they can also inspect each response's full agent conversation transcript.
Ranking is done by dragging blinded response cards into order (high to low correctness) and setting a per-response confidence slider.

## Stack

- Next.js (App Router) + TypeScript
- Server-side API route for orchestration (`app/api/experiment/route.ts`)
- Provider adapters for OpenAI, Anthropic, Gemini, xAI (`lib/providers.ts`)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env template:

```bash
cp .env.example .env.local
```

3. Add API keys in `.env.local`.

4. Start dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

See `.env.example` for all keys. Minimum needed for real runs:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `XAI_API_KEY`

For your current setup (`FORCE_GEMINI_ONLY=true`), only `GEMINI_API_KEY` is required.

During early development, `ALLOW_MOCK_RESPONSES=true` returns placeholder text when keys are missing.

`FORCE_GEMINI_ONLY=true` is enabled by default so all four conditions run on Gemini right now.
Set it to `false` when you are ready to switch back to real multi-provider runs.

For quota-limited Gemini keys, the project now defaults to slower/safer settings:
- `SERIALIZE_CONDITIONS=true` (run each condition one after another)
- `DEBATE_ROUNDS=1`
- `DEBATE_MAX_OUTPUT_TOKENS=280`
- `GEMINI_REQUEST_SPACING_MS=6000`
- `GEMINI_MAX_RETRIES=2` (honors Gemini retry delays on 429)
- `GEMINI_FALLBACK_MODELS` can auto-try alternate model IDs when one model is capped
  - Use only model IDs confirmed by Gemini `ListModels` for your project/API version.

If you see `model ... not found` (404), your configured model ID is not available for your key/API version.
Use current IDs such as `gemini-2.5-flash` with fallback `gemini-flash-latest`.

## Debate flow

For each multi-agent condition:

1. Round 1: each agent proposes an initial answer.
2. Rounds 2..N: agents receive peer outputs, critique, defend, or concede.
3. Final synthesis: moderator agent produces one final answer representing best consensus.

Default rounds: `DEBATE_ROUNDS=3`.

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Add the same environment variables from `.env.local` to the Vercel project.
4. Deploy.

This project is ready for automatic deployments from GitHub pushes.
