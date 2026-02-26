'use client';

import React, { useState, useCallback } from 'react';
import ThreeColumnLayout from '@/components/ThreeColumnLayout';
import PromptEditor from '@/components/PromptEditor';
import DebugPanel, { LogEntry } from '@/components/DebugPanel';
import RoleplayInterface, { MessageWithAudio } from '@/components/RoleplayInterface';
import PhotoInterface from '@/components/PhotoInterface';
import FreeTalkInterface from '@/components/FreeTalkInterface';
import LiveAvatarInterface from '@/components/LiveAvatarInterface';
import MobileMockup from '@/components/MobileMockup';
import IntroScreen from '@/components/IntroScreen';
import { chatWithAI, reviewConversation, ReviewFeedback } from './actions';
import WrapupReviewScreen from '@/components/WrapupReviewScreen';
import { PromptConfig } from './actions_prompt';
import { saveLog } from './actions_log';
import { generateSpeech } from './actions_tts';

export default function Home() {
    type Mode = 'roleplay' | 'photo' | 'free' | 'wrapup';
    type ModeState = {
        messages: MessageWithAudio[];
        sessionEnded: boolean;
        lastJson: any;
        showIntro: boolean;
        photoState: { dataUrl: string; description: string } | null;
        reviewData: { feedbacks: ReviewFeedback[]; summary?: any } | null;
        isReviewing: boolean;
        reviewError: string | undefined;
        reviewPanelOpen: boolean;
    };
    const initialModeState = (): ModeState => ({
        messages: [], sessionEnded: false, lastJson: null, showIntro: true,
        photoState: null, reviewData: null, isReviewing: false, reviewError: undefined, reviewPanelOpen: false,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isTtsEnabled, setIsTtsEnabled] = useState(false);
    const [currentMode, setCurrentMode] = useState<Mode>('roleplay');
    const [modeStates, setModeStates] = useState<Record<Mode, ModeState>>({
        roleplay: initialModeState(), photo: initialModeState(), free: initialModeState(), wrapup: initialModeState(),
    });

    // Helpers to read/write current mode's state
    const ms = modeStates[currentMode];
    const updateMs = (patch: Partial<ModeState>) =>
        setModeStates(prev => ({ ...prev, [currentMode]: { ...prev[currentMode], ...patch } }));
    const updateMsFor = (mode: Mode, patch: Partial<ModeState>) =>
        setModeStates(prev => ({ ...prev, [mode]: { ...prev[mode], ...patch } }));

    // Convenience aliases (used in JSX and handlers)
    const messages = ms.messages;
    const sessionEnded = ms.sessionEnded;
    const lastJson = ms.lastJson;
    const showIntro = ms.showIntro;
    const photoState = ms.photoState;
    const reviewData = ms.reviewData;
    const isReviewing = ms.isReviewing;
    const reviewError = ms.reviewError;
    const reviewPanelOpen = ms.reviewPanelOpen;

    // Define default configs for each mode
    const MODE_CONFIGS = {
        roleplay: {
            name: 'Roleplay Default',
            intro: {
                ko: {
                    title: '롤플레잉: 빵집',
                    description: '빵집에서 케이크를 주문해보세요.\n딸기 케이크와 초 100개를 주문하는 것이 미션입니다.\n\n[미션]\n1. 딸기 케이크 주문하기\n2. 초 100개 달라고 하기'
                },
                vn: {
                    title: 'Roleplay: Tiệm Bánh',
                    description: 'Hãy thử đặt một chiếc bánh dâu tây.\nNhiệm vụ là đặt bánh dâu tây và xin 100 cái nến.\n\n[Nhiệm vụ]\n1. Đặt bánh dâu tây\n2. Xin 100 cái nến'
                }
            },
            systemPrompt: `You are a strict but helpful Korean tutor. 
Respond in JSON format with the following fields:
{
  "ko": "Korean response",
  "vn": "Vietnamese translation",
  "emotion": "happy|sad|neutral",
  "correct": "Yes|No",
  "grammatically_correct": "Yes|No",
  "contextually_appropriate": "Yes|No"
}
If correct="No" or grammatically_correct="No", include:
{
  "correct_answer_ko": "Natural and correct Korean expression",
  "correction_explanation": "Easy explanation for a foreigner (not grammatical terms) in Vietnamese"
}
If contextually_appropriate="No", include:
{
  "better_expression_ko": "Better expression suitable for the situation",
  "context_feedback": "Why the user's expression was unnatural in this context (in Vietnamese)"
}

Mission List:
0. {{mission0En}}
1. {{mission1En}}

If the user completes a mission in this turn, include:
{
  "mission_complete_0": "Yes", // if mission 0 is completed
  "mission_complete_1": "Yes"  // if mission 1 is completed
}`,
            variables: [
                { key: 'user', value: 'Student' },
                { key: 'ai', value: 'Bakery Owner' },
                { key: 'maxTurns', value: '10' },
                { key: 'mission0En', value: 'Order strawberry cake' },
                { key: 'mission1En', value: 'Ask for 100 candles' }
            ]
        },
        photo: {
            name: 'Photo Description',
            intro: {
                ko: {
                    title: '사진 묘사',
                    description: '제시된 사진을 보고 아래 제시어를 활용해 문장을 만들어보세요.\n튜터가 문장을 다듬어주고 더 좋은 표현을 알려줍니다.'
                },
                vn: {
                    title: 'Mô tả hình ảnh',
                    description: 'Hãy đặt câu sử dụng từ gợi ý đưới đây dựa trên bức ảnh.\nGia sư sẽ sửa lỗi và gợi ý cách diễn đạt tốt hơn.'
                }
            },
            photoUrl: '/school.png',
            keyword: '교실',
            systemPrompt: `You are a friendly Korean tutor helping a student describe a photo.
The photo shows: "A bright, modern Korean elementary school classroom. Students are sitting at desks using tablets. A female teacher is writing on a large digital blackboard at the front. The atmosphere is active and happy."

Your task:
1. The user will be asked to make a sentence using the keyword "교실" (Classroom).
2. Wait for the user's sentence.
3. specific rules for feedback:
   - If the user's sentence uses "교실" correctly, praise them and suggest a slightly more advanced or natural native expression.
   - If the user's sentence is incorrect, explain the mistake gently (in Vietnamese context if needed) and provide the corrected sentence.
   - Always respond in the JSON format defined below.

Respond in JSON format with:
{
  "ko": "Korean response (Feedback + Next Question)",
  "vn": "Vietnamese translation",
  "emotion": "happy|sad|neutral",
  "correct": "Yes|No",
  "grammatically_correct": "Yes|No",
  "contextually_appropriate": "Yes|No",
  "recommended_words": ["학생", "선생님", "공부하다", "칠판"] // Related words
}
If the user makes a mistake, provide correction fields:
{
  "correct_answer_ko": "Corrected sentence",
  "correction_explanation": "Explanation of the error"
}
If contextually_appropriate="No" or you want to suggest a better phrase:
{
  "better_expression_ko": "More natural/native expression",
  "context_feedback": "Why this is better"
}`,
            variables: [
                { key: 'user', value: 'Student' },
                { key: 'ai', value: 'Tutor' },
                { key: 'topic', value: 'Classroom' },
                { key: 'maxTurns', value: '10' }
            ]
        },
        free: {
            name: 'Free Talk',
            intro: {
                ko: {
                    title: '자유 대화',
                    description: '튜터와 일상적인 주제로 자유롭게 대화하세요.\n자연스러운 표현을 연습해보세요.'
                },
                vn: {
                    title: 'Trò chuyện tự do',
                    description: 'Trò chuyện tự do với gia sư về các chủ đề hàng ngày.\nLuyện tập các biểu đạt tự nhiên.'
                }
            },
            systemPrompt: `You are a casual Korean tutor having a free conversation with a student.
Respond in JSON format with standard fields (ko, vn, emotion, correct, etc.).
No specific missions. Just keep the conversation flowing naturally.
Correct any mistakes gently.`,
            variables: [
                { key: 'user', value: 'Student' },
                { key: 'ai', value: 'Tutor' },
                { key: 'topic', value: 'Daily Life' },
                { key: 'maxTurns', value: '15' }
            ]
        },
        wrapup: {
            name: 'Expression',
            intro: {
                ko: {
                    title: '본학습: 인사 및 자기 소개',
                    description: '학교 수업 첫 시간에 만난 학생과 인사하고 자기 소개를 해보세요.\n\n[미션]\n1. 본인의 이름 말하기\n2. 본인의 국적 말하기\n3. 본인의 직업 말하기'
                },
                vn: {
                    title: 'Bài học chính: Chào hỏi và giới thiệu bản thân',
                    description: 'Hãy chào hỏi và giới thiệu bản thân với bạn học mới gặp trong giờ học đầu tiên.\n\n[Nhiệm vụ]\n1. Nói tên của bạn\n2. Nói quốc tịch của bạn\n3. Nói nghề nghiệp của bạn'
                }
            },
            systemPrompt: `역할: {{ai}} | 사용자: {{user}} | 상황: {{situation}} | 제한: {{maxTurns}}턴

역할 유지: {{ai}}의 입장과 말투만 사용.
{{ai}}의 멘트는 한글 20자 이내로 제한

---

미션 유도

미션0: {{mission0En}} | 미션1: {{mission1En}} | 미션2: {{mission2En}}

진행: mission_complete_0="No"→미션0 유도 / 0="Yes"+1="No"→미션1 유도 / 0="Yes"+1="Yes"+2="No"→미션2 유도 / 셋 다 "Yes"→마무리
방식: {{ai}} 역할로 상황 조성. 직접 지시 금지. 한 번 "Yes"는 계속 "Yes".

★ 핵심 규칙:
1. 한 턴에 반드시 현재 미션에 해당하는 주제만 유도한다.
2. 현재 미션이 완료되면 다음 미션 주제로 자연스럽게 넘어간다.
3. 미션과 관련 없는 질문(학습 방법, 취미, 한국어 실력 등)은 절대 하지 않는다.
4. 사용자가 미션과 무관한 말을 하면, 자연스럽게 현재 미션 주제로 되돌린다.

대화 흐름 예시:
- 미션0(이름): "안녕하세요! 이름이 뭐예요?" → 사용자 답변 → 미션0 완료
- 미션1(국적): "어느 나라에서 왔어요?" → 사용자 답변 → 미션1 완료
- 미션2(직업): "직업이 뭐예요?" / "뭐 공부해요?" → 사용자 답변 → 미션2 완료
- 마무리: "만나서 반가워요!" 등 짧은 인사로 종료

---

JSON

{
  "ko": "한국어 응답 (20자 이내)",
  "vn": "ko 필드의 베트남어 번역 (항상 채울 것)",
  "mission_complete_0": "Yes|No",
  "mission_complete_1": "Yes|No",
  "mission_complete_2": "Yes|No"
}`,
            variables: [
                { key: 'user', value: '외국인 대학생(한국어 공부 중)' },
                { key: 'ai', value: '한국인 대학생' },
                { key: 'situation', value: '학교 수업 첫 시간에 만난 학생들 간의 인사 및 자기 소개' },
                { key: 'maxTurns', value: '5' },
                { key: 'mission0En', value: '{user} 본인의 이름을 말합니다.' },
                { key: 'mission1En', value: '{user} 본인의 국적을 말합니다.' },
                { key: 'mission2En', value: '{user} 본인의 직업을 말합니다.' },
                { key: 'disable_tools', value: 'true' }
            ]
        }
    };

    const [savedModeConfigs, setSavedModeConfigs] = useState<Record<string, PromptConfig>>(() => {
        const initial: Record<string, PromptConfig> = {};
        (Object.keys(MODE_CONFIGS) as Array<keyof typeof MODE_CONFIGS>).forEach(key => {
            initial[key] = {
                ...MODE_CONFIGS[key],
                temperature: 0.7,
                timestamp: new Date().toISOString()
            };
        });
        return initial;
    });

    const [config, setConfig] = useState<PromptConfig>(savedModeConfigs['roleplay']);

    const MISSIONS = config.variables
        .filter(v => v.key.startsWith('mission') && v.key.endsWith('En'))
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(v => v.value);

    const addLog = (message: string, type: 'info' | 'error' | 'success') => {
        const entry: LogEntry = { timestamp: new Date().toISOString(), message, type };
        setLogs(prev => [entry, ...prev]);
        return entry;
    };

    const handleConfigChange = useCallback((newConfig: PromptConfig) => {
        setConfig(newConfig);
        setSavedModeConfigs(prev => ({
            ...prev,
            [currentMode]: newConfig
        }));
    }, [currentMode]);

    const handleSendMessage = async (text: string, isHidden = false) => {
        const newMessage: MessageWithAudio = { role: 'user', content: text, hidden: isHidden };
        const newMessages = [...messages, newMessage];
        updateMs({ messages: newMessages });
        setIsLoading(true);
        addLog(`User sent: "${text}"`, 'info');
        const activeMode = currentMode; // capture for async closure

        try {
            // Prepare messages for API (strip extra fields)
            const apiMessages = newMessages.map(m => ({
                role: m.role,
                content: m.content
            }));

            const result = await chatWithAI(apiMessages, config);

            if (result.success && result.message) {
                let audioUrl: string | undefined = undefined;

                // Generate Audio (TTS)
                // Generate for all modes including 'wrapup' (LiveAvatar) using ElevenLabs
                if (isTtsEnabled && result.parsed) {
                    const textToSpeak = result.parsed.ko || result.parsed.message || result.parsed.answer || result.parsed.content;
                    if (textToSpeak) {
                        addLog('Generating Audio...', 'info');
                        // Use PCM for LiveAvatar (wrapup) to fix noise issue; MP3 for others
                        const audioFormat = currentMode === 'wrapup' ? 'pcm_24000' : 'mp3_44100_128';
                        const ttsProvider = config.ttsProvider || 'elevenlabs';
                        console.log(`Debug: Calling generateSpeech with provider ${ttsProvider} and format ${audioFormat}...`);
                        const ttsResult = await generateSpeech(textToSpeak, audioFormat, ttsProvider);
                        console.log("Debug: generateSpeech result:", ttsResult.success, ttsResult.error);

                        if (ttsResult.success && ttsResult.audioData) {
                            audioUrl = ttsResult.audioData;
                            addLog('Audio Generated successfully', 'success');
                        } else {
                            addLog(`Audio Generation Failed: ${ttsResult.error}`, 'error');
                        }
                    }
                }

                const aiMessage: MessageWithAudio = {
                    role: 'assistant',
                    content: result.message.content || '',
                    parsed: result.parsed,
                    audioUrl: audioUrl
                };
                updateMsFor(activeMode, {
                    messages: [...newMessages, aiMessage],
                    lastJson: result.parsed,
                    ...(result.sessionEnded ? { sessionEnded: true } : {})
                });
                addLog('AI response received', 'success');

                if (result.sessionEnded) {
                    addLog('Session ended: max turns reached', 'info');
                }

                // Persist log
                await saveLog({
                    timestamp: new Date().toISOString(),
                    promptConfig: config,
                    messages: [...newMessages, aiMessage],
                    lastResponse: result
                });

            } else {
                addLog(`Error: ${result.error}`, 'error');
            }

        } catch (e: any) {
            addLog(`Error: ${e.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Variant that accepts a config override (used when state update hasn't flushed yet)
    const handleSendMessageWithConfig = async (text: string, isHidden: boolean, overrideConfig: typeof config) => {
        const newMessage: MessageWithAudio = { role: 'user', content: text, hidden: isHidden };
        const newMessages = [newMessage];
        updateMs({ messages: newMessages });
        setIsLoading(true);
        addLog(`User sent: "${text}"`, 'info');
        const activeMode = currentMode;
        try {
            const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
            const result = await chatWithAI(apiMessages, overrideConfig);
            if (result.success && result.message) {
                let audioUrl: string | undefined;
                if (isTtsEnabled && result.parsed) {
                    const textToSpeak = result.parsed.ko || result.parsed.message || result.parsed.content;
                    if (textToSpeak) {
                        const audioFormat = currentMode === 'wrapup' ? 'pcm_24000' : 'mp3_44100_128';
                        const ttsProvider = overrideConfig.ttsProvider || 'elevenlabs';
                        const ttsResult = await generateSpeech(textToSpeak, audioFormat, ttsProvider);
                        if (ttsResult.success && ttsResult.audioData) audioUrl = ttsResult.audioData;
                    }
                }
                const aiMessage: MessageWithAudio = { role: 'assistant', content: result.message.content || '', parsed: result.parsed, audioUrl };
                updateMsFor(activeMode, {
                    messages: [...newMessages, aiMessage],
                    lastJson: result.parsed,
                    ...(result.sessionEnded ? { sessionEnded: true } : {})
                });
                addLog('AI response received', 'success');
                if (result.sessionEnded) { addLog('Session ended', 'info'); }
                await saveLog({ timestamp: new Date().toISOString(), promptConfig: overrideConfig, messages: [...newMessages, aiMessage], lastResponse: result });
            } else {
                addLog(`Error: ${result.error}`, 'error');
            }
        } catch (e: any) {
            addLog(`Error: ${e.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        if (confirm('Reset conversation?')) {
            updateMs(initialModeState());
            addLog('Conversation Reset', 'info');
        }
    };

    const handleModeChange = (mode: Mode) => {
        if (messages.length > 0 && !confirm('Switching modes will reset the current conversation. Continue?')) {
            return;
        }
        setCurrentMode(mode);
        const newConfig = savedModeConfigs[mode];
        setConfig(newConfig);
        if (mode === 'wrapup') setIsTtsEnabled(true);
        addLog(`Switched to ${mode} mode`, 'info');
    };

    const modeSelector = (
        <select
            value={currentMode}
            onChange={(e) => handleModeChange(e.target.value as any)}
            className="text-xs border text-gray-600 border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            title="Select Mode"
        >
            <option value="roleplay">(AI대화)Roleplay</option>
            <option value="photo">(AI대화)Photo</option>
            <option value="free">(AI대화)Free Talk</option>
            <option value="wrapup">(본학습)WrapUp</option>
        </select>
    );

    return (
        <ThreeColumnLayout
            leftPanelHeaderAction={modeSelector}
            leftPanel={
                <PromptEditor
                    key={currentMode}
                    onConfigChange={handleConfigChange}
                    initialConfig={config}
                    mode={currentMode}
                />
            }
            centerPanel={
                < DebugPanel lastJson={lastJson} logs={logs} />
            }
            rightPanel={
                <MobileMockup>
                    {
                        showIntro ? (
                            <IntroScreen
                                mode={currentMode}
                                introData={(MODE_CONFIGS[currentMode] as any).intro}
                                isTtsEnabled={isTtsEnabled}
                                onToggleTts={() => setIsTtsEnabled(!isTtsEnabled)}
                                onReset={handleReset}
                                imageSrc={(MODE_CONFIGS[currentMode] as any).photoUrl}
                                keyword={config.variables.find(v => v.key === 'keyword')?.value ?? (MODE_CONFIGS[currentMode] as any).keyword}
                                onStart={(photoDataUrl?: string, photoDescription?: string) => {
                                    // Clear this mode's messages/state on session start
                                    updateMs({ messages: [], sessionEnded: false, lastJson: null });

                                    // photo mode: apply dynamic photo to config
                                    if (currentMode === 'photo' && photoDataUrl && photoDescription) {
                                        updateMs({ photoState: { dataUrl: photoDataUrl, description: photoDescription } });
                                        const patchedPrompt = config.systemPrompt.replace(
                                            /{{photoDescription}}/g,
                                            photoDescription
                                        );
                                        const updatedConfig = { ...config, systemPrompt: patchedPrompt };
                                        setConfig(updatedConfig);
                                        setSavedModeConfigs(prev => ({ ...prev, photo: updatedConfig }));
                                        updateMs({ showIntro: false });
                                        handleSendMessageWithConfig("(System: The user has started the session. Please greet them first based on the scenario.)", true, updatedConfig);
                                        return;
                                    }
                                    updateMs({ showIntro: false });
                                    handleSendMessage("(System: The user has started the session. Please greet them first based on the scenario.)", true);
                                }}
                            />
                        ) : (
                            currentMode === 'wrapup' ? (
                                sessionEnded ? (
                                    <div className="relative flex flex-col h-full">
                                        {/* Chat stays visible behind overlay */}
                                        <RoleplayInterface
                                            messages={messages}
                                            onSendMessage={handleSendMessage}
                                            isLoading={isLoading}
                                            missions={[]}
                                            isTtsEnabled={isTtsEnabled}
                                            onToggleTts={() => setIsTtsEnabled(!isTtsEnabled)}
                                            onReset={handleReset}
                                            sessionEnded={sessionEnded}
                                            title="대화 내용"
                                        />
                                        {/* Review overlay panel */}
                                        <WrapupReviewScreen
                                            feedbacks={reviewData?.feedbacks || []}
                                            summary={reviewData?.summary}
                                            isLoading={isReviewing}
                                            onReset={handleReset}
                                            error={reviewError}
                                            isOpen={reviewPanelOpen}
                                            onToggle={() => updateMsFor('wrapup', { reviewPanelOpen: !reviewPanelOpen })}
                                        />
                                    </div>
                                ) : (
                                    <LiveAvatarInterface
                                        messages={messages}
                                        onSendMessage={handleSendMessage}
                                        isLoading={isLoading}
                                        sessionEnded={sessionEnded}
                                        onSessionEnd={async () => {
                                            updateMs({ sessionEnded: true, isReviewing: true, reviewPanelOpen: true });
                                            addLog('Session ended: starting review...', 'info');
                                            try {
                                                const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
                                                const result = await reviewConversation(apiMessages, config.reviewPrompt);
                                                if (result.success && result.feedbacks) {
                                                    updateMsFor('wrapup', { reviewData: { feedbacks: result.feedbacks, summary: result.summary }, isReviewing: false });
                                                    addLog(`Review complete: ${result.feedbacks.length} turns evaluated`, 'success');
                                                } else {
                                                    updateMsFor('wrapup', { reviewError: result.error || 'Review failed', isReviewing: false });
                                                    addLog(`Review error: ${result.error}`, 'error');
                                                }
                                            } catch (e: any) {
                                                updateMsFor('wrapup', { reviewError: e.message, isReviewing: false });
                                                addLog(`Review error: ${e.message}`, 'error');
                                            }
                                        }}
                                    />
                                )
                            ) : currentMode === 'photo' ? (
                                <PhotoInterface
                                    messages={messages}
                                    onSendMessage={handleSendMessage}
                                    isLoading={isLoading}
                                    isTtsEnabled={isTtsEnabled}
                                    onToggleTts={() => setIsTtsEnabled(!isTtsEnabled)}
                                    onReset={handleReset}
                                    sessionEnded={sessionEnded}
                                    photoUrl={photoState?.dataUrl ?? (MODE_CONFIGS['photo'] as any).photoUrl}
                                    keyword={config.variables.find(v => v.key === 'keyword')?.value ?? (MODE_CONFIGS['photo'] as any).keyword}
                                />
                            ) : currentMode === 'free' ? (
                                <FreeTalkInterface
                                    messages={messages}
                                    onSendMessage={handleSendMessage}
                                    isLoading={isLoading}
                                    isTtsEnabled={isTtsEnabled}
                                    onToggleTts={() => setIsTtsEnabled(!isTtsEnabled)}
                                    onReset={handleReset}
                                    sessionEnded={sessionEnded}
                                />
                            ) : (
                                <RoleplayInterface
                                    messages={messages}
                                    onSendMessage={handleSendMessage}
                                    isLoading={isLoading}
                                    missions={MISSIONS}
                                    isTtsEnabled={isTtsEnabled}
                                    onToggleTts={() => setIsTtsEnabled(!isTtsEnabled)}
                                    onReset={handleReset}
                                    sessionEnded={sessionEnded}
                                />
                            )
                        )
                    }
                </MobileMockup >
            }
        />
    );
}
