'use client'

import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, Star } from 'lucide-react';
import { DictEntry, searchDictionary } from '../app/actions_dict';

// Module-level cache to persist across component mounts and prevent Strict Mode double-fetches
const dictCache: Record<string, DictEntry[]> = {};
const pendingRequests: Record<string, Promise<any>> = {};

interface DictionaryTooltipProps {
    word: string;
    initialData?: DictEntry[];
    onDataLoaded?: (data: DictEntry[]) => void;
    onClose?: () => void;
}

export default function DictionaryTooltip({ word, initialData, onDataLoaded, onClose }: DictionaryTooltipProps) {
    const [data, setData] = useState<DictEntry[] | null>(initialData || dictCache[word] || null);
    const [loading, setLoading] = useState<boolean>(!initialData && !dictCache[word]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // If we have initialData or it's already in our module cache, don't fetch
        if (initialData) {
            dictCache[word] = initialData;
            setData(initialData);
            setLoading(false);
            return;
        }

        if (dictCache[word]) {
            setData(dictCache[word]);
            setLoading(false);
            onDataLoaded?.(dictCache[word]);
            return;
        }

        async function fetchInfo() {
            // Prevent multiple simultaneous requests for the same word (Strict Mode fix)
            const existingRequest = pendingRequests[word];
            if (existingRequest) {
                const result = await existingRequest;
                if (result.success && result.data) {
                    setData(result.data);
                    onDataLoaded?.(result.data);
                }
                setLoading(false);
                return;
            }

            setLoading(true);
            const request = searchDictionary(word);
            pendingRequests[word] = request;

            try {
                const result = await request;
                if (result.success && result.data) {
                    dictCache[word] = result.data;
                    setData(result.data);
                    onDataLoaded?.(result.data);
                } else {
                    setError(result.error || "Failed to load dictionary data");
                }
            } catch (err) {
                setError("Network error");
            } finally {
                delete pendingRequests[word];
                setLoading(false);
            }
        }

        fetchInfo();
    }, [word, initialData, onDataLoaded]);

    if (loading) return (
        <div className="p-4 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl w-64 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
    );

    if (error || !data || data.length === 0) return (
        <div className="p-4 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl w-64 text-sm text-gray-500">
            {error || "단어를 찾을 수 없습니다."}
        </div>
    );

    // Show the first search result
    const entry = data[0];

    return (
        <div className="p-5 bg-white/95 backdrop-blur-lg border border-gray-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-[320px] text-gray-800 z-50">
            <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-2">
                <div className="flex items-baseline gap-2">
                    <h3 className="text-xl font-bold text-gray-900">{entry.word}</h3>
                    <span className="text-xs text-gray-400 font-medium">
                        「{entry.pos}{entry.posVn ? ` · ${entry.posVn}` : ''}」
                    </span>
                </div>
                <div className="flex items-center gap-1 text-orange-400">
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
                {entry.pronunciation && (
                    <span className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100 font-medium">
                        [{entry.pronunciation}]
                    </span>
                )}
            </div>

            <div className="space-y-4">
                {entry.senses.map((sense, idx) => (
                    <div key={idx} className="border-t border-gray-50 pt-3 first:border-0 first:pt-0">
                        <div className="flex gap-2">
                            <span className="text-sm font-bold text-gray-400">{sense.order}.</span>
                            <div className="space-y-1">
                                {sense.translation && (
                                    <div className="mb-2">
                                        <p className="text-sm font-bold text-blue-700">{sense.translation.word}</p>
                                        <p className="text-[11px] leading-relaxed text-blue-500">
                                            {sense.translation.definition}
                                        </p>
                                    </div>
                                )}
                                <p className="text-xs leading-relaxed text-gray-600">{sense.definition}</p>
                                {sense.example && (
                                    <div className="mt-2 p-2 bg-gray-50 border-l-2 border-blue-200 rounded-r">
                                        <div className="flex items-center gap-1 mb-1">
                                            <BookOpen size={10} className="text-blue-500" />
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Ví dụ</span>
                                        </div>
                                        <p className="text-xs text-gray-700 leading-relaxed font-medium">
                                            {sense.example}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
