"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

export type SpeakerState = "idle" | "speaking" | "listening" | "thinking" | "error";

interface SpeakerCharacterProps {
    state: SpeakerState;
    onPTTStart?: () => void;
    onPTTEnd?: () => void;
}

export default function SpeakerCharacter({ state, onPTTStart, onPTTEnd }: SpeakerCharacterProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPressed, setIsPressed] = useState(false);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(console.error);
        }
    }, []);

    const handlePointerDown = () => {
        setIsPressed(true);
        onPTTStart?.();
    };

    const handlePointerUp = () => {
        setIsPressed(false);
        onPTTEnd?.();
    };

    // Glow effect when it's the user's turn (listening) or while being pressed
    const showGlow = state === "listening" || isPressed;
    const glowClass = showGlow 
        ? "drop-shadow-[0_0_30px_rgba(59,130,246,0.8)] scale-105" 
        : "scale-100";

    return (
        <div 
            className="relative w-[480px] h-[480px] transition-all duration-300 bg-transparent cursor-pointer touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp} // Stop if finger/mouse leaves the area
        >
            <video
                ref={videoRef}
                src="/RB.mp4"
                autoPlay
                loop
                muted
                playsInline
                className={`w-full h-full object-contain transition-all duration-500 ease-out ${glowClass}`}
                style={{
                    WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 60%)',
                    maskImage: 'radial-gradient(circle at center, black 40%, transparent 60%)'
                }}
            />

            {/* Pulsing glow ring background when listening */}
            {showGlow && (
                <div className="absolute inset-0 -z-10 rounded-full bg-blue-400/20 animate-ping" />
            )}

            {state === 'listening' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-500 rounded-full p-3 shadow-2xl animate-bounce">
                    <Mic className="w-8 h-8 text-white" />
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/70 text-white text-xs px-2 py-1 rounded">
                        길게 눌러서 말해요!
                    </div>
                </div>
            )}
            
            {isPressed && (
                <div className="absolute inset-0 border-4 border-blue-400 rounded-full animate-pulse pointer-events-none" />
            )}
        </div>
    );
}
