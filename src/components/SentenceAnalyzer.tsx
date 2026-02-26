'use client'

import React, { useState, useRef, useEffect } from 'react';
import DictionaryTooltip from './DictionaryTooltip';
import { analyzeKoreanSentence, AnalyzedToken } from '../utils/kiwi_analyzer';

interface SentenceAnalyzerProps {
    sentence: string;
}

export default function SentenceAnalyzer({ sentence }: SentenceAnalyzerProps) {
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [tokens, setTokens] = useState<AnalyzedToken[]>([]);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleWordClick = (e: React.MouseEvent, idx: number) => {
        const token = tokens[idx];
        if (!token || !token.stem) return;

        const lemma = token.lemma;
        setSelectedIndex(idx);
        setSelectedWord(lemma);

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (containerRect) {
            setTooltipPos({
                top: rect.bottom - containerRect.top + 10,
                left: Math.min(
                    rect.left - containerRect.left,
                    containerRect.width - 320
                )
            });
        }
    };

    // Close tooltip on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setSelectedWord(null);
                setSelectedIndex(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Analyze sentence with Kiwi (No more bulk dictionary fetching)
    useEffect(() => {
        async function analyze() {
            try {
                const analyzedTokens = await analyzeKoreanSentence(sentence);
                setTokens(analyzedTokens);
            } catch (err) {
                console.error("Kiwi Analysis Error:", err);
            }
        }
        analyze();
    }, [sentence]);

    return (
        <div ref={containerRef} className="relative py-8 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[200px] whitespace-pre-wrap">
            <div className="text-2xl leading-relaxed tracking-wide text-gray-800">
                {tokens.map((token, idx) => {
                    if (token.pos === 'SPACE') {
                        return <span key={idx} className="whitespace-pre">{token.text}</span>;
                    }

                    if (!token.stem) {
                        return <span key={idx} className="text-gray-400">{token.text}</span>;
                    }

                    return (
                        <span key={idx} className="inline-flex items-baseline">
                            <span
                                onClick={(e) => handleWordClick(e, idx)}
                                className={`
                                    transition-all duration-200 cursor-pointer rounded px-0.5
                                    hover:text-blue-600 hover:bg-blue-50 hover:underline underline-offset-4 decoration-blue-200
                                    ${selectedIndex === idx ? 'text-blue-700 font-bold bg-blue-50 underline decoration-blue-400' : 'text-gray-800'}
                                `}
                            >
                                {token.stem}
                            </span>
                            <span className="text-gray-400">{token.particle}</span>
                        </span>
                    );
                })}
            </div>

            {selectedWord && (
                <div
                    className="absolute z-50 animate-in fade-in zoom-in duration-200"
                    key={selectedIndex} // Force re-mount or re-render when selection changes
                    style={{
                        top: `${tooltipPos.top}px`,
                        left: `${tooltipPos.left}px`
                    }}
                >
                    <DictionaryTooltip
                        word={selectedWord}
                        onClose={() => {
                            setSelectedWord(null);
                            setSelectedIndex(null);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
