import { Buffer } from "buffer";

export async function generateElevenLabsTTS(
    text: string,
    voiceId: string
): Promise<Buffer> {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    if (!ELEVENLABS_API_KEY) {
        throw new Error("Missing ELEVENLABS_API_KEY environment variable");
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

    // Using multilingual v2 as it's the standard for Korean voice gen
    const data = {
        text: text,
        model_id: "eleven_multilingual_v2",
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ElevenLabs TTS Error (${response.status}): ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
