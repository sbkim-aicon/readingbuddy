import fs from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import { CardConfig } from "@/lib/types";
import SpeakerSession from "@/components/SpeakerSession";

export default async function SpeakerPage({ params }: { params: { cardId: string } }) {
    let cards: CardConfig[] = [];
    try {
        const cardsFilePath = path.join(process.cwd(), "data", "cards.json");
        const cardsData = await fs.readFile(cardsFilePath, "utf8");
        cards = JSON.parse(cardsData);
    } catch (err) {
        console.error("Failed to load cards.json:", err);
        notFound();
    }

    const cardConfig = cards.find(c => c.card_id === params.cardId);

    if (!cardConfig || !cardConfig.active) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-[#F4F6F8] flex flex-col h-screen overflow-hidden">
            <SpeakerSession cardConfig={cardConfig} />
        </main>
    );
}
