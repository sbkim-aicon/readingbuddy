import { NextRequest, NextResponse } from "next/server";
import { generateTTS } from "@/lib/openai-tts";

export async function POST(req: NextRequest) {
    try {
        const { text, voice } = await req.json();
        if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

        const sanitized = text
            .replace(/\[.*?\]/g, "")
            .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ.,!?]/g, "")
            .trim();

        const audioBuffer = await generateTTS(sanitized, voice || "alloy");
        const audio_url = `data:audio/mp3;base64,${audioBuffer.toString("base64")}`;
        return NextResponse.json({ audio_url });
    } catch (error) {
        console.error("TTS API Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
