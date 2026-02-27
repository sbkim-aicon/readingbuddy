"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, X, Mic, MicOff, Loader2 } from "lucide-react";
import { CardConfig, BookData, ReadingSessionState } from "@/lib/types";
import SpeakerCharacter, { SpeakerState } from "./SpeakerCharacter";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";

export default function SpeakerSession({ cardConfig }: { cardConfig: CardConfig }) {
    const router = useRouter();
    const [state, setState] = useState<SpeakerState>("idle");
    const [inputText, setInputText] = useState("");
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);

    // Reading session specific state
    const [bookData, setBookData] = useState<BookData | null>(null);
    const [sessionState, setSessionState] = useState<ReadingSessionState | null>(null);

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
        sendTextMessage,
        updateContext,
        isConnecting,
        isConnected,
        isThinking: isVoiceThinking
    } = useRealtimeVoice({
        cardId: cardConfig.card_id,
        systemPrompt: cardConfig.system_prompt || "You are a friendly reading companion.", // Simplified for now. Will pass full prompt later.
        voice: cardConfig.voice_openai || "alloy",
        temperature: cardConfig.temperature || 0.8,
        onAudioStarted: () => setState("speaking"),
        onAudioEnded: () => setState(isConnected ? "listening" : "idle"),
        onError: (err) => {
            console.error(err);
            setState("error");
            setTimeout(() => setState("idle"), 2000);
        }
    });

    // Update global state based on WebRTC state
    useEffect(() => {
        if (isVoiceThinking) {
            setState("thinking");
        } else if (isConnected && state !== "speaking") {
            setState("listening"); // Default to listening when connected
        } else if (!isConnected && state !== "speaking" && state !== "error") {
            setState("idle");
        }
    }, [isVoiceThinking, isConnected, state]);


    const handleEndSession = () => {
        if (confirm("대화를 종료하시겠습니까?")) {
            disconnect();
            router.push("/");
        }
    };

    const handleMicToggle = () => {
        initTTSAudio(); // Unlock audio on first user gesture
        if (isConnected) {
            disconnect();
        } else {
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

    // Prepare dynamic system prompt based on sessionState
    useEffect(() => {
        if (!isConnected || cardConfig.card_type !== 'read_with_me' || !bookData || !sessionState) return;

        const buildReadWithMePrompt = () => {
            const { phase, currentPageIndex } = sessionState;
            const page = bookData.pages?.[currentPageIndex] || {};

            let promptStr = `You are a friendly reading companion handling the ${phase} phase.\n\n`;

            if (phase === 'PRE') {
                promptStr += `[BOOK_DATA]\nTitle: ${bookData.book_metadata.title}\nAuthor: ${bookData.book_metadata.author}\n\n`;
                promptStr += `[COVER_DATA]\nDescription: ${bookData.pre_reading?.cover?.illustration_description}\nIntro: ${bookData.pre_reading?.cover?.tts_intro_script}\nQuestion: ${bookData.pre_reading?.cover?.prediction_question}\n`;
            } else if (phase === 'DURING_DIALOGIC') {
                promptStr += `[CURRENT_PAGE_DATA]\nPage: ${page.page_number}\nIllustration: ${page.illustration_description}\nText: ${page.text}\nRead Script: ${page.tts_read_script}\n`;
                if (page.crowd_questions?.[0]) {
                    promptStr += `Question 1: ${page.crowd_questions[0].question}\n`;
                }
            } else if (phase === 'POST') {
                promptStr += `[POST_READING_QUESTIONS]\nSummary Question: ${bookData.post_reading?.wrap_up?.summary_question}\nClosing: ${bookData.post_reading?.wrap_up?.closing_statement}\n`;
            }

            promptStr += `\n[INSTRUCTIONS]\nYou MUST keep your responses extremely short and conversational (1-2 sentences max). Wait for the child.`;
            // Note: Tool calling for state transitions in Realtime API requires slightly deeper function calling setup. 
            // For MVP Phase 4, we will append a simple instruction.
            return promptStr;
        };

        const newPrompt = buildReadWithMePrompt();
        updateContext(newPrompt);

    }, [sessionState, isConnected, bookData, cardConfig.card_type, updateContext]);


    // Trigger initial greeting on mount
    const hasGreeted = useRef(false);
    useEffect(() => {
        // Delay greeting until book is loaded for read_with_me cards
        if (cardConfig.card_type === 'read_with_me' && !bookData) return;

        if (!hasGreeted.current && !isConnected) {
            hasGreeted.current = true;
            // Introduce yourself first by sending a hidden background prompt
            const greetingMsg = cardConfig.card_type === 'read_with_me'
                ? "우리 이제 책 읽을 시간이야! 짧게 단문으로 신나게 첫인사를 건네줘."
                : "사용자가 처음 들어왔어. 대기 시간을 줄이기 위해 1~2초 이내로 끝날 수 있는 아주 짧고 활기찬 첫 인사를 딱 한 문장으로만 해줘.";

            handleSubmit(undefined, greetingMsg);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookData, cardConfig, isConnected]);

    return (
        <div className="relative flex flex-col h-full w-full min-h-screen bg-white overflow-hidden">
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

                {/* Chat History bubbles removed as per screen-free voice UI design */}

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
