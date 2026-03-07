import { NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
        }

        const elevenlabs = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY,
        });

        const audioStream = await elevenlabs.textToSoundEffects.convert({
            text: text,
        });

        // Collect stream into buffer and return as audio/mpeg directly
        const chunks: Buffer[] = [];
        for await (const chunk of audioStream as any) {
            chunks.push(Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);

        return new Response(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': buffer.length.toString(),
            },
        });

    } catch (error: unknown) {
        console.error("Sound generation error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
