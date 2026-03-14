"use client";

import { useState, useRef, useCallback } from 'react';

interface UseRealtimeVoiceProps {
    cardId: string;
    cardType?: string;
    systemPrompt: string;
    voice: string;
    temperature: number;
    onTextDelta?: (text: string) => void;
    onAudioStarted?: () => void;
    onAudioEnded?: () => void;
    onUserSpeaking?: (isSpeaking: boolean) => void;
    tools?: any[];
    // respond() sends the function output back to the model and triggers the next response.
    // Call it (optionally after a short delay) once you have processed the tool call.
    onFunctionCall?: (name: string, args: Record<string, unknown>, respond: (output: string) => void) => void;
    onError?: (error: Error) => void;
    manualMicControl?: boolean;
}

export function useRealtimeVoice({
    cardId,
    cardType,
    systemPrompt,
    voice,
    temperature,
    onTextDelta,
    onAudioStarted,
    onAudioEnded,
    onUserSpeaking,
    tools,
    onFunctionCall,
    onError,
    manualMicControl = false
}: UseRealtimeVoiceProps) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [micError, setMicError] = useState<string | null>(null);
    const [isMicOpen, setIsMicOpen] = useState(false);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const audioElRef = useRef<HTMLAudioElement | null>(null);
    // Tracks whether AI audio is currently streaming (resets per response)
    const audioActiveRef = useRef(false);
    // Timer to delay onAudioEnded so buffered audio can finish playing
    const responseEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Tracks the function call being streamed (name + call_id)
    const pendingFunctionCallRef = useRef<{ name: string; callId: string } | null>(null);
    // Always-current ref so the message handler never captures a stale callback
    const onFunctionCallRef = useRef(onFunctionCall);
    onFunctionCallRef.current = onFunctionCall;

    const setMicEnabled = useCallback((enabled: boolean) => {
        if (localAudioTrackRef.current) {
            localAudioTrackRef.current.enabled = enabled;
            setIsMicOpen(enabled);
        }
    }, []);

    const connect = useCallback(async () => {
        if (isConnected || isConnecting) return;
        setIsConnecting(true);

        try {
            // ─── STEP 1: Capture microphone FIRST ────────────────────────────────
            // iOS Safari/Chrome require getUserMedia to be called as close to the
            // user gesture as possible. Calling it after an await fetch() causes
            // iOS to lose the user-gesture activation token and silently deny access.
            let localStream: MediaStream | null = null;
            try {
                setMicError(null);
                localStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    }
                });
                localStreamRef.current = localStream;
                localAudioTrackRef.current = localStream.getAudioTracks()[0];
            } catch (err: any) {
                console.warn("Microphone access denied or not available", err);
                const msg = err?.name === "NotAllowedError"
                    ? "마이크 권한이 거부됐어요. 브라우저 주소창 옆 자물쇠 아이콘에서 마이크를 허용해주세요."
                    : "마이크를 사용할 수 없어요. 텍스트로 대화할 수 있습니다.";
                setMicError(msg);
                // Continue without mic — text-only mode remains available
            }

            // ─── STEP 2: Get an ephemeral session token from our Next.js backend ─
            const tokenResponse = await fetch('/api/realtime', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    card_id: cardId,
                    card_type: cardType,
                    system_prompt: systemPrompt,
                    voice_openai: voice,
                    temperature: temperature,
                    tools: tools
                })
            });

            if (!tokenResponse.ok) throw new Error("Failed to get ephemeral token");

            const data = await tokenResponse.json();
            const EPHEMERAL_KEY = data.client_secret.value;

            // ─── STEP 3: Setup WebRTC Peer Connection ────────────────────────────
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            // Detect ICE/DTLS failures so we can surface an error instead of hanging
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'failed') {
                    setIsConnecting(false);
                    if (onError) onError(new Error("WebRTC connection failed — check network or mic permissions"));
                }
            };

            // ─── STEP 4: Create Audio Element for AI output ──────────────────────
            // iOS requires:
            //   • playsinline — prevents fullscreen player takeover
            //   • explicit .play() after srcObject is set — autoplay alone is not
            //     honoured for MediaStream on iOS Safari/Chrome
            const audioEl = document.createElement("audio");
            audioEl.autoplay = true;
            audioEl.setAttribute("playsinline", "");
            audioEl.style.display = "none";
            document.body.appendChild(audioEl);
            audioElRef.current = audioEl;

            pc.ontrack = (e) => {
                if (e.track.kind === 'audio') {
                    audioEl.srcObject = e.streams[0];
                    // Explicitly call play() — iOS Safari will not autoplay a
                    // MediaStream even when the autoplay attribute is set.
                    audioEl.play().catch(err => console.warn("WebRTC audio play failed:", err));
                }
            };

            audioEl.onended = () => {
                if (onAudioEnded) onAudioEnded();
            };

            // ─── STEP 5: Open Data Channel for sending events ────────────────────
            const dc = pc.createDataChannel("oai-events");
            dcRef.current = dc;

            // CRITICAL: only declare "connected" once the data channel is actually open.
            dc.addEventListener("open", () => {
                setIsConnected(true);
                setIsConnecting(false);
                if (localAudioTrackRef.current) {
                    // In manual mode, start disabled. In auto mode, start enabled.
                    if (manualMicControl) {
                        localAudioTrackRef.current.enabled = false;
                        setIsMicOpen(false);
                    } else {
                        localAudioTrackRef.current.enabled = true;
                        setIsMicOpen(true);
                    }
                }
                console.log("WebRTC data channel open — session ready.");
            });

            dc.addEventListener("message", (e) => {
                try {
                    const event = JSON.parse(e.data);

                    // ── User voice activity ──────────────────────────────────────
                    if (event.type === 'input_audio_buffer.speech_started') {
                        if (responseEndTimerRef.current) {
                            clearTimeout(responseEndTimerRef.current);
                            responseEndTimerRef.current = null;
                        }
                        if (onUserSpeaking) onUserSpeaking(true);
                    }
                    if (event.type === 'input_audio_buffer.speech_stopped') {
                        if (onUserSpeaking) onUserSpeaking(false);
                        setIsThinking(true);
                    }

                    // ── AI response lifecycle ────────────────────────────────────
                    if (event.type === 'response.created') {
                        audioActiveRef.current = false; // reset for new response
                        if (responseEndTimerRef.current) {
                            clearTimeout(responseEndTimerRef.current);
                            responseEndTimerRef.current = null;
                        }
                        setIsThinking(true);
                        // Disable mic while AI is processing or speaking
                        if (localAudioTrackRef.current) {
                            localAudioTrackRef.current.enabled = false;
                            setIsMicOpen(false);
                        }
                    }

                    if (event.type === 'response.output_item.added' && event.item?.type === 'message') {
                        if (!audioActiveRef.current) {
                            audioActiveRef.current = true;
                            setIsThinking(false);
                            if (onAudioStarted) onAudioStarted();
                        }
                    }

                    if (event.type === 'response.audio_transcript.delta' && onTextDelta) {
                        onTextDelta(event.delta);
                    }

                    // Response fully generated — wait a bit for buffered audio to finish
                    if (event.type === 'response.done') {
                        responseEndTimerRef.current = setTimeout(() => {
                            audioActiveRef.current = false;
                            setIsThinking(false);
                            if (localAudioTrackRef.current && !manualMicControl) {
                                localAudioTrackRef.current.enabled = true;
                                setIsMicOpen(true);
                            }
                            if (onAudioEnded) onAudioEnded();
                        }, 400);
                    }

                    // ── Function / tool calling ──────────────────────────────────
                    if (event.type === 'response.output_item.added' && event.item?.type === 'function_call') {
                        pendingFunctionCallRef.current = {
                            name: event.item.name,
                            callId: event.item.call_id,
                        };
                    }
                    if (event.type === 'response.function_call_arguments.done') {
                        const pending = pendingFunctionCallRef.current;
                        const handler = onFunctionCallRef.current;
                        if (pending && handler) {
                            try {
                                const args = JSON.parse(event.arguments || '{}') as Record<string, unknown>;
                                const callId = pending.callId;
                                const respond = (output: string) => {
                                    if (!dcRef.current || dcRef.current.readyState !== 'open') return;
                                    dcRef.current.send(JSON.stringify({
                                        type: 'conversation.item.create',
                                        item: { type: 'function_call_output', call_id: callId, output }
                                    }));
                                    dcRef.current.send(JSON.stringify({ type: 'response.create' }));
                                };
                                handler(pending.name, args, respond);
                            } catch {
                                console.error('Failed to parse function call args:', event.arguments);
                            }
                        }
                        pendingFunctionCallRef.current = null;
                    }

                    if (event.type === 'error') {
                        console.error("OpenAI Realtime Error:", event.error);
                        if (onError) onError(new Error(event.error.message));
                    }
                } catch (err) {
                    console.error("Failed to parse event", e.data);
                }
            });

            // ─── STEP 6: Add pre-acquired mic tracks to the peer connection ──────
            // Tracks must be added before createOffer() so they are included in SDP.
            if (localStream) {
                localStream.getTracks().forEach((track) => pc.addTrack(track, localStream!));
            }

            // ─── STEP 7: Create Offer and Send it to OpenAI WebRTC Endpoint ─────
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const baseUrl = "https://api.openai.com/v1/realtime";
            const model = "gpt-4o-mini-realtime-preview";

            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${EPHEMERAL_KEY}`,
                    "Content-Type": "application/sdp"
                },
            });

            if (!sdpResponse.ok) {
                const errText = await sdpResponse.ok ? "" : await sdpResponse.text();
                throw new Error("Failed to connect SDP: " + errText);
            }

            const answer = {
                type: "answer" as RTCSdpType,
                sdp: await sdpResponse.text(),
            };

            await pc.setRemoteDescription(answer);

        } catch (error: any) {
            console.error("Failed to connect to Realtime API", error);
            setIsConnecting(false);
            if (onError) onError(error);
        }
    }, [cardId, cardType, systemPrompt, voice, temperature, tools, isConnected, isConnecting, onAudioStarted, onAudioEnded, onUserSpeaking, onTextDelta, onError, manualMicControl]);


    const disconnect = useCallback(() => {
        if (responseEndTimerRef.current) {
            clearTimeout(responseEndTimerRef.current);
            responseEndTimerRef.current = null;
        }
        audioActiveRef.current = false;
        pendingFunctionCallRef.current = null;

        if (localAudioTrackRef.current) {
            localAudioTrackRef.current.stop();
            localAudioTrackRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (dcRef.current) {
            dcRef.current.close();
            dcRef.current = null;
        }
        if (audioElRef.current) {
            audioElRef.current.srcObject = null;
            audioElRef.current.remove();
            audioElRef.current = null;
        }
        setIsConnected(false);
        setIsThinking(false);
        setIsMicOpen(false);
    }, []);

    const sendMessage = useCallback((type: string, payload: any = {}) => {
        if (!dcRef.current || dcRef.current.readyState !== "open") {
            console.warn("Data channel not open. Cannot send:", type);
            return;
        }
        dcRef.current.send(JSON.stringify({ type, ...payload }));
    }, []);

    const updateContext = useCallback((newPrompt: string) => {
        sendMessage('session.update', {
            session: { instructions: newPrompt }
        });
    }, [sendMessage]);

    const sendTextMessage = useCallback((text: string) => {
        sendMessage('conversation.item.create', {
            item: {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text }]
            }
        });
        sendMessage('response.create');
        setIsThinking(true);
    }, [sendMessage]);

    return {
        connect,
        disconnect,
        sendMessage,
        sendTextMessage,
        updateContext,
        setMicEnabled,
        isConnecting,
        isConnected,
        isThinking,
        isMicOpen,
        micError
    };
}
