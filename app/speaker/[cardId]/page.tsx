import fs from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import { CardConfig, ReadingPhasePrompts } from "@/lib/types";
import { getActivePromptContent } from "@/lib/prompt-versions";
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

    // Load the prompt: try versioned prompt first, then fallback to file.
    if (cardConfig.card_type !== 'read_with_me') {
        const versionedPrompt = await getActivePromptContent(params.cardId, "default");
        if (versionedPrompt) {
            cardConfig.system_prompt = versionedPrompt;
        } else if (cardConfig.prompt_file) {
            try {
                const promptPath = path.join(process.cwd(), cardConfig.prompt_file);
                cardConfig.system_prompt = await fs.readFile(promptPath, "utf8");
            } catch (err) {
                console.error("Failed to load prompt file:", cardConfig.prompt_file, err);
            }
        }
    }

    // For read_with_me cards, load per-phase prompts (versioned first, then TEMP folder fallback).
    let readingPhasePrompts: ReadingPhasePrompts | null = null;
    if (cardConfig.card_type === 'read_with_me') {
        const [vPre, vDuring, vPost] = await Promise.all([
            getActivePromptContent(params.cardId, "pre"),
            getActivePromptContent(params.cardId, "during_dialogic"),
            getActivePromptContent(params.cardId, "post"),
        ]);

        if (vPre && vDuring && vPost) {
            readingPhasePrompts = { pre: vPre, during_dialogic: vDuring, post: vPost };
        } else {
            // Fallback to TEMP folder files
            const tempDir = path.join(process.cwd(), 'prompts/read_with_me/TEMP');
            try {
                const [pre, during_dialogic, post] = await Promise.all([
                    vPre ? Promise.resolve(vPre) : fs.readFile(path.join(tempDir, 'prompt_02_pre_reading.md'), 'utf8'),
                    vDuring ? Promise.resolve(vDuring) : fs.readFile(path.join(tempDir, 'prompt_03_during_dialogic.md'), 'utf8'),
                    vPost ? Promise.resolve(vPost) : fs.readFile(path.join(tempDir, 'prompt_05_post_reading.md'), 'utf8'),
                ]);
                readingPhasePrompts = { pre, during_dialogic, post };
            } catch (err) {
                console.error('Failed to load reading phase prompts:', err);
            }
        }
    }

    return (
        <main className="min-h-screen bg-[#F4F6F8] flex flex-col h-screen overflow-hidden">
            <SpeakerSession cardConfig={cardConfig} readingPhasePrompts={readingPhasePrompts} />
        </main>
    );
}
