import { NextRequest, NextResponse } from "next/server";
import { runFullGenreEval } from "@/lib/genre-eval-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Diagnostic evaluation harness — NOT for public end users.
 * Allowed when:
 * - NODE_ENV !== "production", OR
 * - header x-resonant-eval-key matches EVAL_SECRET env
 */
export async function GET(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const secret = process.env.EVAL_SECRET;
  const key = req.headers.get("x-resonant-eval-key");

  if (isProd) {
    if (!secret || key !== secret) {
      return NextResponse.json(
        { error: "Eval endpoint is not publicly available in production" },
        { status: 403 }
      );
    }
  }

  try {
    const result = await runFullGenreEval();
    return NextResponse.json(result, {
      status: result.pass ? 200 : 422,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[eval]", message);
    return NextResponse.json({ pass: false, error: message }, { status: 500 });
  }
}
