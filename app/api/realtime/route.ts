import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { system_prompt, voice_openai, temperature, tools } = body;
        const isReadWithMe = body.card_type === 'read_with_me';

        // Fetch a WebRTC Ephemeral Token from OpenAI Realtime API
        // https://platform.openai.com/docs/guides/realtime-webrtc
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview",
                voice: voice_openai || "alloy",
                instructions: system_prompt || "You are a helpful reading buddy.",
                temperature: temperature || 0.8,
                modalities: ["audio", "text"],
                tools: tools || undefined,
                tool_choice: tools ? "auto" : undefined,
                turn_detection: {
                    type: "server_vad",
                    threshold: isReadWithMe ? 0.8 : 0.6, // Higher threshold (less sensitive) for reading
                    prefix_padding_ms: 300,
                    silence_duration_ms: isReadWithMe ? 3500 : 2500 // Wait even longer for children's reading
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
