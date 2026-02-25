# Agent Senate MVP

MVP website for your capstone experiment comparing four LLM answer-generation conditions:

1. Single ChatGPT first-pass answer
2. Multi-agent debate across ChatGPT + Claude + Gemini + Grok
3. Multi-agent debate using 4 copies of ChatGPT with different roles
4. Single ChatGPT answer with a role prompt

Users submit one question, review four blinded outputs, rank each by correctness and confidence, and optionally reveal condition labels after ranking.

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

During early development, `ALLOW_MOCK_RESPONSES=true` returns placeholder text when keys are missing.

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
