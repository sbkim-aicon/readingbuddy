import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateTTS(text: string, voice: string = "alloy") {
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
