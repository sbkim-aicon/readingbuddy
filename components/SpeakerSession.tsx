"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, X, Mic, MicOff, Loader2 } from "lucide-react";
import { CardConfig, BookData, ReadingSessionState, ReadingPhasePrompts, ReadingSessionPhase } from "@/lib/types";
import SpeakerCharacter, { SpeakerState } from "./SpeakerCharacter";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { useSoundManager } from "@/hooks/useSoundManager";

export default function SpeakerSession({
    cardConfig,
    readingPhasePrompts,
}: {
    cardConfig: CardConfig;
    readingPhasePrompts?: ReadingPhasePrompts | null;
}) {
    const router = useRouter();
    const [state, setState] = useState<SpeakerState>("idle");
    const [inputText, setInputText] = useState("");
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [isStarted, setIsStarted] = useState(false); // true after user taps start

    // Reading session specific state
    const [bookData, setBookData] = useState<BookData | null>(null);
    const [sessionState, setSessionState] = useState<ReadingSessionState | null>(null);

    // Sound manager — BGM + synthesized SFX
    const { playSFX, startBGM, stopBGM } = useSoundManager(cardConfig.sounds);

    // Fetch Book Data if it's a read_with_me card
    useEffect(() => {
        if (cardConfig.card_type === 'read_with_me' && cardConfig.book_data_path) {
            fetch(`/${cardConfig.book_data_path}`)
                .then(res => res.json())
                .then((data: BookData) => {
                    setBookData(data);
                    setSessionState({
                        phase: "PRE",
                        currentPageIndex: 0,
                        totalPages: data.book_metadata.total_pages
                    });
                })
                .catch(err => console.error("Failed to load book data", err));
        }
    }, [cardConfig]);

    // WebRTC Realtime Voice Hook
    const {
        connect,
        disconnect,
        sendMessage,
        sendTextMessage,
        updateContext,
        isConnecting,
        isConnected,
        isThinking: isVoiceThinking,
        micError
    } = useRealtimeVoice({
        cardId: cardConfig.card_id,
        systemPrompt: cardConfig.system_prompt || "You are a friendly reading companion.",
        voice: cardConfig.voice_openai || "alloy",
        temperature: cardConfig.temperature || 0.8,
        onAudioStarted: () => setState("speaking"),
        onAudioEnded: () => setState("listening"),
        onUserSpeaking: (isSpeaking) => { if (isSpeaking) setState("listening"); },
        onFunctionCall: (name, args, respond) => {
            if (name === 'play_sound') {
                playSFX(args.name as string);
                respond(JSON.stringify({ success: true }));
                return;
            }
            if (name !== 'advance_session') return;
            const newPhase = args.phase as ReadingSessionPhase;
            const newPageIndex = typeof args.currentPageIndex === 'number' ? args.currentPageIndex : undefined;
            setSessionState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    phase: newPhase,
                    ...(newPageIndex !== undefined ? { currentPageIndex: newPageIndex } : {}),
                };
            });
            // Small delay lets the session.update (triggered by sessionState change above)
            // reach the server before response.create fires the next AI turn.
            setTimeout(() => respond(JSON.stringify({ success: true, phase: newPhase })), 150);
        },
        onError: (err) => {
            console.error(err);
            setState("error");
            setIsStarted(false); // Return to start screen on error
            setTimeout(() => setState("idle"), 2000);
        }
    });

    // Register function tools once the data channel is open.
    // advance_session — read_with_me cards only
    // play_sound      — any card with a sounds config
    useEffect(() => {
        if (!isConnected) return;
        const tools: object[] = [];

        if (cardConfig.card_type === 'read_with_me') {
            tools.push({
                type: 'function',
                name: 'advance_session',
                description: '독서 세션의 다음 단계 또는 페이지로 전환합니다. 단계 전환이 필요할 때 반드시 이 함수를 호출하세요.',
                parameters: {
                    type: 'object',
                    properties: {
                        phase: {
                            type: 'string',
                            enum: ['DURING_DIALOGIC', 'POST', 'END'],
                            description: '전환할 단계',
                        },
                        currentPageIndex: {
                            type: 'integer',
                            description: '이동할 페이지 인덱스 (0-based). DURING_DIALOGIC 단계에서만 사용.',
                        },
                    },
                    required: ['phase'],
                },
            });
        }

        if (cardConfig.sounds) {
            tools.push({
                type: 'function',
                name: 'play_sound',
                description: '효과음을 재생합니다. 게임 이벤트에 맞는 사운드를 선택하세요.',
                parameters: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            enum: ['correct', 'wrong', 'hint', 'game_start', 'level_up', 'splash', 'goal'],
                            description: '재생할 효과음: correct(정답), wrong(오답), hint(힌트), game_start(게임시작), level_up(레벨업), splash(물소리), goal(골)',
                        },
                    },
                    required: ['name'],
                },
            });
        }

        if (tools.length === 0) return;
        sendMessage('session.update', { session: { tools, tool_choice: 'auto' } });
    }, [isConnected, cardConfig.card_type, cardConfig.sounds, sendMessage]);

    // BGM: start when connected, fade out when disconnected
    useEffect(() => {
        if (isConnected) startBGM();
        else stopBGM();
    }, [isConnected, startBGM, stopBGM]);

    // Sync character animation with voice state.
    // NOTE: 'state' is intentionally NOT in deps to avoid infinite loops —
    // we use functional setState to guard against stale reads.
    useEffect(() => {
        if (isVoiceThinking) {
            setState("thinking");
        } else if (isConnected) {
            setState(prev => (prev === "speaking" || prev === "thinking") ? prev : "listening");
        } else {
            setState(prev => (prev === "speaking" || prev === "error") ? prev : "idle");
        }
    }, [isVoiceThinking, isConnected]);


    const handleEndSession = () => {
        if (confirm("대화를 종료하시겠습니까?")) {
            disconnect();
            router.push("/");
        }
    };

    // Entry point — user taps the start button (user gesture required for mic + audio unlock)
    const handleStart = () => {
        initTTSAudio();
        setIsStarted(true);
        connect();
    };

    const handleMicToggle = () => {
        if (isConnected) {
            disconnect();
            setIsStarted(false);
        } else {
            initTTSAudio();
            setIsStarted(true);
            connect();
        }
    };


    // TEXT FALLBACK API — uses <audio> element for cross-browser compatibility
    const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            ttsAudioRef.current?.pause();
            ttsAudioRef.current?.remove();
            ttsAudioRef.current = null;
            disconnect();
        };
    }, [disconnect]);

    // Must be called during a user gesture to unlock audio playback policy
    const initTTSAudio = useCallback(() => {
        if (!ttsAudioRef.current) {
            const el = document.createElement('audio');
            el.style.display = 'none';
            document.body.appendChild(el);
            ttsAudioRef.current = el;
        }
    }, []);

    const playAudioString = async (base64Audio: string) => {
        const audio = ttsAudioRef.current;
        if (!audio) {
            // Not yet unlocked (e.g. auto-greeting before any user gesture) — skip silently
            setState("idle");
            return;
        }
        try {
            audio.src = base64Audio;
            setState("speaking");
            audio.onended = () => setState(isConnected ? "listening" : "idle");
            audio.onerror = () => {
                console.error("TTS audio element error");
                setState("error");
                setTimeout(() => setState(isConnected ? "listening" : "idle"), 2000);
            };
            await audio.play();
        } catch (e) {
            console.error("Audio playback failed", e);
            setState("idle");
        }
    };

    const handleSubmit = async (e?: React.FormEvent, customMessage?: string) => {
        if (e) e.preventDefault();

        const messageToSend = customMessage !== undefined ? customMessage : inputText;
        if (!messageToSend && !customMessage && state === 'thinking') return;

        // Only add user message to history if it's a visible user input
        if (customMessage === undefined) {
            initTTSAudio(); // Unlock audio on user gesture (before any await)
            setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
            setInputText("");
        }

        // If WebRTC is active, route text there instead
        if (isConnected) {
            sendTextMessage(messageToSend);
            return;
        }

        setState("thinking");

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    card_id: cardConfig.card_id,
                    message: messageToSend || "안녕! 대화를 시작하자.", // Fallback starter 
                    conversation_history: messages,
                    session_state: sessionState,
                    book_data: bookData
                })
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();

            // Show text immediately — don't wait for TTS
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

            // Update session state locally if returned by the backend
            if (data.session_state) {
                setSessionState(prev => prev ? { ...prev, ...data.session_state } : data.session_state);
            }

            // Fetch TTS in background; play when ready
            if (ttsAudioRef.current && data.response) {
                setState("speaking");
                fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: data.response, voice: data.voice })
                })
                    .then(r => r.json())
                    .then(tts => { if (tts.audio_url) playAudioString(tts.audio_url); else setState("idle"); })
                    .catch(() => setState("idle"));
            } else {
                setState("idle");
            }

        } catch (e) {
            console.error(e);
            setState("error");
            setTimeout(() => setState("idle"), 2000);
        }
    };

    // Build and push the system prompt whenever the reading phase or page changes.
    // Base: TEMP .md file for the current phase (loaded server-side).
    // Appended: live SESSION_CONTEXT block with the relevant book/page data.
    useEffect(() => {
        if (!isConnected || cardConfig.card_type !== 'read_with_me' || !bookData || !sessionState) return;

        const { phase, currentPageIndex } = sessionState;
        const page = bookData.pages?.[currentPageIndex] || {};

        // Pick the phase prompt from the loaded TEMP files
        const phasePromptBase = readingPhasePrompts
            ? ({ PRE: readingPhasePrompts.pre, DURING_DIALOGIC: readingPhasePrompts.during_dialogic, POST: readingPhasePrompts.post, END: '' }[phase] ?? '')
            : '';

        // Inject live book/page data so the model has concrete content to read aloud
        let context = '\n\n---\n[SESSION_CONTEXT]\n'
            + `책 제목: ${bookData.book_metadata.title}\n`
            + `총 페이지: ${bookData.book_metadata.total_pages}\n`
            + `현재 Phase: ${phase}\n`
            + `현재 페이지 인덱스: ${currentPageIndex} (0-based)\n`;

        if (phase === 'PRE') {
            context += '\n[COVER_DATA]\n'
                + `삽화 설명: ${bookData.pre_reading?.cover?.illustration_description || ''}\n`
                + `인트로 스크립트: ${bookData.pre_reading?.cover?.tts_intro_script || ''}\n`
                + `예측 질문: ${bookData.pre_reading?.cover?.prediction_question || ''}\n`;
        } else if (phase === 'DURING_DIALOGIC') {
            context += '\n[CURRENT_PAGE_DATA]\n'
                + `페이지 번호: ${page.page_number ?? currentPageIndex + 1}\n`
                + `삽화 설명: ${page.illustration_description || ''}\n`
                + `본문 텍스트: ${page.text || ''}\n`
                + `낭독 스크립트: ${page.tts_read_script || ''}\n`;
            if (page.crowd_questions?.[0]) {
                context += `대화 질문: ${page.crowd_questions[0].question}\n`;
            }
        } else if (phase === 'POST') {
            context += '\n[POST_READING_DATA]\n'
                + `마무리 질문: ${bookData.post_reading?.wrap_up?.summary_question || ''}\n`
                + `클로징 멘트: ${bookData.post_reading?.wrap_up?.closing_statement || ''}\n`;
        }

        // Teach the model how to call the registered advance_session tool.
        // (TEMP prompts mention next_state but don't name the actual function.)
        context += '\n[함수 호출 규칙 - 필수]\n'
            + '단계를 전환할 때는 반드시 advance_session 함수를 호출하세요:\n'
            + '• PRE → DURING_DIALOGIC 시작: advance_session({"phase":"DURING_DIALOGIC","currentPageIndex":0})\n'
            + '• 다음 페이지: advance_session({"phase":"DURING_DIALOGIC","currentPageIndex":<현재+1>})\n'
            + `• 마지막 페이지(인덱스 ${bookData.book_metadata.total_pages - 1}) 완료 → POST: advance_session({"phase":"POST"})\n`
            + '• POST 마무리 → END: advance_session({"phase":"END"})\n'
            + '함수 호출 후 자연스럽게 이야기를 이어가세요. 호출 없이 단계를 넘기지 마세요.\n';

        updateContext(phasePromptBase + context);

    }, [sessionState, isConnected, bookData, cardConfig.card_type, readingPhasePrompts, updateContext]);


    // Greeting via Realtime API — fires once WebRTC is first connected
    const hasGreeted = useRef(false);
    useEffect(() => {
        if (!isConnected || hasGreeted.current) return;
        if (cardConfig.card_type === 'read_with_me' && !bookData) return;

        hasGreeted.current = true;
        const greetingMsg = cardConfig.card_type === 'read_with_me'
            ? "우리 이제 책 읽을 시간이야! 짧게 단문으로 신나게 첫인사를 건네줘."
            : "사용자가 처음 들어왔어. 대기 시간을 줄이기 위해 1~2초 이내로 끝날 수 있는 아주 짧고 활기찬 첫 인사를 딱 한 문장으로만 해줘.";

        sendTextMessage(greetingMsg);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, bookData]);

    return (
        <div className="relative flex flex-col h-full w-full min-h-screen bg-white overflow-hidden">

            {/* Start Overlay — shown until user taps to begin (required for getUserMedia on mobile) */}
            {!isStarted && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white px-8">
                    <div className="flex flex-col items-center gap-8 w-full max-w-sm">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-gray-900">{cardConfig.persona_name}</p>
                            <p className="text-gray-500 mt-2 text-lg">{cardConfig.subtitle || cardConfig.title}</p>
                        </div>

                        <button
                            onClick={handleStart}
                            className="w-44 h-44 rounded-full bg-blue-500 text-white flex flex-col items-center justify-center gap-3 shadow-2xl active:scale-95 transition-transform hover:bg-blue-600 select-none"
                        >
                            <Mic className="w-16 h-16" />
                            <span className="text-xl font-bold">시작하기</span>
                        </button>

                        {state === "error" && (
                            <p className="text-red-500 text-center text-sm">
                                마이크 연결에 실패했습니다.<br/>브라우저 마이크 권한을 확인해주세요.
                            </p>
                        )}

                        <p className="text-gray-400 text-sm text-center leading-relaxed">
                            버튼을 누르면 마이크가 켜지고<br/>AI와 실시간 음성 대화가 시작됩니다.
                        </p>
                    </div>
                </div>
            )}

            {/* Top Bar Navigation */}
            <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
                <button
                    onClick={handleEndSession}
                    className="flex items-center gap-2 px-4 py-2 text-[#666666] bg-white rounded-xl shadow-sm font-medium hover:bg-gray-50 transition-colors border border-gray-100"
                >
                    <X className="w-5 h-5" />
                    종료
                </button>

                <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2">
                    <div className="text-center font-bold text-[#333333] text-xl flex items-center gap-2">
                        {cardConfig.persona_name}
                        {isConnecting && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                        {isConnected && <span className="flex w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                    </div>
                    {sessionState && (
                        <div className="mt-1 px-3 py-1 bg-blue-50 text-blue-600 font-semibold rounded-full text-sm shadow-sm border border-blue-100">
                            {sessionState.phase === 'PRE' && "책 읽기 준비"}
                            {sessionState.phase === 'DURING_DIALOGIC' && `${sessionState.currentPageIndex + 1} / ${sessionState.totalPages} 페이지`}
                            {sessionState.phase === 'POST' && "책 다 읽음!"}
                            {sessionState.phase === 'END' && "독서 활동 완료"}
                        </div>
                    )}
                </div>
            </header>

            {/* Main Center Area: Huge Speaker Character */}
            <div className="flex-1 flex items-center justify-center p-6 relative">
                <div className="z-0 transform scale-125 md:scale-150 transition-transform duration-500 ease-out mt-12 md:mt-0">
                    <SpeakerCharacter state={state} />
                </div>
            </div>

            {/* Bottom Overlay Area: Chat & Input */}
            <div className="z-10 w-full max-w-3xl mx-auto px-4 pb-8 flex flex-col gap-4">

                {/* Mic permission warning — non-fatal, text input still works */}
                {micError && (
                    <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm">
                        <MicOff className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{micError}</span>
                    </div>
                )}

                {/* Input Form Box */}
                <form onSubmit={handleSubmit} className="flex gap-3 bg-white p-3 md:p-4 rounded-3xl shadow-lg border border-gray-100 items-center">
                    <button
                        type="button"
                        disabled={isConnecting}
                        className={`p-3 md:p-4 rounded-full transition-colors shrink-0 disabled:opacity-50
                            ${isConnected ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        onClick={handleMicToggle}
                        title={isConnected ? "마이크 끄기" : "실시간 음성 대화 시작하기"}
                    >
                        {isConnecting ? <Loader2 className="w-6 h-6 animate-spin" /> :
                            isConnected ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6 opacity-50" />}
                    </button>

                    <div className="relative flex-1 h-full flex items-center">
                        <input
                            type="text"
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            placeholder={isConnected ? "텍스트로 말 걸기..." : "여기에 입력하거나 마이크 버튼을 눌러보세요!"}
                            className="w-full h-full bg-transparent text-gray-800 text-lg focus:outline-none placeholder-gray-400"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="p-3 md:p-4 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-blue-500 transition-all shadow-md shrink-0"
                    >
                        <Send className="w-6 h-6 ml-0.5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
