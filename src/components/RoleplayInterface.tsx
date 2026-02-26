'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Play, Square, Bot, User, AlertCircle, Globe, ListChecks, CheckCircle2, Circle, Volume2, VolumeX, RotateCcw, PlayCircle, MicOff } from 'lucide-react';
import { transcribeAudio } from '../app/actions_stt';

// Types
export interface MessageWithAudio {
    role: 'user' | 'assistant' | 'system';
    content: string; // JSON string for assistant, plain text for user usually
    audioUrl?: string; // base64 data url
    hidden?: boolean; // If true, don't show in UI (used for trigger prompts)
    parsed?: {
        ko: string;
        vn: string;
        emotion: string;
        correct?: string;
        correction_expression?: string;
        correction_explanation?: string;
        correction_explanation_vn?: string;
        correct_answer_ko?: string;
        grammatically_correct?: string;
        contextually_appropriate?: string;
        better_expression_ko?: string;
        context_feedback?: string;
        mission_complete_0?: string;
        mission_complete_1?: string;
        mission_complete_2?: string;
        message?: string;
        answer?: string;
        content?: string;
    };
}

interface RoleplayInterfaceProps {
    messages: MessageWithAudio[];
    onSendMessage: (text: string, isHidden?: boolean) => void;
    isLoading: boolean;
    missions?: string[];
    isTtsEnabled: boolean;
    onToggleTts: () => void;
    onReset: () => void;
    sessionEnded: boolean;
    title?: string;
}

export default function RoleplayInterface({
    messages,
    onSendMessage,
    isLoading,
    missions = [],
    isTtsEnabled,
    onToggleTts,
    onReset,
    sessionEnded,
    title = 'Roleplay'
}: RoleplayInterfaceProps) {
    const [input, setInput] = useState('');
    const [showMissions, setShowMissions] = useState(false);
    const [isListening, setIsListening] = useState(false); // Used for "Recording" state now
    const [isProcessingStt, setIsProcessingStt] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const blobUrlRef = useRef<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Track completed missions based on history
    const completedMissionIndices = new Set<number>();
    messages.forEach(m => {
        if (m.parsed) {
            missions.forEach((_, idx) => {
                if ((m.parsed as any)[`mission_complete_${idx}`] === 'Yes') {
                    completedMissionIndices.add(idx);
                }
            });
        }
    });

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Auto-play latest AI audio if present and TTS enabled
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        // Only auto-play if session is NOT ended
        if (!sessionEnded && lastMessage && lastMessage.role === 'assistant' && lastMessage.audioUrl && isTtsEnabled) {
            playAudio(lastMessage.audioUrl);
        }
    }, [messages, isTtsEnabled, sessionEnded]);

    // Helper: Convert Base64 to Uint8Array
    const base64ToUint8Array = (base64: string) => {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    };

    // Helper: Create WAV Header
    const createWavHeader = (dataLength: number, sampleRate: number = 24000) => {
        const buffer = new ArrayBuffer(44);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true); // ChunkSize
        writeString(view, 8, 'WAVE');

        // fmt sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
        view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
        view.setUint16(22, 1, true); // NumChannels (1 for Mono)
        view.setUint32(24, sampleRate, true); // SampleRate
        view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * BlockAlign)
        view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
        view.setUint16(34, 16, true); // BitsPerSample

        // data sub-chunk
        writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true); // Subchunk2Size

        return buffer;
    };

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const playAudio = async (url: string) => {
        if (!url) return;

        let srcToPlay = url;

        // Revoke previous blob URL to prevent memory leaks
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }

        if (url.startsWith('data:')) {
            try {
                const parts = url.split(',');
                if (parts.length < 2) throw new Error("Invalid Data URI");

                const mimeMatch = parts[0].match(/:(.*?);/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mpeg';
                const base64Data = parts[1];
                const binaryData = base64ToUint8Array(base64Data);

                let blob: Blob;
                if (mimeType === 'audio/pcm') {
                    // Specific handling for raw PCM (e.g. ElevenLabs wrapup)
                    const wavHeader = createWavHeader(binaryData.length, 24000);
                    blob = new Blob([wavHeader, binaryData], { type: 'audio/wav' });
                } else {
                    // Standard formats like audio/mpeg or audio/wav with headers
                    blob = new Blob([binaryData], { type: mimeType });
                }

                srcToPlay = URL.createObjectURL(blob);
                blobUrlRef.current = srcToPlay;
                console.log(`[AudioPath] Playing via BlobURL: ${srcToPlay}, Mime: ${mimeType}`);
            } catch (e) {
                console.error("Audio processing failed:", e);
                return;
            }
        }

        try {
            if (!audioRef.current) {
                audioRef.current = new Audio();
            }

            audioRef.current.pause();
            audioRef.current.src = srcToPlay;

            // Explicitly call load() to reset the media element
            audioRef.current.load();

            await audioRef.current.play();
        } catch (error) {
            console.error("Audio Playback Error:", error, "URL Type:", url.slice(0, 30));
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Chrome/Firefox use webm typically
                setIsProcessingStt(true);

                // Create a File object
                const audioFile = new File([audioBlob], "recording.webm", { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('file', audioFile);

                try {
                    const result = await transcribeAudio(formData);
                    if (result.success && result.text) {
                        setInput(prev => prev + (prev ? ' ' : '') + result.text);
                    } else {
                        console.error('STT Failed:', result.error);
                        alert('Voice recognition failed: ' + result.error);
                    }
                } catch (e: any) {
                    console.error('STT Error:', e);
                    alert('STT network error: ' + e.message);
                } finally {
                    setIsProcessingStt(false);
                    // Stop tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.start();
            setIsListening(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isListening) {
            mediaRecorderRef.current.stop();
            setIsListening(false);
        }
    };

    const toggleRecording = () => {
        if (isListening) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-[#b2c7da] relative font-sans">
            {/* Mission Panel - Needs to be high z-index */}
            {showMissions && (
                <div className="absolute top-16 right-4 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h4 className="font-bold text-sm text-gray-700">Missions</h4>
                        <span className="text-xs font-medium text-indigo-600">
                            {completedMissionIndices.size}/{missions.length}
                        </span>
                    </div>
                    <div className="p-2 space-y-1">
                        {missions.map((mission, idx) => {
                            const isCompleted = completedMissionIndices.has(idx);
                            return (
                                <div key={idx} className={`flex items-start gap-2 p-2 rounded-lg text-sm ${isCompleted ? 'bg-indigo-50 text-indigo-900' : 'text-gray-600'}`}>
                                    <div className={`mt-0.5 ${isCompleted ? 'text-indigo-600' : 'text-gray-300'}`}>
                                        {isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                    </div>
                                    <span className={isCompleted ? 'line-through opacity-70' : ''}>{mission}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Application Header / Controls */}
            <div className="px-4 py-3 bg-[#b2c7da] flex items-center justify-between z-10 shadow-sm relative shrink-0">
                {/* Left: Branding or Title */}
                <div className="flex items-center gap-1 opacity-90">
                    <span className="font-bold text-lg text-[#3b1e1e]">{title}</span>
                    <span className="text-xs text-[#3b1e1e]/70 px-1.5 py-0.5 border border-[#3b1e1e]/20 rounded-full">AI Tutor</span>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleTts}
                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${isTtsEnabled
                            ? 'bg-[#3b1e1e] text-white'
                            : 'bg-white/50 text-[#3b1e1e] hover:bg-white/80'
                            }`}
                        title={isTtsEnabled ? "Mute TTS" : "Enable TTS"}
                    >
                        {isTtsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>

                    <button
                        onClick={onReset}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/50 text-[#3b1e1e] hover:bg-white/80 transition-colors"
                        title="Reset Chat"
                    >
                        <RotateCcw size={16} />
                    </button>

                    {missions.length > 0 && (
                        <button
                            onClick={() => setShowMissions(!showMissions)}
                            className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${showMissions ? 'bg-[#3b1e1e] text-white' : 'bg-white/50 text-[#3b1e1e] hover:bg-white/80'}`}
                            title="Missions"
                        >
                            <ListChecks size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">


                {/* Date Divider (Mock) */}
                <div className="flex justify-center mb-4">
                    <span className="bg-[#9bbbd4] text-xs text-white px-3 py-1 rounded-full bg-opacity-60 shadow-sm">
                        {new Date().toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>

                {(() => {
                    const renderedCompletedIndices = new Set<number>();

                    return messages.filter(m => m.role !== 'system' && !m.hidden).map((m, i, arr) => {
                        const isUser = m.role === 'user';
                        // Determine content display
                        let displayContent = m.content;
                        let subContent = '';
                        // Mission Logic
                        const newCompletedMissionsInThisTurn: string[] = [];

                        // Feedback logic: Look ahead for assistant's response if this is a user message
                        let feedback: { explanation?: string; correctForm?: string; betterExpression?: string; contextFeedback?: string } | null = null;
                        if (isUser && i + 1 < arr.length) {
                            const nextMsg = arr[i + 1];
                            if (nextMsg.role !== 'user' && nextMsg.parsed) {
                                // Feedback Check - use new fields (grammatically_correct, contextually_appropriate) in addition to correct
                                const hasGrammarError = nextMsg.parsed.grammatically_correct === 'No';
                                const hasContextError = nextMsg.parsed.contextually_appropriate === 'No';
                                const isIncorrect = nextMsg.parsed.correct === 'No';

                                if (isIncorrect || hasGrammarError || hasContextError) {
                                    feedback = {
                                        explanation: nextMsg.parsed.correction_explanation || nextMsg.parsed.correction_expression,
                                        correctForm: nextMsg.parsed.correct_answer_ko,
                                        betterExpression: nextMsg.parsed.better_expression_ko,
                                        contextFeedback: nextMsg.parsed.context_feedback
                                    };
                                }

                                // Mission Check
                                missions.forEach((mission, idx) => {
                                    if ((nextMsg.parsed as any)[`mission_complete_${idx}`] === 'Yes') {
                                        if (!renderedCompletedIndices.has(idx)) {
                                            newCompletedMissionsInThisTurn.push(mission);
                                            renderedCompletedIndices.add(idx);
                                        }
                                    }
                                });
                            }
                        }

                        // Also update rendered indices for THIS message if it's an AI message that claims completion
                        if (!isUser && m.parsed) {
                            missions.forEach((mission, idx) => {
                                if ((m.parsed as any)[`mission_complete_${idx}`] === 'Yes') {
                                    renderedCompletedIndices.add(idx);
                                }
                            });
                        }


                        if (!isUser && m.parsed) {
                            displayContent = m.parsed.ko || m.parsed.message || m.parsed.answer || m.parsed.content || JSON.stringify(m.parsed); // Fallback
                            subContent = m.parsed.vn || ''; // Sub is VN
                        }

                        // Time formatting
                        const timeString = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });

                        return (
                            <div key={i} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                {!isUser && (
                                    <div className="flex flex-col items-center mr-2 self-start">
                                        <div className="w-9 h-9 rounded-[14px] bg-white border border-gray-100 flex items-center justify-center mb-1 overflow-hidden shadow-sm">
                                            {/* Profile Image Placeholder */}
                                            <Bot size={20} className="text-[#3b1e1e]" />
                                        </div>
                                    </div>
                                )}

                                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                    {!isUser && (
                                        <span className="text-[11px] text-[#3b1e1e] opacity-70 mb-1 ml-1">AI Tutor</span>
                                    )}

                                    <div className="flex items-end gap-1.5 direction-rtl">
                                        {/* Timestamp for User (formatted to appear to the left of bubble) */}
                                        {isUser && <span className="text-[10px] text-[#526372] whitespace-nowrap mb-0.5">{timeString}</span>}

                                        <div
                                            className={`relative px-3.5 py-2.5 text-sm shadow-sm leading-relaxed whitespace-pre-wrap break-words ${isUser
                                                ? 'bg-[#fee500] text-black rounded-lg rounded-tr-sm'
                                                : 'bg-white text-black rounded-lg rounded-tl-sm'
                                                }`}
                                        >
                                            <div className="text-[13px]">{displayContent}</div>
                                            {subContent && (
                                                <div className={`text-[12px] mt-2 pt-2 border-t font-medium ${isUser ? 'border-black/10 text-black/60' : 'border-gray-100 text-gray-400'}`}>
                                                    {subContent}
                                                </div>
                                            )}

                                            {/* Listen Again Button */}
                                            {!isUser && isTtsEnabled && m.audioUrl && (
                                                <button
                                                    onClick={() => playAudio(m.audioUrl!)}
                                                    className="mt-2 flex items-center gap-1 text-xs text-blue-500 font-bold hover:text-blue-600 transition-colors"
                                                >
                                                    <PlayCircle size={14} />
                                                    다시 듣기
                                                </button>
                                            )}
                                        </div>

                                        {/* Timestamp for AI (formatted to appear to the right of bubble) */}
                                        {!isUser && <span className="text-[10px] text-[#526372] whitespace-nowrap mb-0.5">{timeString}</span>}
                                    </div>

                                    {/* Unified Feedback Bubble */}
                                    {feedback && (
                                        <div className={`mt-2 bg-white/90 backdrop-blur-sm rounded-xl border shadow-sm overflow-hidden w-full ${(feedback.correctForm || feedback.explanation) ? 'border-red-100' : 'border-amber-100'
                                            }`}>
                                            <div className="p-3">
                                                {/* 1. Grammar Correction Section */}
                                                {(feedback.correctForm || feedback.explanation) && (
                                                    <div className="mb-3 last:mb-0">
                                                        <div className="flex items-center gap-1.5 font-bold text-red-600 text-xs mb-1.5">
                                                            <AlertCircle size={14} />
                                                            <span>Correction</span>
                                                        </div>
                                                        {feedback.correctForm && (
                                                            <div className="text-sm font-bold text-gray-900 mb-1.5">
                                                                ✅ {feedback.correctForm}
                                                            </div>
                                                        )}
                                                        {feedback.explanation && (
                                                            <div className="text-xs text-gray-600 leading-snug">
                                                                {feedback.explanation}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Divider if both exist */}
                                                {(feedback.correctForm || feedback.explanation) && (feedback.betterExpression || feedback.contextFeedback) && (
                                                    <div className="h-px bg-gray-100 my-2" />
                                                )}

                                                {/* 2. Context/Better Expression Section */}
                                                {(feedback.betterExpression || feedback.contextFeedback) && (
                                                    <div className="mb-0">
                                                        <div className="flex items-center gap-1.5 font-bold text-amber-600 text-xs mb-1.5">
                                                            <Globe size={14} />
                                                            <span>Better Expression</span>
                                                        </div>
                                                        {feedback.betterExpression && (
                                                            <div className="text-sm font-bold text-gray-900 mb-1.5">
                                                                ✨ {feedback.betterExpression}
                                                            </div>
                                                        )}
                                                        {feedback.contextFeedback && (
                                                            <div className="text-xs text-gray-600 leading-snug">
                                                                {feedback.contextFeedback}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Mission Complete Badge */}
                                    {newCompletedMissionsInThisTurn.length > 0 && (
                                        <div className="mt-2 animate-in fade-in slide-in-from-bottom-1 duration-500 delay-150">
                                            {newCompletedMissionsInThisTurn.map((mission, idx) => (
                                                <div key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-green-200 text-green-700 text-xs font-bold rounded-full shadow-sm">
                                                    <CheckCircle2 size={12} className="text-green-600" />
                                                    <span>Mission Complete!</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    });
                })()}
                {isLoading && (
                    <div className="flex w-full justify-start mb-3">
                        <div className="flex flex-col items-center mr-2 self-start">
                            <div className="w-9 h-9 rounded-[14px] bg-white border border-gray-100 flex items-center justify-center mb-1 overflow-hidden shadow-sm">
                                <Bot size={20} className="text-[#3b1e1e]" />
                            </div>
                        </div>
                        <div className="bg-white px-4 py-3 rounded-lg rounded-tl-sm shadow-sm border border-transparent">
                            <div className="flex gap-1.5 align-middle h-full items-center">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* Session Ended Banner */}
            {sessionEnded && (
                <div className="bg-indigo-50 border-t border-indigo-200 px-4 py-3 text-center flex flex-col items-center gap-2">
                    <div className="text-sm font-bold text-indigo-700">🎉 대화가 종료되었습니다!</div>
                    <div className="text-xs text-indigo-500 mb-1">최대 턴 수에 도달했습니다. 대화 내용을 확인해보세요.</div>
                    <button
                        onClick={onReset}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors"
                    >
                        <RotateCcw size={16} />
                        다시 대화하기
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className={`bg-white p-3 pb-safe-area flex items-center gap-2 border-t border-gray-100 ${sessionEnded ? 'opacity-50 pointer-events-none' : ''}`}>
                <button
                    onClick={() => {/* Attachment menu mock */ }}
                    className="p-2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                    <Square size={20} className="rounded-md border-2 border-current p-0.5" />
                </button>

                <div className="flex-1 bg-gray-100 rounded-full flex items-center px-4 py-2 border border-transparent focus-within:border-gray-200 focus-within:bg-gray-50 transition-all">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e as any);
                            }
                        }}
                        placeholder={sessionEnded ? "대화가 종료되었습니다" : (isProcessingStt ? "Listening..." : "메시지 보내기")}
                        disabled={isProcessingStt || sessionEnded}
                        className="flex-1 bg-transparent text-[15px] border-none focus:ring-0 p-0 placeholder-gray-400 text-gray-900"
                    />
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={toggleRecording}
                        disabled={isProcessingStt || sessionEnded}
                        className={`p-2 rounded-full transition-all ${isListening
                            ? 'text-red-500 animate-pulse'
                            : 'text-gray-300 hover:text-gray-500'
                            }`}
                    >
                        {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>

                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e as any)}
                        disabled={!input.trim() || isLoading || isProcessingStt || sessionEnded}
                        className={`p-2 rounded transition-all ${input.trim() && !sessionEnded
                            ? 'bg-[#fee500] text-black hover:bg-[#fdd835]'
                            : 'bg-gray-100 text-gray-300'
                            }`}
                        title="Send"
                    >
                        <Send size={18} className={input.trim() ? "translate-x-0.5" : ""} />
                    </button>
                </div>
            </div>
        </div>
    );
}
