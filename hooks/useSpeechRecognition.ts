"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechRecognitionProps {
    lang?: string;
    onResult?: (transcript: string) => void;
    onError?: (error: string) => void;
}

export function useSpeechRecognition({
    lang = 'ko-KR',
    onResult,
    onError,
}: UseSpeechRecognitionProps = {}) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<any>(null);
    const onResultRef = useRef(onResult);
    const onErrorRef = useRef(onError);
    onResultRef.current = onResult;
    onErrorRef.current = onError;

    useEffect(() => {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;
        setIsSupported(!!SpeechRecognition);
    }, []);

    const startListening = useCallback(() => {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            onErrorRef.current?.("이 브라우저는 음성 인식을 지원하지 않습니다.");
            return;
        }

        // Abort any in-progress recognition before starting a new one
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* ignore */ }
            recognitionRef.current = null;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.lang = lang;
        // continuous: false is more reliable on iOS Safari/Chrome
        recognition.continuous = false;
        // interimResults: false avoids partial-result issues on iOS
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0]?.[0]?.transcript?.trim();
            if (transcript) {
                onResultRef.current?.(transcript);
            }
        };

        recognition.onerror = (event: any) => {
            setIsListening(false);
            recognitionRef.current = null;
            // 'no-speech' and 'aborted' are benign — don't surface them to the user
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            if (event.error === 'not-allowed') {
                onErrorRef.current?.("마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해주세요.");
            } else {
                console.warn("Speech recognition error:", event.error);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;
        };

        try {
            recognition.start();
        } catch (e) {
            setIsListening(false);
            recognitionRef.current = null;
            console.warn("Failed to start speech recognition:", e);
        }
    }, [lang]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
            recognitionRef.current = null;
        }
        setIsListening(false);
    }, []);

    return { isListening, isSupported, startListening, stopListening };
}
