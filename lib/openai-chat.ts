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

export async function generateOpenAIChatResponse(
    systemPrompt: string,
    userMessage: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chatHistory: any[] = [],
    isJsonMode: boolean = false,
    model: string = "gpt-4o-mini"
) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const messages: any[] = [
            { role: "system", content: systemPrompt },
            ...chatHistory,
            { role: "user", content: userMessage }
        ];

        const openai = getOpenAIClient();
        const response = await openai.chat.completions.create({
            model: model, // Using provided model or gpt-4o-mini default
            messages: messages,
            temperature: isJsonMode ? 0.2 : 0.8,
            max_tokens: isJsonMode ? 2048 : 2048,
            response_format: isJsonMode ? { type: "json_object" } : { type: "text" }
        });

        return response.choices[0].message.content || (isJsonMode ? "{}" : "대답을 생성할 수 없습니다.");
    } catch (error) {
        console.error("OpenAI Chat API Error:", error);
        throw error;
    }
}
