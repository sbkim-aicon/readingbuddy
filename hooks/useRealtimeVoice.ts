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
    onError
}: UseRealtimeVoiceProps) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isThinking, setIsThinking] = useState(false);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const audioElRef = useRef<HTMLAudioElement | null>(null);

    const connect = useCallback(async () => {
        if (isConnected || isConnecting) return;
        setIsConnecting(true);
        console.log("Connecting to OpenAI Realtime WebRTC API...");

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

            // Create Audio Element for AI output and append to DOM
            // (Required for reliable autoplay in Safari and some Chromium browsers)
            const audioEl = document.createElement("audio");
            audioEl.autoplay = true;
            audioEl.style.display = "none";
            document.body.appendChild(audioEl);
            audioElRef.current = audioEl;

            pc.ontrack = (e) => {
                if (e.track.kind === 'audio') {
                    console.log("Audio track received from OpenAI");
                    audioEl.srcObject = e.streams[0];
                    if (onAudioStarted) onAudioStarted();
                }
            };

            audioEl.onended = () => {
                if (onAudioEnded) onAudioEnded();
            };
            audioEl.onpause = () => {
                if (onAudioEnded) onAudioEnded();
            };

            // 3. Open Data Channel for sending events (like JSON instructions)
            const dc = pc.createDataChannel("oai-events");
            dcRef.current = dc;

            dc.addEventListener("message", (e) => {
                try {
                    const event = JSON.parse(e.data);

                    // console.log("Realtime Event:", event.type); // Optional Debugging

                    if (event.type === 'response.audio_transcript.delta' && onTextDelta) {
                        onTextDelta(event.delta);
                    }
                    if (event.type === 'response.created' || event.type === 'response.content_part.added') {
                        setIsThinking(true);
                    }
                    if (event.type === 'response.done' || event.type === 'response.output_item.done') {
                        setIsThinking(false);
                        if (onAudioEnded) onAudioEnded(); // Ensure UI returns to listening
                    }
                    if (event.type === 'error') {
                        console.error("OpenAI WebSocket Error:", event.error);
                        if (onError) onError(new Error(event.error.message));
                    }
                } catch (err) {
                    console.error("Failed to parse event", e.data);
                }
            });

            // 4. Capture local microphone audio and add to Peer Connection
            try {
                const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
                ms.getTracks().forEach((track) => {
                    pc.addTrack(track, ms);
                });
            } catch (err) {
                console.warn("Microphone access denied or not available", err);
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

            await pc.setRemoteDescription(answer);

            setIsConnected(true);
            setIsConnecting(false);
            console.log("WebRTC Connected successfully.");

        } catch (error: any) {
            console.error("Failed to connect to Realtime API", error);
            setIsConnecting(false);
            if (onError) onError(error);
        }
    }, [cardId, systemPrompt, voice, temperature, isConnected, isConnecting, onAudioStarted, onAudioEnded, onTextDelta, onError]);


    const disconnect = useCallback(() => {
        console.log("Disconnecting WebRTC...");
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

    // Send a message over the data channel (e.g., text, or to trigger a state change)
    const sendMessage = useCallback((type: string, payload: any = {}) => {
        if (!dcRef.current || dcRef.current.readyState !== "open") {
            console.warn("Data channel not open. Cannot send:", type);
            return;
        }
        const event = {
            type,
            ...payload
        };
        dcRef.current.send(JSON.stringify(event));
    }, []);

    const updateContext = useCallback((newPrompt: string) => {
        // Update the session instructions live while connected
        sendMessage('session.update', {
            session: {
                instructions: newPrompt
            }
        });
    }, [sendMessage]);


    const sendTextMessage = useCallback((text: string) => {
        // Send user text message and trigger a response
        sendMessage('conversation.item.create', {
            item: {
                type: "message",
                role: "user",
                content: [
                    { type: "input_text", text }
                ]
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
        isThinking
    };
}
