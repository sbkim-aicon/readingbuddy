import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { CardConfig } from "@/lib/types";

const getCardsPath = () => path.join(process.cwd(), "data", "cards.json");

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

    return NextResponse.json(card);
  } catch {
    return NextResponse.json(
      { error: "Failed to read card" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const updates = await req.json();
    const cardsPath = getCardsPath();
    const data = await fs.readFile(cardsPath, "utf8");
    const cards: CardConfig[] = JSON.parse(data);
    const index = cards.findIndex((c) => c.card_id === params.cardId);

    if (index === -1) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Only allow updating specific safe fields
    const allowedFields = [
      "title",
      "subtitle",
      "voice_openai",
      "temperature",
      "active",
      "persona_name",
      "cover_image",
    ];
    for (const field of allowedFields) {
      if (field in updates) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cards[index] as any)[field] = updates[field];
      }
    }

    await fs.writeFile(cardsPath, JSON.stringify(cards, null, 2), "utf8");
    return NextResponse.json(cards[index]);
  } catch (err) {
    console.error("Failed to update card:", err);
    return NextResponse.json(
      { error: "Failed to update card", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
