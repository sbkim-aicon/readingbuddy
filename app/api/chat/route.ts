import { NextRequest, NextResponse } from "next/server";
import { generateOpenAIChatResponse } from "@/lib/openai-chat";
import { generateTTS } from "@/lib/openai-tts";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { card_id, message, conversation_history = [] } = body;

        if (!card_id || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Get Card Configuration and its Prompt
        const cardsFilePath = path.join(process.cwd(), "data", "cards.json");
        const cardsData = JSON.parse(await fs.readFile(cardsFilePath, "utf8"));
        const cardConfig = cardsData.find((c: { card_id: string }) => c.card_id === card_id);

        if (!cardConfig) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        let systemPrompt = "";
        let finalMessage = message;

        if (cardConfig.card_type === 'read_with_me' && body.session_state && body.book_data) {
            const { phase, currentPageIndex } = body.session_state;
            const bookData = body.book_data;

            let promptPath = "";
            if (phase === 'PRE') {
                promptPath = path.join(process.cwd(), "prompts", "read_with_me", "prompt_02_pre_reading.md");
            } else if (phase === 'DURING_DIALOGIC') {
                promptPath = path.join(process.cwd(), "prompts", "read_with_me", "prompt_03_during_dialogic.md");
            } else if (phase === 'POST') {
                promptPath = path.join(process.cwd(), "prompts", "read_with_me", "prompt_05_post_reading.md");
            }

            if (promptPath) {
                const template = await fs.readFile(promptPath, "utf8");
                systemPrompt = template;
            }

            // Provide full book context and current session state as structured data
            systemPrompt += `\n\n[SESSION_CONTEXT]
Current Phase: ${phase}
Current Page Index: ${currentPageIndex}
Total Pages: ${bookData.book_metadata.total_pages}

[FULL_BOOK_DATA]
${JSON.stringify(bookData, null, 2)}

[RESPONSE FORMAT INSTRUCTIONS]
You must respond in strict JSON format. Do NOT wrap it in markdown block quotes. Use the following schema:
{
  "response": "Your spoken dialogue here",
  "next_state": {
    "phase": "PRE" | "DURING_DIALOGIC" | "POST" | "END",
    "currentPageIndex": number
  }
}
Based on the current conversation progress, determine the next state. 
- If staying on current page/phase, return the same phase and currentPageIndex.
- If moving to reading, change phase to "DURING_DIALOGIC" and currentPageIndex to 0.
- If moving to next page, keep "DURING_DIALOGIC" and increment currentPageIndex.
- If last page is done, change phase to "POST".
- If POST reading is done, change phase to "END".

[CURRENT_STATE]
Phase: ${phase}
CurrentPageIndex: ${currentPageIndex}
TotalPages: ${bookData.book_metadata.total_pages}
`;
            finalMessage = `[CHILD_RESPONSE]\n${message}`;

        } else {
            // Fallback to standard general prompt
            if (cardConfig.prompt_file) {
                const promptPath = path.join(process.cwd(), cardConfig.prompt_file);
                systemPrompt = await fs.readFile(promptPath, "utf8");
            }
        }

        // 2. Get OpenAI Text Response
        const isJsonMode = cardConfig.card_type === 'read_with_me';
        const aiResponseRaw = await generateOpenAIChatResponse(systemPrompt, finalMessage, conversation_history, isJsonMode);

        let aiResponseText = aiResponseRaw;
        let newSessionState = null;

        if (isJsonMode) {
            try {
                const parsed = JSON.parse(aiResponseRaw);
                aiResponseText = parsed.response || "응답을 파싱할 수 없습니다.";
                newSessionState = parsed.next_state;
            } catch {
                console.error("Failed to parse JSON response:", aiResponseRaw);
                aiResponseText = "응답 오류가 발생했습니다.";
            }
        }

        let audioBase64 = null;
        try {
            // 3. Optional: Generate TTS Audio for the response
            // Sanitize text for TTS: Remove square bracket tags and extra symbols
            const sanitizedText = aiResponseText
                .replace(/\[.*?\]/g, "") // Strip [tags]
                .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ.,!?]/g, "") // Keep only letters, spaces, and basic punctuation
                .trim();

            const audioBuffer = await generateTTS(sanitizedText, cardConfig.voice_openai);
            audioBase64 = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
        } catch (ttsErr) {
            console.error("TTS generation failed, returning text only.", ttsErr);
        }

        return NextResponse.json({
            response: aiResponseText,
            audio_url: audioBase64,
            ...(newSessionState && { session_state: newSessionState })
        });

    } catch (error) {
        console.error("Chat API Route Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
