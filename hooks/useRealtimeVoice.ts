"use client";

import { useState, useRef, useCallback } from 'react';

interface UseRealtimeVoiceProps {
    cardId: string;
    systemPrompt: string;
    voice: string;
    temperature: number;
    onTextDelta?: (text: string) => void;
    onAudioStarted?: () => void;
    onAudioEnded?: () => void;
    onUserSpeaking?: (isSpeaking: boolean) => void;
    onError?: (error: Error) => void;
}

export function useRealtimeVoice({
    cardId,
    systemPrompt,
    voice,
    temperature,
    onTextDelta,
    onAudioStarted,
    onAudioEnded,
    onUserSpeaking,
    onError
}: UseRealtimeVoiceProps) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [micError, setMicError] = useState<string | null>(null);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const audioElRef = useRef<HTMLAudioElement | null>(null);
    // Tracks whether AI audio is currently streaming (resets per response)
    const audioActiveRef = useRef(false);
    // Timer to delay onAudioEnded so buffered audio can finish playing
    const responseEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(async () => {
        if (isConnected || isConnecting) return;
        setIsConnecting(true);

        try {
            // 1. Get an ephemeral session token from our Next.js backend
            const tokenResponse = await fetch('/api/realtime', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    card_id: cardId,
                    system_prompt: systemPrompt,
                    voice_openai: voice,
                    temperature: temperature
                })
            });

            if (!tokenResponse.ok) throw new Error("Failed to get ephemeral token");

            const data = await tokenResponse.json();
            const EPHEMERAL_KEY = data.client_secret.value;

            // 2. Setup WebRTC Peer Connection
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            // Detect ICE/DTLS failures so we can surface an error instead of hanging
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'failed') {
                    setIsConnecting(false);
                    if (onError) onError(new Error("WebRTC connection failed — check network or mic permissions"));
                }
            };

            // Create Audio Element for AI output and append to DOM
            const audioEl = document.createElement("audio");
            audioEl.autoplay = true;
            audioEl.setAttribute("playsinline", ""); // Required for iOS inline playback
            audioEl.style.display = "none";
            document.body.appendChild(audioEl);
            audioElRef.current = audioEl;

            pc.ontrack = (e) => {
                if (e.track.kind === 'audio') {
                    audioEl.srcObject = e.streams[0];
                    // Explicit play() required on iOS Safari — autoplay alone is not enough
                    audioEl.play().catch(err => console.warn("WebRTC audio play failed:", err));
                }
            };

            // 3. Open Data Channel for sending events
            const dc = pc.createDataChannel("oai-events");
            dcRef.current = dc;

            // CRITICAL: only declare "connected" once the data channel is actually open.
            // setRemoteDescription() completes before ICE+DTLS finishes, so the data
            // channel readyState is still "connecting" at that point. Sending a message
            // there would silently fail (the channel drops messages when not open).
            dc.addEventListener("open", () => {
                // Match the VAD settings from session creation and enable noise reduction.
                // (session.update is needed because the sessions API doesn't expose
                //  input_audio_noise_reduction at creation time.)
                dc.send(JSON.stringify({
                    type: 'session.update',
                    session: {
                        turn_detection: {
                            type: "server_vad",
                            threshold: 0.6,
                            prefix_padding_ms: 300,
                            silence_duration_ms: 1200,
                            create_response: true,
                        },
                        input_audio_noise_reduction: { type: "near_field" },
                    }
                }));

                setIsConnected(true);
                setIsConnecting(false);
                console.log("WebRTC data channel open — session ready.");
            });

            dc.addEventListener("message", (e) => {
                try {
                    const event = JSON.parse(e.data);

                    // User voice activity
                    if (event.type === 'input_audio_buffer.speech_started') {
                        // Cancel any pending end-of-response timer (AI was interrupted)
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

                    // AI response lifecycle
                    if (event.type === 'response.created') {
                        audioActiveRef.current = false; // reset for new response
                        if (responseEndTimerRef.current) {
                            clearTimeout(responseEndTimerRef.current);
                            responseEndTimerRef.current = null;
                        }
                        setIsThinking(true);
                    }

                    // First audio chunk of a response → AI started speaking
                    if (event.type === 'response.audio.delta') {
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
                            if (onAudioEnded) onAudioEnded();
                        }, 400);
                    }

                    if (event.type === 'error') {
                        console.error("OpenAI Realtime Error:", event.error);
                        if (onError) onError(new Error(event.error.message));
                    }
                } catch (err) {
                    console.error("Failed to parse event", e.data);
                }
            });

            // 4. Capture local microphone audio
            try {
                setMicError(null);
                const ms = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    }
                });
                ms.getTracks().forEach((track) => pc.addTrack(track, ms));
            } catch (err: any) {
                // Mic denied — continue; text input + AI voice output still work
                console.warn("Microphone access denied or not available", err);
                const msg = err?.name === "NotAllowedError"
                    ? "마이크 권한이 거부됐어요. 브라우저 주소창 옆 자물쇠 아이콘에서 마이크를 허용해주세요."
                    : "마이크를 사용할 수 없어요. 텍스트로 대화할 수 있습니다.";
                setMicError(msg);
            }

            // 5. Create Offer and Send it to OpenAI WebRTC Endpoint
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const baseUrl = "https://api.openai.com/v1/realtime";
            const model = "gpt-4o-realtime-preview-2024-12-17";

            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${EPHEMERAL_KEY}`,
                    "Content-Type": "application/sdp"
                },
            });

            if (!sdpResponse.ok) {
                const errText = await sdpResponse.text();
                throw new Error("Failed to connect SDP: " + errText);
            }

            const answer = {
                type: "answer" as RTCSdpType,
                sdp: await sdpResponse.text(),
            };

            // ICE + DTLS negotiation happens in the background after this.
            // setIsConnected(true) will be called from dc.onopen once the
            // data channel is actually ready to send.
            await pc.setRemoteDescription(answer);

        } catch (error: any) {
            console.error("Failed to connect to Realtime API", error);
            setIsConnecting(false);
            if (onError) onError(error);
        }
    }, [cardId, systemPrompt, voice, temperature, isConnected, isConnecting, onAudioStarted, onAudioEnded, onUserSpeaking, onTextDelta, onError]);


    const disconnect = useCallback(() => {
        if (responseEndTimerRef.current) {
            clearTimeout(responseEndTimerRef.current);
            responseEndTimerRef.current = null;
        }
        audioActiveRef.current = false;

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
        isConnecting,
        isConnected,
        isThinking,
        micError
    };
}
