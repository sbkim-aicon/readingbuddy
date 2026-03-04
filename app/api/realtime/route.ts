import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { system_prompt, voice_openai, temperature } = body;

        // Fetch a WebRTC Ephemeral Token from OpenAI Realtime API
        // https://platform.openai.com/docs/guides/realtime-webrtc
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini-realtime-preview",
                voice: voice_openai || "alloy",
                instructions: system_prompt || "You are a helpful reading buddy.",
                temperature: temperature || 0.8,
                modalities: ["audio", "text"],
                turn_detection: {
                    type: "server_vad",
                    threshold: 0.6,         // less hair-trigger (default 0.5)
                    prefix_padding_ms: 300,
                    silence_duration_ms: 1200 // longer pause before AI speaks again
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI Token API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: unknown) {
        console.error("Realtime API Token Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
