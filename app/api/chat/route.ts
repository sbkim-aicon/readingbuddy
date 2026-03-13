import { NextRequest, NextResponse } from "next/server";
import { generateOpenAIChatResponse } from "@/lib/openai-chat";
import { getActivePromptContent } from "@/lib/prompt-versions";
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

            // Map phase to prompt key for versioned prompts
            const phaseKeyMap: Record<string, string> = {
                'PRE': 'pre',
                'DURING_DIALOGIC': 'during_dialogic',
                'POST': 'post',
            };
            const promptKey = phaseKeyMap[phase];

            if (promptKey) {
                // Try versioned prompt first
                const versionedContent = await getActivePromptContent(card_id, promptKey);
                if (versionedContent) {
                    systemPrompt = versionedContent;
                } else {
                    // Fallback to original file
                    let promptPath = "";
                    if (cardConfig.is_listen_only) {
                        if (phase === 'PRE') {
                            promptPath = path.join(process.cwd(), "prompts", "read_with_me", "Prompt 02 pre reading_listen.md");
                        } else if (phase === 'DURING_DIALOGIC') {
                            promptPath = path.join(process.cwd(), "prompts", "read_with_me", "Prompt 03 during dialogic_listen.md");
                        } else if (phase === 'POST') {
                            promptPath = path.join(process.cwd(), "prompts", "read_with_me", "Prompt 05 post reading_listen.md");
                        }
                    } else {
                        if (phase === 'PRE') {
                            promptPath = path.join(process.cwd(), "prompts", "read_with_me", "Prompt 02 pre reading.md");
                        } else if (phase === 'DURING_DIALOGIC') {
                            promptPath = path.join(process.cwd(), "prompts", "read_with_me", "Prompt 03 during dialogic.md");
                        } else if (phase === 'POST') {
                            promptPath = path.join(process.cwd(), "prompts", "read_with_me", "Prompt 05 post reading.md");
                        }
                    }
                    if (promptPath) {
                        systemPrompt = await fs.readFile(promptPath, "utf8");
                    }
                }
            }

            // Provide only current page data (not full book) to minimize token usage
            const currentPage = bookData.pages?.[currentPageIndex] ?? null;
            const nextPage = bookData.pages?.[currentPageIndex + 1] ?? null;
            const trimmedBookContext = {
                book_metadata: bookData.book_metadata,
                current_page: currentPage,
                ...(nextPage ? { next_page: nextPage } : {}),
            };
            systemPrompt += `\n\n[SESSION_CONTEXT]
Current Phase: ${phase}
Current Page Index: ${currentPageIndex}
Total Pages: ${bookData.book_metadata.total_pages}

[BOOK_DATA]
${JSON.stringify(trimmedBookContext, null, 2)}

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
            // Try versioned prompt first, then fallback to file
            const versionedContent = await getActivePromptContent(card_id, "default");
            if (versionedContent) {
                systemPrompt = versionedContent;
            } else if (cardConfig.prompt_file) {
                const promptPath = path.join(process.cwd(), cardConfig.prompt_file);
                systemPrompt = await fs.readFile(promptPath, "utf8");
            }

            if (body.session_state) {
                systemPrompt += `\n\n[SESSION_STATE]\n${JSON.stringify(body.session_state, null, 2)}`;
            }

            if (cardConfig.use_json_mode) {
                systemPrompt += `\n\n[RESPONSE FORMAT INSTRUCTIONS]
You must respond in strict JSON format. Do NOT wrap it in markdown block quotes. Use the following schema:
{
  "response": "Your spoken dialogue here",
  "session_state": { ... updated state ... }
}`;
            }
        }

        // 2. Get OpenAI Text Response
        const isJsonMode = cardConfig.card_type === 'read_with_me' || cardConfig.card_type === 'story_writer' || cardConfig.use_json_mode;
        const modelToUse = cardConfig.llm_model || "gpt-4o-mini";
        const aiResponseRaw = await generateOpenAIChatResponse(systemPrompt, finalMessage, conversation_history, isJsonMode, modelToUse);

        let aiResponseText = aiResponseRaw;
        let newSessionState = null;
        let storyData = null;

        if (isJsonMode) {
            try {
                // Robust parsing for JSON wrapped in markdown or with leading/trailing text
                let cleanedJson = aiResponseRaw.trim();
                
                // Remove markdown code block wrappers if present
                if (cleanedJson.startsWith("```json")) {
                    cleanedJson = cleanedJson.replace(/^```json/, "").replace(/```$/, "");
                } else if (cleanedJson.startsWith("```")) {
                    cleanedJson = cleanedJson.replace(/^```/, "").replace(/```$/, "");
                }
                
                // If it still contains text before or after the JSON { ... }
                const firstBrace = cleanedJson.indexOf("{");
                const lastBrace = cleanedJson.lastIndexOf("}");
                if (firstBrace !== -1 && lastBrace !== -1) {
                    cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
                }

                const parsed = JSON.parse(cleanedJson);
                aiResponseText = parsed.response || "응답을 파싱할 수 없습니다.";
                if (cardConfig.card_type === 'read_with_me') {
                    newSessionState = parsed.next_state;
                } else if (cardConfig.use_json_mode && parsed.session_state) {
                    newSessionState = parsed.session_state;
                } else if (cardConfig.card_type === 'story_writer') {
                    if (parsed.story_ready) {
                        storyData = {
                            story_ready: true,
                            title: parsed.title,
                            final_story: parsed.final_story,
                            image_prompt: parsed.image_prompt
                        };
                    }
                }
            } catch (err) {
                console.error("Failed to parse JSON response:", aiResponseRaw, err);
                // Fallback: search for "response" field if parsing failed
                const responseMatch = aiResponseRaw.match(/"response":\s*"([^"]*)"/);
                if (responseMatch) {
                    aiResponseText = responseMatch[1];
                } else {
                    aiResponseText = "응답 형식 오류가 발생했습니다.";
                }
            }
        }

        return NextResponse.json({
            response: aiResponseText,
            voice: cardConfig.voice_openai || "alloy",
            voice_provider: cardConfig.voice_provider || "openai",
            elevenlabs_voice_id: cardConfig.elevenlabs_voice_id,
            ...(newSessionState && { session_state: newSessionState }),
            ...(storyData && { story_data: storyData })
        });

    } catch (error) {
        console.error("Chat API Route Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
