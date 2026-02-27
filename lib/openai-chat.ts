import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateOpenAIChatResponse(
    systemPrompt: string,
    userMessage: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chatHistory: any[] = [],
    isJsonMode: boolean = false
) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const messages: any[] = [
            { role: "system", content: systemPrompt },
            ...chatHistory,
            { role: "user", content: userMessage }
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Using gpt-4o-mini for faster prototype responses
            messages: messages,
            temperature: isJsonMode ? 0.2 : 0.8,
            max_tokens: isJsonMode ? 4096 : 1024,
            response_format: isJsonMode ? { type: "json_object" } : { type: "text" }
        });

        return response.choices[0].message.content || (isJsonMode ? "{}" : "대답을 생성할 수 없습니다.");
    } catch (error) {
        console.error("OpenAI Chat API Error:", error);
        throw error;
    }
}
