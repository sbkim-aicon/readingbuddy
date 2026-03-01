import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { CardConfig } from "@/lib/types";
import {
  getVersionFile,
  saveNewVersion,
  initializeFromFile,
  getPromptKeysForCardType,
} from "@/lib/prompt-versions";

const getCardsPath = () => path.join(process.cwd(), "data", "cards.json");

/**
 * GET: Retrieve prompt version data for a card.
 * Returns all prompt keys with their version history.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const data = await fs.readFile(getCardsPath(), "utf8");
    const cards: CardConfig[] = JSON.parse(data);
    const card = cards.find((c) => c.card_id === params.cardId);

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const promptKeys = getPromptKeysForCardType(card.card_type);
    const result: Record<string, unknown> = {};

    for (const { key } of promptKeys) {
      // Try to load existing version file
      let versionFile = await getVersionFile(params.cardId, key);

      // If no version file exists, initialize from existing prompt file
      if (!versionFile) {
        const filePath = getOriginalPromptPath(card, key);
        if (filePath) {
          try {
            versionFile = await initializeFromFile(params.cardId, key, filePath);
          } catch {
            // Write failed (e.g. read-only FS on Vercel) — read original file
            // and return as a virtual version so the editor still shows content.
            try {
              const content = await fs.readFile(filePath, "utf8");
              const virtualId = "v_original";
              versionFile = {
                card_id: params.cardId,
                prompt_key: key,
                active_version_id: virtualId,
                versions: [
                  {
                    id: virtualId,
                    content,
                    label: "v1 (original)",
                    created_at: new Date().toISOString(),
                  },
                ],
              };
            } catch {
              // Original file also doesn't exist
            }
          }
        }
      }

      result[key] = versionFile || {
        card_id: params.cardId,
        prompt_key: key,
        active_version_id: null,
        versions: [],
      };
    }

    return NextResponse.json({
      card_id: params.cardId,
      card_type: card.card_type,
      prompt_keys: promptKeys,
      prompts: result,
    });
  } catch (error) {
    console.error("Error loading prompts:", error);
    return NextResponse.json(
      { error: "Failed to load prompts" },
      { status: 500 }
    );
  }
}

/**
 * PUT: Save a new version of a prompt for a card.
 * Body: { prompt_key: string, content: string, label?: string }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const body = await req.json();
    const { prompt_key, content, label } = body;

    if (!prompt_key || content === undefined) {
      return NextResponse.json(
        { error: "prompt_key and content are required" },
        { status: 400 }
      );
    }

    const versionFile = await saveNewVersion(
      params.cardId,
      prompt_key,
      content,
      label
    );

    return NextResponse.json(versionFile);
  } catch (error) {
    console.error("Error saving prompt:", error);
    return NextResponse.json(
      { error: "Failed to save prompt" },
      { status: 500 }
    );
  }
}

function getOriginalPromptPath(
  card: CardConfig,
  promptKey: string
): string | null {
  if (card.card_type === "read_with_me") {
    const fileMap: Record<string, string> = {
      pre: "prompts/read_with_me/TEMP/prompt_02_pre_reading.md",
      during_dialogic:
        "prompts/read_with_me/TEMP/prompt_03_during_dialogic.md",
      post: "prompts/read_with_me/TEMP/prompt_05_post_reading.md",
    };
    const relative = fileMap[promptKey];
    return relative ? path.join(process.cwd(), relative) : null;
  }

  if (card.prompt_file) {
    return path.join(process.cwd(), card.prompt_file);
  }

  return null;
}
