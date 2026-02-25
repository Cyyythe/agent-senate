import { runExperiment } from "@/lib/experiment";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(8, "Question must be at least 8 characters.")
    .max(1500, "Question is too long for this MVP. Keep it under 1500 characters.")
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid request body."
        },
        { status: 400 }
      );
    }

    const result = await runExperiment(parsed.data.question);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json(
      {
        error: message
      },
      { status: 500 }
    );
  }
}
