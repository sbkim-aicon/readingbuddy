import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;

function getOpenAIClient() {
    if (!openaiInstance) {
        openaiInstance = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiInstance;
}

export async function generateTTS(text: string, voice: string = "alloy") {
    const openai = getOpenAIClient();
    try {
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
            input: text,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        return buffer;
    } catch (error) {
        console.error("OpenAI TTS Error:", error);
        throw error;
    }
}
