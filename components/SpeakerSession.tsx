"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, X, Mic, MicOff, Loader2 } from "lucide-react";
import { CardConfig, BookData, ReadingSessionState, ReadingPhasePrompts, ReadingSessionPhase } from "@/lib/types";
import SpeakerCharacter, { SpeakerState } from "./SpeakerCharacter";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
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
    const [isFinalizingStory, setIsFinalizingStory] = useState(false); // true when story is being generated

    // Reading session specific state
    const [bookData, setBookData] = useState<BookData | null>(null);
    const [sessionState, setSessionState] = useState<ReadingSessionState | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isTimerFinished, setIsTimerFinished] = useState(false);

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
    const checkAnswerTool = {
        name: "check_answer",
        description: "Verifies the child's answer programmatically for better accuracy. Call this to check if the child said the right thing.",
        parameters: {
            type: "object",
            properties: {
                target_word: { type: "string", description: "The word to check (e.g., the word to reverse, or the secret identity)." },
                user_input: { type: "string", description: "What the child actually said." },
                context: { 
                    type: "object",
                    properties: {
                        list: { type: "array", items: { type: "string" }, description: "For Card 13, the previous list of items." }
                    }
                }
            },
            required: ["target_word", "user_input"]
        }
    };

    const handleFunctionCall = async (name: string, args: any, respond: (output: string) => void) => {
        if (name === "check_answer") {
            const { target_word, user_input, context } = args;
            const cardId = cardConfig.card_id;
            let isCorrect = false;
            let reason = "";

            if (cardId === 'card_14_reverse_word') {
                const reversed = target_word.split('').reverse().join('').replace(/\s/g, '');
                const userText = user_input.replace(/\s/g, '');
                isCorrect = reversed === userText;
                reason = isCorrect ? "Correctly reversed." : `Expected ${reversed} but got ${userText}`;
            } else if (cardId === 'card_13_market_game') {
                const prevList = context?.list || [];
                const userItems = user_input.split(/[,\s]+/).filter(Boolean);
                if (userItems.length === prevList.length + 1) {
                    const matchesPrev = prevList.every((item: string, i: number) => userItems[i].includes(item) || item.includes(userItems[i]));
                    isCorrect = matchesPrev;
                    reason = isCorrect ? "Added one item correctly." : "Wait, you missed some earlier items!";
                } else {
                    reason = `Expected ${prevList.length + 1} items, but heard ${userItems.length}.`;
                }
            } else if (cardId === 'card_12_who_am_i') {
                isCorrect = user_input.replace(/\s/g, '').includes(target_word.replace(/\s/g, ''));
                reason = isCorrect ? "Guessed correctly!" : "Not quite.";
            }

            respond(JSON.stringify({ is_correct: isCorrect, reason }));
            return;
        }

        if (name === 'play_sound') {
            if (cardConfig.card_id === 'whats_that_sound') {
                try {
                    const res = await fetch('/api/elevenlabs/sound_effect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: args.description })
                    });
                    const data = await res.json();
                    if (data.url) {
                        const audio = new Audio(data.url);
                        audio.onended = () => {
                            respond(JSON.stringify({ success: true, message: "Sound played." }));
                        };
                        await audio.play();
                    } else {
                        respond(JSON.stringify({ success: false, error: data.error }));
                    }
                } catch (e: any) {
                    console.error("Elevenlabs SFX error:", e);
                    respond(JSON.stringify({ success: false, error: e.message }));
                }
            } else {
                playSFX(args.name as string);
                respond(JSON.stringify({ success: true }));
            }
            return;
        }

        if (name === 'advance_session') {
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
            setTimeout(() => respond(JSON.stringify({ success: true, phase: newPhase })), 150);
            return;
        }
    };

    const {
        connect,
        disconnect,
        sendMessage,
        sendTextMessage,
        updateContext,
        isConnecting,
        isConnected,
        isThinking: isVoiceThinking,
        isMicOpen,
        micError,
        setMicEnabled
    } = useRealtimeVoice({
        cardId: cardConfig.card_id,
        cardType: cardConfig.card_type,
        systemPrompt: cardConfig.system_prompt || "You are a friendly reading companion.",
        voice: cardConfig.voice_openai || "alloy",
        temperature: cardConfig.temperature || 0.8,
        manualMicControl: ['card_12_who_am_i', 'card_13_market_game', 'card_14_reverse_word'].includes(cardConfig.card_id),
        tools: [checkAnswerTool],
        onFunctionCall: handleFunctionCall,
        onAudioStarted: () => setState("speaking"),
        onAudioEnded: () => setState("listening"),
        onUserSpeaking: (isSpeaking) => { if (isSpeaking) setState("listening"); },
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

        if (['card_12_who_am_i', 'card_13_market_game', 'card_14_reverse_word'].includes(cardConfig.card_id)) {
            tools.push({
                type: 'function',
                name: 'check_answer',
                description: 'Verifies the child\'s answer programmatically for better accuracy. Call this to check if the child said the right thing.',
                parameters: {
                    type: 'object',
                    properties: {
                        target_word: { type: 'string', description: 'The word to check (e.g., the word to reverse, or the secret identity).' },
                        user_input: { type: 'string', description: 'What the child actually said.' },
                        context: { 
                            type: 'object',
                            properties: {
                                list: { type: 'array', items: { type: 'string' }, description: 'For Card 13, the previous list of items.' }
                            }
                        }
                    },
                    required: ['target_word', 'user_input']
                }
            });
        }

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

        if (cardConfig.sounds || cardConfig.card_id === 'whats_that_sound') {
            tools.push({
                type: 'function',
                name: 'play_sound',
                description: cardConfig.card_id === 'whats_that_sound'
                    ? 'ElevenLabs AI를 사용하여 주어진 영문 묘사에 맞는 실감나는 효과음을 즉시 생성하고 들려줍니다. (예: "Cinematic Braam, Horror", "Dog barking happily")'
                    : '효과음을 재생합니다. 게임 이벤트에 맞는 사운드를 선택하세요.',
                parameters: {
                    type: 'object',
                    properties: cardConfig.card_id === 'whats_that_sound'
                        ? {
                            description: {
                                type: 'string',
                                description: '생성할 사운드의 영문 묘사. (e.g. "Loud thunder and rain", "Squeaking rubber duck")',
                            }
                        }
                        : {
                            name: {
                                type: 'string',
                                enum: ['correct', 'wrong', 'hint', 'game_start', 'level_up', 'splash', 'goal'],
                                description: '재생할 효과음: correct(정답), wrong(오답), hint(힌트), game_start(게임시작), level_up(레벨업), splash(물소리), goal(골)',
                            },
                        },
                    required: cardConfig.card_id === 'whats_that_sound' ? ['description'] : ['name'],
                },
            });
        }

        if (tools.length === 0) return;

        // Add a 500ms delay to give OpenAI's Realtime Server time to initialize the connection context fully
        // before we send session updates or initial greetings to prevent them from dropping.
        const timeoutId = setTimeout(() => {
            sendMessage('session.update', { session: { tools, tool_choice: 'auto' } });
        }, 500);

        return () => clearTimeout(timeoutId);
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

    // Timer Logic: Initialize timer when game_started is true
    useEffect(() => {
        // More robust check for game_started (handles boolean or string "true")
        const isStarted = sessionState?.game_started === true || sessionState?.game_started === 'true';
        
        if (cardConfig.has_timer && isStarted && timeLeft === null && !isTimerFinished) {
            setTimeLeft(cardConfig.timer_seconds || 180);
            
            // Switch BGM to ticktock when game starts (if configured)
            // Note: SoundManager currently starts BGM on connect. 
            // We'll manually override it here if timer starts.
            const ticktockAudio = new Audio('/sounds/timer_ticktock.mp3');
            ticktockAudio.loop = true;
            ticktockAudio.volume = 0.2;
            ticktockAudio.play().catch(e => console.warn("Timer BGM failed", e));
            
            timerAudioRef.current = ticktockAudio;
        }
    }, [cardConfig.has_timer, cardConfig.timer_seconds, sessionState?.game_started, timeLeft, isTimerFinished]);

    // Countdown Interval
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || isTimerFinished) return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null) return null;
                if (prev <= 1) {
                    setIsTimerFinished(true);
                    clearInterval(interval);
                    // Handle Game Over
                    if (timerAudioRef.current) {
                        timerAudioRef.current.pause();
                        timerAudioRef.current = null;
                    }
                    handleSubmit(undefined, "[SYSTEM] 제한 시간이 다 종료되었어! 게임을 멈추고, 지금까지의 기록과 내용을 정리해서 아이와 즐겁게 대화하며 마무리해줘.");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timeLeft, isTimerFinished]);


    const handleEndSession = () => {
        if (confirm("대화를 종료하시겠습니까?")) {
            if (timerAudioRef.current) {
                timerAudioRef.current.pause();
                timerAudioRef.current.remove();
                timerAudioRef.current = null;
            }
            disconnect();
            router.push("/");
        }
    };

    const isPTTMode = ['card_12_who_am_i', 'card_13_market_game', 'card_14_reverse_word'].includes(cardConfig.card_id);

    const handlePTTStart = () => {
        if (isNonRealtime) {
            // For non-realtime cards: tap the character to trigger device STT
            if (isSpeechSupported && isStarted && state !== "thinking" && state !== "speaking") {
                startSTT();
            }
            return;
        }
        if (isPTTMode && isConnected && state === "listening") {
            setMicEnabled(true);
        }
    };

    const handlePTTEnd = () => {
        if (isNonRealtime) {
            // Web Speech API on iOS auto-stops on silence — don't abort early
            return;
        }
        if (isPTTMode && isConnected) {
            setMicEnabled(false);
        }
    };

    // Entry point — user taps the start button (user gesture required for mic + audio unlock)
    const handleStart = () => {
        initTTSAudio();
        setIsStarted(true);
        if (cardConfig.use_realtime !== false) {
            connect();
        } else {
            // Non-realtime mode: Trigger initial greeting via text API
            const greetingMsg = cardConfig.card_type === 'read_with_me'
                ? "우리 이제 책 읽을 시간이야! 짧게 단문으로 신나게 첫인사를 건네줘."
                : "안녕! 짧게 인사해줘.";
            handleSubmit(undefined, greetingMsg);
        }
    };

    const handleMicToggle = () => {
        if (isNonRealtime) {
            if (!isSpeechSupported) {
                alert("이 브라우저는 음성 인식을 지원하지 않습니다. 텍스트로 입력해주세요.");
                return;
            }
            if (isSTTListening) {
                stopSTT();
            } else if (isStarted && state !== "thinking" && state !== "speaking") {
                startSTT();
            }
            return;
        }

        if (isConnected) {
            disconnect();
            setIsStarted(false);
        } else {
            initTTSAudio();
            setIsStarted(true);
            connect();
        }
    };


    // ── Device STT (Web Speech API) for non-realtime cards (12, 13, 14) ──────────
    // These cards use use_realtime: false, so we integrate the native device STT
    // via webkitSpeechRecognition (supported on iOS Safari, Chrome on iOS, and desktop).
    const isNonRealtime = cardConfig.use_realtime === false;

    // A ref so the STT callback can always call the latest handleSubmit without
    // being defined before it (handleSubmit is defined further down in this file).
    const handleSubmitRef = useRef<((...args: any[]) => Promise<void>) | null>(null);

    const { isListening: isSTTListening, isSupported: isSpeechSupported, startListening: startSTT, stopListening: stopSTT } = useSpeechRecognition({
        lang: 'ko-KR',
        onResult: (transcript) => {
            // Show the user's spoken text in the chat history
            setMessages(prev => [...prev, { role: 'user', content: transcript }]);
            setState("thinking");
            // Submit to the non-realtime chat API
            handleSubmitRef.current?.(undefined, transcript);
        },
        onError: (error) => {
            console.warn("STT error:", error);
        }
    });

    // Sync character animation with STT state for non-realtime cards
    const prevSTTListeningRef = useRef(false);
    useEffect(() => {
        if (!isNonRealtime) return;
        if (isSTTListening) {
            prevSTTListeningRef.current = true;
            setState("listening");
        } else if (prevSTTListeningRef.current) {
            prevSTTListeningRef.current = false;
            // If no result was received, return to idle (not speaking/thinking)
            setState(prev => prev === "listening" ? "idle" : prev);
        }
    }, [isSTTListening, isNonRealtime]);

    // TEXT FALLBACK API — uses <audio> element for cross-browser compatibility
    const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
    const thinkingAudioRef = useRef<HTMLAudioElement | null>(null);
    const timerAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            ttsAudioRef.current?.pause();
            ttsAudioRef.current?.remove();
            ttsAudioRef.current = null;
            thinkingAudioRef.current?.pause();
            thinkingAudioRef.current?.remove();
            thinkingAudioRef.current = null;
            if (timerAudioRef.current) {
                timerAudioRef.current.pause();
                timerAudioRef.current.remove();
                timerAudioRef.current = null;
            }
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
        if (!thinkingAudioRef.current) {
            const el = document.createElement('audio');
            el.style.display = 'none';
            // Pre-load the first thinking sound
            el.src = '/sounds/thinking/generic_thinking_1.mp3'; 
            // Do NOT loop the thinking line (so it doesn't sound robotic repeating)
            el.loop = false;
            document.body.appendChild(el);
            thinkingAudioRef.current = el;
        }
    }, []);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        if (state === "thinking" && !cardConfig.disable_thinking_cue) {
            if (thinkingAudioRef.current) {
                // Wait 1.5 seconds before playing the cue
                timeoutId = setTimeout(() => {
                    // Decide between story-specific (1-3) or generic (1-4) randomly if we want a mix,
                    // but for now, let's use the 4 generic ones broadly.
                    const isStoryCard = cardConfig.card_id === "story_writer";
                    
                    if (isStoryCard && Math.random() > 0.5) {
                        const randomInt = Math.floor(Math.random() * 3) + 1;
                        thinkingAudioRef.current!.src = `/sounds/thinking/story_thinking_${randomInt}.mp3`;
                    } else {
                        const randomInt = Math.floor(Math.random() * 4) + 1;
                        thinkingAudioRef.current!.src = `/sounds/thinking/generic_thinking_${randomInt}.mp3`;
                    }

                    thinkingAudioRef.current!.volume = 1.0;
                    thinkingAudioRef.current!.play().catch(e => console.warn("Thinking audio play failed", e));
                }, 1500); 
            }
        } else {
            if (thinkingAudioRef.current) {
                thinkingAudioRef.current.pause();
                thinkingAudioRef.current.currentTime = 0;
            }
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [state, cardConfig.card_id]);

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

            // Check if story is ready
            if (data.story_data && data.story_data.story_ready) {
                setIsFinalizingStory(true);
                try {
                    const finalizeRes = await fetch('/api/story/finalize', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data.story_data)
                    });
                    const finalizeData = await finalizeRes.json();
                    if (finalizeData.success) {
                        // wait 3 seconds for TTS output before prompting user
                        setTimeout(() => {
                            if (confirm("책이 완성되었습니다! 내가 만든 동화책을 바로 읽으러 갈까요?")) {
                                router.push("/");
                            }
                            setIsFinalizingStory(false);
                            setState("idle");
                        }, 4000);
                    } else {
                        throw new Error(finalizeData.error || "Failed to finalize");
                    }
                } catch (err) {
                    console.error("Story finalize failed:", err);
                    alert("이야기 책 생성 중에 오류가 발생했습니다 ㅠㅠ");
                    setIsFinalizingStory(false);
                }
            }

            // Fetch TTS in background; play when ready (Wait in "thinking" state)
            if (ttsAudioRef.current && data.response) {
                fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: data.response,
                        voice: data.voice,
                        voice_provider: data.voice_provider,
                        elevenlabs_voice_id: data.elevenlabs_voice_id
                    })
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

    // Keep the ref pointing to the latest handleSubmit so STT callback can call it
    handleSubmitRef.current = handleSubmit;

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

        // Delay the initial interaction by 500ms to avoid the OpenAI race condition where the 
        // actor hasn't fully attached to the session context on the server side.
        const startTimer = setTimeout(() => {
            sendTextMessage(greetingMsg);
        }, 500);

        return () => clearTimeout(startTimer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, bookData]);

    if (isFinalizingStory) {
        return (
            <div className="flex flex-col h-screen w-full bg-white items-center justify-center p-8 text-center space-y-6">
                <audio src="/sounds/magic_drawing.mp3" autoPlay loop className="hidden" />
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                <h2 className="text-2xl font-bold text-gray-800">그림책을 뚝딱뚝딱 만들고 있어요!</h2>
                <p className="text-gray-500">들리시나요? 작가님의 멋진 이야기 책 표지를<br/>마법 연필로 슥삭슥삭 그리고 있는 소리예요!<br/>조금만 기다려주세요...</p>
            </div>
        );
    }

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
                                마이크 연결에 실패했습니다.<br />브라우저 마이크 권한을 확인해주세요.
                            </p>
                        )}

                        <p className="text-gray-400 text-sm text-center leading-relaxed">
                            {isNonRealtime ? (
                                <>버튼을 누르면 게임이 시작됩니다.<br />마이크 버튼으로 목소리로 대답하세요.</>
                            ) : (
                                <>버튼을 누르면 마이크가 켜지고<br />AI와 실시간 음성 대화가 시작됩니다.</>
                            )}
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
                        {isConnected && (
                            <span className="flex text-xs font-normal ml-2 items-center">
                                {isMicOpen ? (
                                    <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        마이크 켜짐 (말씀하세요)
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                        듣는 중...
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                    {sessionState && (
                        <div className="mt-1 px-3 py-1 bg-blue-50 text-blue-600 font-semibold rounded-full text-sm shadow-sm border border-blue-100">
                            {sessionState.phase === 'PRE' && "책 읽기 준비"}
                            {sessionState.phase === 'DURING_DIALOGIC' && `${sessionState.currentPageIndex + 1} / ${sessionState.totalPages} 페이지`}
                            {sessionState.phase === 'POST' && "책 다 읽음!"}
                            {sessionState.phase === 'END' && "독서 활동 완료"}
                        </div>
                    )}
                    {timeLeft !== null && (
                        <div className={`mt-1 px-4 py-1 font-bold rounded-full text-sm shadow-sm border flex items-center gap-2 ${timeLeft < 30 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            <Loader2 className={`w-3 h-3 ${timeLeft > 0 ? 'animate-spin' : ''}`} />
                            남은 시간: {Math.floor(timeLeft / 60)}분 {timeLeft % 60}초
                        </div>
                    )}
                </div>
            </header>

            {/* Main Center Area: Huge Speaker Character */}
            <div className="flex-1 flex items-center justify-center p-6 relative">
                <div className="z-0 transform scale-125 md:scale-150 transition-transform duration-500 ease-out mt-12 md:mt-0">
                    <SpeakerCharacter 
                        state={state} 
                        onPTTStart={handlePTTStart}
                        onPTTEnd={handlePTTEnd}
                    />
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
                        disabled={isConnecting || (isNonRealtime && !isSpeechSupported)}
                        className={`p-3 md:p-4 rounded-full transition-colors shrink-0 disabled:opacity-50
                            ${isNonRealtime && !isSpeechSupported ? 'bg-gray-100 text-gray-400' :
                                isNonRealtime && isSTTListening ? 'bg-green-100 text-green-600 hover:bg-green-200 animate-pulse' :
                                    isNonRealtime ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' :
                                        isConnected && isMicOpen ? 'bg-green-100 text-green-600 hover:bg-green-200' :
                                            isConnected && !isMicOpen ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' :
                                                'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        onClick={handleMicToggle}
                        title={isNonRealtime && !isSpeechSupported ? "이 브라우저는 음성 인식을 지원하지 않습니다" :
                               isNonRealtime ? (isSTTListening ? "듣는 중... (탭하여 취소)" : "마이크로 말하기") :
                               isConnected ? "마이크 끄기" : "실시간 음성 대화 시작하기"}
                    >
                        {isNonRealtime && !isSpeechSupported ? <MicOff className="w-6 h-6" /> :
                            isNonRealtime ? <Mic className="w-6 h-6" /> :
                                isConnecting ? <Loader2 className="w-6 h-6 animate-spin" /> :
                                    isConnected && isMicOpen ? <Mic className="w-6 h-6" /> :
                                        isConnected && !isMicOpen ? <MicOff className="w-6 h-6" /> :
                                            <MicOff className="w-6 h-6 opacity-50" />}
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
