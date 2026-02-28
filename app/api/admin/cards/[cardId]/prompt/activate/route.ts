import { NextRequest, NextResponse } from "next/server";
import { activateVersion } from "@/lib/prompt-versions";

/**
 * POST: Activate a specific version for a prompt key.
 * Body: { prompt_key: string, version_id: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const body = await req.json();
    const { prompt_key, version_id } = body;

    if (!prompt_key || !version_id) {
      return NextResponse.json(
        { error: "prompt_key and version_id are required" },
        { status: 400 }
      );
    }

    const result = await activateVersion(params.cardId, prompt_key, version_id);

    if (!result) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error activating version:", error);
    return NextResponse.json(
      { error: "Failed to activate version" },
      { status: 500 }
    );
  }
}
