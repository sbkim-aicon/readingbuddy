"use client";

import { useEffect, useRef } from "react";
import { Mic } from "lucide-react";

export type SpeakerState = "idle" | "speaking" | "listening" | "thinking" | "error";

interface SpeakerCharacterProps {
    state: SpeakerState;
}

export default function SpeakerCharacter({ state }: SpeakerCharacterProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(console.error);
        }
    }, []);

    const glowClass = {
        idle: "border-transparent",
        speaking: "border-transparent", // Removed blue glow
        listening: "border-transparent", // Removed green glow
        thinking: "border-transparent", // Removed yellow glow
        error: "border-transparent" // Removed red glow
    }[state];

    return (
        <div className={`relative w-[480px] h-[480px] transition-all duration-300 bg-transparent`}>
            <video
                ref={videoRef}
                src="/RB.mp4"
                autoPlay
                loop
                muted
                playsInline
                className={`w-full h-full object-contain transition-all duration-300 ${glowClass}`}
                style={{
                    WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 60%)',
                    maskImage: 'radial-gradient(circle at center, black 40%, transparent 60%)'
                }}
            />


            {state === 'listening' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500 rounded-full p-2.5 animate-pulse shadow-lg">
                    <Mic className="w-6 h-6 text-white" />
                </div>
            )}
        </div>
    );
}
