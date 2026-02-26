'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LiveAvatarSession, SessionEvent } from '@heygen/liveavatar-web-sdk';
import { Mic, MicOff, Loader2, Keyboard, Send } from 'lucide-react';
import { getHeyGenToken } from '../app/actions_heygen';
import { transcribeAudio } from '../app/actions_stt';

interface Message {
    role: string;
    content: string;
    parsed?: any;
    audioUrl?: string;
}

interface LiveAvatarInterfaceProps {
    messages: Message[];
    onSendMessage: (text: string) => void;
    isLoading: boolean;
    sessionEnded?: boolean;
    onSessionEnd?: () => void;
}

export default function LiveAvatarInterface({
    messages,
    onSendMessage,
    isLoading,
    sessionEnded = false,
    onSessionEnd
}: LiveAvatarInterfaceProps) {
    const [debug, setDebug] = useState<string>('');
    const [isAvatarReady, setIsAvatarReady] = useState(false);
    const session = useRef<LiveAvatarSession | null>(null);
    const sessionEndedRef = useRef(false);
    const onSessionEndRef = useRef(onSessionEnd);
    onSessionEndRef.current = onSessionEnd;
    const [avatarId, setAvatarId] = useState<string>('Angela-inT-20220819');
    // Mic State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const startTime = useRef<number>(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Keyboard State
    const [isKeyboardMode, setIsKeyboardMode] = useState(false);
    const [inputText, setInputText] = useState('');

    const handleSendText = () => {
        if (!inputText.trim()) return;
        onSendMessage(inputText);
        setInputText('');
    };



    // Initial Setup and Start Session
    useEffect(() => {

        let active = true;

        async function init() {
            try {
                // Pass avatarId to token generation (Create Session Token)
                const data = await getHeyGenToken();
                if (!active) return;

                console.log("Token Response:", data);
                if (data.error || !data.token) {
                    const errorMsg = `Error: ${data.error}. Data: ${JSON.stringify(data)}`;
                    throw new Error(errorMsg);
                }
                const token = data.token;

                // Initialize Session
                session.current = new LiveAvatarSession(token);

                // Setup Event Listeners
                session.current.on(SessionEvent.SESSION_STREAM_READY, () => {
                    console.log("Session Stream Ready");
                    if (videoRef.current) {
                        try {
                            session.current!.attach(videoRef.current);
                            console.log("Stream attached to video element.");
                            setIsAvatarReady(true); // Ensure ready state is set
                        } catch (e) {
                            console.error("Failed to attach stream:", e);
                            setDebug("Stream Attach Error");
                        }
                    } else {
                        console.error("Video Ref missing during stream ready");
                    }
                });

                session.current.on(SessionEvent.SESSION_DISCONNECTED, () => {
                    console.log("Session Disconnected");
                    setIsAvatarReady(false);
                    if (onSessionEndRef.current && !sessionEndedRef.current) {
                        sessionEndedRef.current = true;
                        onSessionEndRef.current();
                    }
                });

                // Start Session
                await session.current.start();
                console.log("Session Started");
                setIsAvatarReady(true);

            } catch (e: any) {
                setDebug(`Init Error: ${e.message}`);
                console.error("Avatar Init Error:", e);
            }
        }
        init();

        return () => {
            active = false;
            // Cleanup
            if (session.current) {
                session.current.stop().catch(console.error);
            }
        };
    }, []); // Run once on mount
    // Session Timer (1 Minute Limit)
    useEffect(() => {
        if (isAvatarReady && !sessionEnded) {
            const timer = setTimeout(() => {
                console.log("Session Time Limit Reached (Safe Limit)");
                if (session.current) {
                    session.current.stop().catch(console.error);
                }
                setDebug("Session Ended (Time Limit)");
                if (onSessionEndRef.current && !sessionEndedRef.current) {
                    sessionEndedRef.current = true;
                    onSessionEndRef.current();
                }
            }, 55000); // 55 seconds (Safe buffer for 1 min limit)

            return () => clearTimeout(timer);
        }
    }, [isAvatarReady, sessionEnded]);

    const messageQueue = useRef<Message[]>([]);

    // Handle AI Response (Speak)
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {

            if (!isAvatarReady || !session.current) {
                console.warn("Avatar not ready. Queueing message for playback:", lastMsg.content);
                messageQueue.current.push(lastMsg);
                setDebug(`Queued: ${lastMsg.content.slice(0, 10)}... (Queue Size: ${messageQueue.current.length})`);
                return;
            }

            console.log("Avatar Ready. Speaking immediately:", lastMsg.content);
            speakMessage(lastMsg);
        }
    }, [messages]); // Removed isAvatarReady to prevent double-firing

    // Process Queue when Avatar becomes Ready
    useEffect(() => {
        if (isAvatarReady && session.current && messageQueue.current.length > 0) {
            console.log("[Avatar] Ready. Processing queued messages. Count:", messageQueue.current.length);

            // Add slight delay to ensure avatar is listening and stream is stable
            setTimeout(() => {
                // Speak the last queued message to ensure the latest response is heard
                const lastQueuedMsg = messageQueue.current[messageQueue.current.length - 1];
                if (lastQueuedMsg) {
                    console.log("[Avatar] Speaking queued message (delayed):", lastQueuedMsg.content, "Has Audio:", !!lastQueuedMsg.audioUrl);
                    speakMessage(lastQueuedMsg);
                }
                messageQueue.current = []; // Clear queue after processing
            }, 1500); // Increased delay slightly
        }
    }, [isAvatarReady]);

    const speakMessage = (msg: Message) => {
        if (!session.current) return;

        // Priority: Audio URL (for Lite Mode / Custom TTS)
        if (msg.audioUrl) {
            console.log("[Avatar] Speaking Audio (Lite Mode). Has DataURI:", msg.audioUrl.startsWith('data:'));
            try {
                // Convert Data URI to Base64 string (remove header)
                let base64Data = "";
                if (msg.audioUrl.startsWith('data:')) {
                    const parts = msg.audioUrl.split(',');
                    const mimeMatch = parts[0].match(/:(.*?);/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'unknown';
                    console.log("[Avatar] Detected Audio Format:", mimeType);
                    base64Data = parts[1];
                } else {
                    base64Data = msg.audioUrl;
                }
                session.current.repeatAudio(base64Data);
            } catch (e) {
                console.error("Failed to speak audio:", e);
                setDebug("Audio Playback Failed");
            }
            return;
        }

        // Fallback: Text (if no audio)
        const textToSpeak = msg.parsed?.ko || msg.parsed?.message || msg.parsed?.answer || msg.parsed?.content || msg.content;

        if (textToSpeak && typeof textToSpeak === 'string' && textToSpeak.trim().length > 0) {
            console.log("Avatar Speaking Text via TTS:", textToSpeak.trim());
            try {
                session.current.repeat(textToSpeak.trim());
            } catch (e: any) {
                console.error("Error calling repeat:", e);
                setDebug(`Speak Error: ${e.message}`);
                setIsAvatarReady(false);
            }
        } else {
            console.log("Avatar Skip Speaking: Empty content");
        }
    };


    // Mic Logic (re-used from ChatInterface)
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = 'audio/webm'; // Simplified MIME type

            mediaRecorder.current = new MediaRecorder(stream, { mimeType });
            audioChunks.current = [];
            startTime.current = Date.now();

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.current.push(event.data);
            };

            mediaRecorder.current.onstop = async () => {
                const duration = Date.now() - startTime.current;
                if (duration < 500) {
                    setDebug("Recording too short (< 0.5s)");
                    setIsRecording(false);
                    return;
                }

                const audioBlob = new Blob(audioChunks.current, { type: mimeType });
                setIsRecording(false);
                setDebug("Transcribing...");

                // Transcribe
                const formData = new FormData();
                formData.append('file', audioBlob, 'audio.webm');

                try {
                    const result = await transcribeAudio(formData);
                    console.log("STT Result:", result);
                    if (result.text) {
                        setDebug(`You said: "${result.text}"`);
                        onSendMessage(result.text);
                    } else {
                        setDebug("STT failed: No text returned");
                    }
                } catch (e: any) {
                    console.error('Transcription error', e);
                    setDebug(`STT Error: ${e.message}`);
                }
            };

            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (e) {
            console.error('Mic error', e);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
        }
    };

    // Get last AI message for display
    const lastAiMsg = messages.slice().reverse().find(m => m.role === 'assistant');
    const koText = lastAiMsg?.parsed?.ko || lastAiMsg?.content || "안녕하세요! 오늘 수업을 정리해볼까요?";
    const viText = lastAiMsg?.parsed?.vn || "";

    return (
        <div className="flex flex-col w-full h-full bg-white relative overflow-hidden">
            {/* 1. Subtitle Overlay (Top) - Only show when avatar is ready */}
            {isAvatarReady && (
                <div className="absolute top-8 left-4 right-4 z-10 flex flex-col items-center gap-2 pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-4 border border-indigo-50 text-center max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-500">
                        <p className="font-bold text-gray-800 text-base leading-relaxed break-keep">
                            {koText}
                        </p>
                        {viText && (
                            <p className="text-gray-500 text-sm mt-1 leading-relaxed border-t border-gray-100 pt-1 break-keep">
                                {viText}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* 2. Avatar Video (Center) */}
            <div className="flex-1 flex items-center justify-center bg-white overflow-hidden">
                {/* 
                   LiveAvatarSession attaches stream to video element directly.
                   We render the video element always, and show loader if not ready.
                */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isAvatarReady ? 'opacity-100' : 'opacity-0'}`}
                    style={{ objectPosition: 'calc(50% - 20px) 50%' }}
                />

                {/* Debug Overlay */}
                {(!isAvatarReady || debug) && (
                    <div className="absolute top-0 left-0 right-0 p-2 flex flex-col items-center gap-1 pointer-events-none z-50">
                        {!isAvatarReady && (
                            <div className="bg-black/50 text-white px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm">
                                <Loader2 className="animate-spin" size={16} />
                                <span className="text-xs">Initializing Session...</span>
                            </div>
                        )}
                        {/* Debug output removed as per user request
                        {debug && (
                            <div className="bg-red-500/80 text-white px-3 py-1 rounded text-[10px] max-w-[80%] text-center backdrop-blur-sm animate-in slide-in-from-top-2">
                                {debug}
                            </div>
                        )}
                        */}
                    </div>
                )}
            </div>

            {/* 3. Controls (Bottom) */}
            <div className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${isKeyboardMode ? 'bg-white border-t border-gray-200 pb-8' : 'pb-12 flex justify-center items-end pointer-events-none'}`}>

                {isKeyboardMode ? (
                    // Text Input Mode
                    <div className="flex gap-2 w-full items-center pointer-events-auto px-3 py-2">
                        <button
                            onClick={() => setIsKeyboardMode(false)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                            title="Switch to Voice"
                        >
                            <Mic size={20} />
                        </button>
                        <form
                            className="flex-1 flex gap-2 items-center min-w-0"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendText();
                            }}
                        >
                            <input
                                className="flex-1 min-w-0 border border-gray-300 rounded-full px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                placeholder="Type a message..."
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={!inputText.trim() || isLoading}
                                className="p-2 flex-shrink-0 bg-indigo-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-md"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                ) : (
                    // Voice Mode
                    <div className="flex items-end gap-6 pointer-events-auto mb-2">
                        {/* Keyboard Toggle */}
                        <button
                            onClick={() => setIsKeyboardMode(true)}
                            className="mb-4 p-3 bg-white/90 backdrop-blur rounded-full shadow-lg text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-all active:scale-95 border border-indigo-50"
                            title="Switch to Keyboard"
                        >
                            <Keyboard size={24} />
                        </button>

                        {/* Mic Button */}
                        <div className="flex flex-col items-center gap-2">
                            <button
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                onTouchStart={startRecording}
                                onTouchEnd={stopRecording}
                                disabled={isLoading || !isAvatarReady || sessionEnded}
                                className={`
                                    w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all transform active:scale-95 border-4 border-white/30 backdrop-blur-sm
                                    ${isRecording ? 'bg-red-500 text-white scale-110 shadow-red-500/30' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/30'}
                                    ${(isLoading || !isAvatarReady) ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                                `}
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={32} /> : (isRecording ? <MicOff size={32} /> : <Mic size={32} />)}
                            </button>
                            <div className="text-center text-xs text-indigo-900/70 font-semibold bg-white/50 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
                                {isRecording ? "Listening..." : "Hold to speak"}
                            </div>
                        </div>

                        {/* Placeholder for symmetry or another button */}
                        <div className="w-12"></div>
                    </div>
                )}
            </div>
        </div >
    );
}
