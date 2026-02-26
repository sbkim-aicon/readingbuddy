'use server'

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

// Note: Ensure OPENAI_API_KEY is set in .env.local
const apiKey = process.env.OPENAI_API_KEY;
console.log("Debug: API Key present?", !!apiKey, "Length:", apiKey ? apiKey.length : 0);

const openai = new OpenAI({
    apiKey: apiKey,
});

async function lookupDictionary(word: string) {
    try {
        const data = await fs.readFile(path.join(process.cwd(), 'mock_dict.json'), 'utf-8');
        const dict = JSON.parse(data);
        return dict.find((item: any) => item.word === word) || "not_found";
    } catch (e) {
        console.error("Dict Load Error", e);
        return "error_loading_dict";
    }
}

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "get_dictionary_entry",
            description: "Get the meaning and example of a word from the dictionary.",
            parameters: {
                type: "object",
                properties: {
                    word: {
                        type: "string",
                        description: "The word to look up",
                    },
                },
                required: ["word"],
            },
        },
    },
];

export async function chatWithAI(
    messages: any[],
    config: { systemPrompt: string, feedbackPrompt?: string, temperature: number, variables: { key: string, value: string }[] }
) {
    // 1. Substitute variables in system prompt
    let systemContent = config.systemPrompt;
    config.variables.forEach(v => {
        // Replace all occurrences
        systemContent = systemContent.split(`{{${v.key}}}`).join(v.value);
    });

    // Safeguard: OpenAI requires the word "JSON" in the prompt when using response_format: { type: "json_object" }
    if (!systemContent.toLowerCase().includes('json')) {
        systemContent += "\n\nIMPORTANT: You must respond in valid JSON format.";
    }

    const fullMessages = [
        { role: 'system', content: systemContent },
        ...messages
    ];

    // Max Turns Logic
    const maxTurnsVar = config.variables.find(v => v.key === 'max_turns' || v.key === 'maxTurns');
    let sessionEnded = false;
    if (maxTurnsVar && maxTurnsVar.value) {
        const maxTurns = parseInt(maxTurnsVar.value, 10);
        const currentTurn = messages.filter(m => m.role === 'user').length;

        if (!isNaN(maxTurns)) {
            let turnInstruction = `\n[System Note] Current turn: ${currentTurn}/${maxTurns}.`;

            if (currentTurn >= maxTurns) {
                turnInstruction += " You have reached the conversation limit. You MUST naturally end the conversation now. Say a polite goodbye and do not ask further questions. Include [end] in your ko response.";
                sessionEnded = true;
            } else if (currentTurn === maxTurns - 1) {
                turnInstruction += " This is the last turn. Please prepare to wrap up the conversation.";
            }

            fullMessages.push({ role: 'system', content: turnInstruction });
        }
    }

    // Mission state tracking - inform AI of already completed missions to prevent double-completion
    const completedMissions: string[] = [];
    messages.forEach(m => {
        if (m.role === 'assistant') {
            try {
                const p = JSON.parse(m.content);
                if (p.mission_complete_0 === 'Yes' && !completedMissions.includes('0')) completedMissions.push('0');
                if (p.mission_complete_1 === 'Yes' && !completedMissions.includes('1')) completedMissions.push('1');
                if (p.mission_complete_2 === 'Yes' && !completedMissions.includes('2')) completedMissions.push('2');
            } catch { }
        }
    });
    if (completedMissions.length > 0) {
        fullMessages.push({
            role: 'system',
            content: `[Mission Status] Already completed missions: ${completedMissions.map(i => `mission_complete_${i}`).join(', ')}. Keep these as "Yes". Only mark a NEW mission as "Yes" if the user has EXPLICITLY completed it in THIS turn. Do NOT mark multiple missions as complete simultaneously unless user completed them all.`
        });
    }

    // Conversation continuation instruction
    if (!sessionEnded) {
        fullMessages.push({
            role: 'system',
            content: `[Conversation Rule] Your "ko" response MUST end with a question or suggestion to naturally continue the conversation within your role. Keep the dialogue flowing.`
        });
    }

    // Role Clarification for Feedback
    const aiRole = config.variables.find(v => v.key === 'ai')?.value || 'AI';
    const userRole = config.variables.find(v => v.key === 'user')?.value || 'User';

    // Use dynamic feedback prompt if provided, otherwise fallback to default
    const feedbackInstruction = config.feedbackPrompt || `[Role Clarification for Feedback]
1. You are acting as ${aiRole}.
2. The user is acting as ${userRole}.
3. When evaluating 'correct' or 'contextually_appropriate', JUDGE FROM THE PERSPECTIVE OF ${userRole}.
4. Do NOT correct the user for speaking as ${userRole}. For example, if ${userRole} should ask for something, do not correct them to offer it (which is ${aiRole}'s job).
5. If the user's sentence assumes the correct role (${userRole}) but has grammar errors, fix only the grammar. Do NOT change the intent/role.`;

    fullMessages.push({
        role: 'system',
        content: feedbackInstruction
    });

    try {
        let currentMessage = null;
        let turnCount = 0;
        const MAX_TOOL_TURNS = 5;

        while (turnCount < MAX_TOOL_TURNS) {
            turnCount++;
            console.log(`Debug: Turn ${turnCount} - Calling OpenAI...`);

            // Check for disable_tools variable
            const disableTools = config.variables.some(v => v.key === 'disable_tools' && v.value === 'true');

            // ... inside loop ...
            const runner = await openai.chat.completions.create({
                model: "gpt-4.1-nano",
                messages: fullMessages,
                temperature: config.temperature,
                response_format: { type: "json_object" },
                max_completion_tokens: 1000,
                tools: disableTools ? undefined : TOOLS,
                tool_choice: disableTools ? undefined : "auto",
            });

            currentMessage = runner.choices[0].message;
            console.log("Debug: Response received", JSON.stringify(currentMessage, null, 2));

            if (currentMessage.tool_calls && currentMessage.tool_calls.length > 0) {
                fullMessages.push(currentMessage); // Add assistant message with tool_calls

                for (const toolCall of currentMessage.tool_calls) {
                    if (toolCall.type === 'function' && toolCall.function.name === 'get_dictionary_entry') {
                        console.log(`Debug: Executing tool ${toolCall.function.name}`);
                        const args = JSON.parse(toolCall.function.arguments);
                        const result = await lookupDictionary(args.word);
                        fullMessages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: JSON.stringify(result),
                        });
                    }
                }
            } else if (currentMessage.content) {
                break;
            } else {
                console.error("Debug: No content and no tool calls. Message:", currentMessage);
                throw new Error(`No content received from AI. Details: ${JSON.stringify(currentMessage)}`);
            }
        }

        if (!currentMessage || !currentMessage.content) {
            throw new Error("Failed to get content after tool loop.");
        }

        const content = currentMessage.content;
        if (!content) throw new Error("No content received");

        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (e) {
            parsed = null;
        }

        if (parsed && parsed.session_complete === 'Yes') {
            sessionEnded = true;
        }

        return {
            success: true,
            message: { role: 'assistant', content },
            parsed,
            sessionEnded
        };

    } catch (error: any) {
        console.error("OpenAI Error:", error);
        return { success: false, error: error.message };
    }
}

export interface ReviewFeedback {
    turn_index: number;
    user_said: string;
    ai_asked: string;
    grammatically_correct: 'Yes' | 'No';
    contextually_appropriate: 'Yes' | 'No';
    correct: 'Yes' | 'No';
    correct_answer_ko: string;
    correction_explanation: string;
    correction_explanation_vn: string;
}

export interface ReviewResult {
    success: boolean;
    feedbacks?: ReviewFeedback[];
    summary?: {
        total: number;
        correct_count: number;
        message_ko: string;
        message_vn: string;
    };
    error?: string;
}

export async function reviewConversation(
    messages: { role: string; content: string }[],
    customReviewPrompt?: string
): Promise<ReviewResult> {
    try {
        const filteredMessages = messages
            .filter(m => m.role !== 'system' && !m.content.startsWith('(System:'));

        const transcriptLines: string[] = [];
        let userUtteranceCount = 0;

        for (const m of filteredMessages) {
            if (m.role === 'assistant') {
                let content = m.content;
                try {
                    const p = JSON.parse(m.content);
                    content = p.ko || m.content;
                } catch { }
                transcriptLines.push(`AI: ${content}`);
            } else if (m.role === 'user') {
                userUtteranceCount++;
                transcriptLines.push(`User[${userUtteranceCount}]: ${m.content}`);
            }
        }

        const transcript = transcriptLines.join('\n');
        console.log("[Review] Transcript:", transcript);
        console.log("[Review] User utterance count:", userUtteranceCount);

        if (userUtteranceCount === 0) {
            return {
                success: true,
                feedbacks: [],
                summary: { total: 0, correct_count: 0, message_ko: "평가할 User 발화가 없습니다.", message_vn: "Không có phát ngôn của người dùng để đánh giá." }
            };
        }

        // Use custom review prompt if provided, otherwise fallback to default and append dynamic variables
        let finalReviewPrompt = customReviewPrompt || `아래는 한국어 학습자(User)와 AI의 대화입니다.

평가 대상: User가 발화한 문장만 평가합니다. AI의 발화는 평가 대상이 아닙니다.
평가 관점: AI가 직전에 한 질문/발화의 맥락과 의도를 기준으로, User의 답변이 적절한지 평가합니다.

평가 기준:

1. 맥락 적절성 (contextually_appropriate)
   - AI의 직전 질문의 의도를 정확히 파악한다
   - User의 답변이 그 질문의 의도에 맞는 대답인가?
   - 중요: 질문의 구체적 의도를 엄격하게 판단한다
   - 예시:
     * AI "이름이 뭐예요?" → User "저는 베트남 사람이에요" → contextually_appropriate="No" (이름을 물었는데 국적을 답함)
     * AI "이름이 뭐예요?" → User "저는 민수예요" → contextually_appropriate="Yes"
     * AI "어느 나라에서 왔어요?" → User "저는 베트남에서 왔어요" → contextually_appropriate="Yes"
     * AI "직업이 뭐예요?" → User "저는 학생이에요" → contextually_appropriate="Yes"

2. 문법 정확성 (grammatically_correct)
   User 문장의 모든 어절 체크:
   a) 조사 정확성 b) 받침 규칙 c) 동사 활용 d) 맞춤법 e) 단어 의미 적합성
   - 존재하지 않는 단어, 철자 오류, 발음 유사 혼동 등 체크

3. 베트남어 체크: 포함 시 correct="No"

4. 최종: correct = grammatically_correct AND contextually_appropriate 둘 다 "Yes"일 때만 "Yes"

5. 피드백 (correct="No"일 때): correct_answer_ko에 교정 문장, correction_explanation에 설명`;

        // Always append formatting and dynamic count requirements
        finalReviewPrompt += `\n\n★★★ 중요: 대화에서 User 발화가 총 ${userUtteranceCount}개 있습니다. 반드시 ${userUtteranceCount}개 모두를 하나씩 평가하여 feedbacks 배열에 ${userUtteranceCount}개의 항목을 반환해야 합니다. 하나라도 빠뜨리면 안 됩니다. ★★★
        
대화 내용 (User[번호]로 표시된 것이 평가 대상 발화입니다):
${transcript}

---

JSON 응답: feedbacks 배열에 반드시 ${userUtteranceCount}개를 넣으세요. summary.total도 ${userUtteranceCount}이어야 합니다.
{
  "feedbacks": [
    {"turn_index": 0, "user_said": "<실제 발화>", "ai_asked": "<AI 직전 질문>", "grammatically_correct": "Yes/No", "contextually_appropriate": "Yes/No", "correct": "Yes/No", "correct_answer_ko": "", "correction_explanation": "", "correction_explanation_vn": ""}
  ],
  "summary": {"total": ${userUtteranceCount}, "correct_count": 0, "message_ko": "", "message_vn": ""}
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
                { role: 'system', content: finalReviewPrompt }
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
            max_completion_tokens: 4000,
        });

        const content = response.choices[0].message?.content;
        console.log("[Review] AI Response:", content);
        if (!content) throw new Error("No review content received");

        const parsed = JSON.parse(content);
        return {
            success: true,
            feedbacks: parsed.feedbacks || [],
            summary: parsed.summary
        };

    } catch (error: any) {
        console.error("Review Error:", error);
        return { success: false, error: error.message };
    }
}
