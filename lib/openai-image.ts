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

export async function generateOpenAIImage(prompt: string): Promise<string> {
    const openai = getOpenAIClient();
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: "url", // or b64_json
        });

        const imageUrl = response?.data?.[0]?.url;
        if (!imageUrl) {
            throw new Error("No image URL returned from OpenAI");
        }
        return imageUrl;
    } catch (error) {
        console.error("OpenAI Image Generation Error:", error);
        throw error;
    }
}
