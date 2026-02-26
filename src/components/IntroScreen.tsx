'use client';

import React, { useState, useRef } from 'react';
import { Play, Globe, RotateCcw, Volume2, VolumeX, Upload, Loader2, ImageIcon } from 'lucide-react';
import { describePhoto } from '../app/actions_vision';

interface IntroContent {
    title: string;
    description: string;
}

interface IntroScreenProps {
    mode: 'roleplay' | 'photo' | 'free' | 'wrapup';
    introData: {
        ko: IntroContent;
        vn: IntroContent;
    };
    isTtsEnabled: boolean;
    onToggleTts: () => void;
    onReset: () => void;
    onStart: (photoDataUrl?: string, photoDescription?: string) => void;
    imageSrc?: string;
    keyword?: string;
}

export default function IntroScreen({ mode, introData, isTtsEnabled, onToggleTts, onReset, onStart, imageSrc, keyword }: IntroScreenProps) {
    const [lang, setLang] = useState<'ko' | 'vn'>('ko');
    const content = introData[lang];

    // Photo upload state (only for photo mode)
    const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
    const [photoDescription, setPhotoDescription] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAnalyzeError(null);
        setPhotoDescription(null);

        // Read as base64
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = ev.target?.result as string;
            setUploadedPhoto(dataUrl);
            setIsAnalyzing(true);
            try {
                const result = await describePhoto(dataUrl);
                if (result.success && result.description) {
                    setPhotoDescription(result.description);
                } else {
                    setAnalyzeError('사진 분석에 실패했습니다.');
                }
            } catch {
                setAnalyzeError('사진 분석 중 오류가 발생했습니다.');
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // The photo to display: uploaded > default
    const displayPhoto = uploadedPhoto || imageSrc;
    const canStart = mode !== 'photo' || !!displayPhoto;

    const handleStart = () => {
        if (mode === 'photo') {
            onStart(uploadedPhoto ?? undefined, photoDescription ?? undefined);
        } else {
            onStart();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-white p-6 text-center animate-in fade-in zoom-in-95 duration-300 relative overflow-y-auto">
            {/* Header Controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                {/* TTS Toggle */}
                <button
                    onClick={onToggleTts}
                    className={`p-2 rounded-full transition-colors ${isTtsEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}
                    title={isTtsEnabled ? "TTS On" : "TTS Off"}
                >
                    {isTtsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>

                {/* Reset Button */}
                <button
                    onClick={onReset}
                    className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                    title="Reset"
                >
                    <RotateCcw size={20} />
                </button>

                {/* Language Toggle */}
                <button
                    onClick={() => setLang(prev => prev === 'ko' ? 'vn' : 'ko')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-bold text-gray-600"
                >
                    <Globe size={14} />
                    <span>{lang === 'ko' ? 'KR' : 'VN'}</span>
                </button>
            </div>

            {/* Photo area */}
            {mode === 'photo' ? (
                <div className="mt-10 mb-4 flex flex-col items-center w-full">
                    {/* Upload zone */}
                    <div
                        className="w-full max-w-xs h-40 bg-gray-50 rounded-2xl overflow-hidden shadow-md border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-colors cursor-pointer relative group mb-3"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {displayPhoto ? (
                            <>
                                <img src={displayPhoto} alt="Topic" className="w-full h-full object-cover" />
                                {/* Hover overlay to re-upload */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                    <Upload size={20} className="text-white" />
                                    <span className="text-white text-xs font-bold">사진 변경</span>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                                <ImageIcon size={32} />
                                <span className="text-xs font-medium">사진을 업로드하세요</span>
                                <span className="text-[10px] text-gray-300">클릭하여 선택</span>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {/* Analysis status */}
                    {isAnalyzing && (
                        <div className="flex items-center gap-2 text-xs text-indigo-500 mb-2">
                            <Loader2 size={14} className="animate-spin" />
                            <span>사진 분석 중...</span>
                        </div>
                    )}
                    {analyzeError && (
                        <div className="text-xs text-red-400 mb-2">{analyzeError}</div>
                    )}
                    {photoDescription && !isAnalyzing && (
                        <div className="text-[10px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2 max-w-xs text-left leading-relaxed mb-1">
                            <span className="font-bold text-gray-500">📷 </span>{photoDescription}
                        </div>
                    )}

                    {/* Keyword badge */}
                    {keyword && (
                        <div className="mt-2 bg-white/90 backdrop-blur px-6 py-2 rounded-full border border-gray-200 shadow-sm">
                            <span className="text-xl font-bold text-indigo-900">{keyword}</span>
                        </div>
                    )}
                </div>
            ) : displayPhoto ? (
                <div className="mb-6 flex flex-col items-center">
                    <div className="w-64 h-40 bg-gray-100 rounded-xl overflow-hidden shadow-md mb-4 bg-white p-2 border border-gray-100 transform -rotate-2">
                        <img src={displayPhoto} alt="Topic" className="w-full h-full object-cover rounded-lg" />
                    </div>
                    {keyword && (
                        <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-full border border-gray-200 shadow-sm">
                            <span className="text-xl font-bold text-indigo-900">{keyword}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm transform -rotate-3 mt-12">
                    <div className="transform rotate-3">
                        {mode === 'roleplay' && <span className="text-4xl">🥐</span>}
                        {mode === 'free' && <span className="text-4xl">💬</span>}
                        {mode === 'wrapup' && <span className="text-4xl">📝</span>}
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold text-gray-800 mb-3 whitespace-pre-line">{content.title}</h2>
            <p className="text-gray-500 mb-6 leading-relaxed whitespace-pre-line max-w-xs mx-auto text-sm min-h-[60px]">
                {content.description}
            </p>

            <button
                onClick={handleStart}
                disabled={!canStart || isAnalyzing}
                className="bg-[#3b1e1e] hover:bg-[#2a1515] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 px-12 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
            >
                <Play size={20} fill="currentColor" />
                <span>{lang === 'ko' ? '대화 시작하기' : 'Bắt đầu'}</span>
            </button>

            {mode === 'photo' && !displayPhoto && (
                <div className="mt-3 text-xs text-amber-500 font-medium">사진을 먼저 업로드해 주세요</div>
            )}

            <div className="mt-4 text-xs text-gray-400">
                {lang === 'ko' ? '시작 버튼을 누르면 AI가 먼저 말을 겁니다.' : 'Nhấn Bắt đầu để AI nói chuyện trước.'}
            </div>
        </div>
    );
}
