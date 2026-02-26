'use client';

import React from 'react';
import { RotateCcw, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, X, BarChart3 } from 'lucide-react';
import { ReviewFeedback } from '../app/actions';

interface ReviewSummary {
    total: number;
    correct_count: number;
    message_ko: string;
    message_vn: string;
}

interface WrapupReviewScreenProps {
    feedbacks: ReviewFeedback[];
    summary?: ReviewSummary;
    isLoading: boolean;
    onReset: () => void;
    error?: string;
    isOpen: boolean;
    onToggle: () => void;
}

export default function WrapupReviewScreen({
    feedbacks,
    summary,
    isLoading,
    onReset,
    error,
    isOpen,
    onToggle
}: WrapupReviewScreenProps) {
    const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

    const correctCount = summary?.correct_count ?? feedbacks.filter(f => f.correct === 'Yes').length;
    const totalCount = summary?.total ?? feedbacks.length;
    const scorePercent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // Floating button when panel is closed
    if (!isOpen) {
        return (
            <button
                onClick={onToggle}
                className="absolute bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-white text-sm font-bold transition-all hover:scale-105 active:scale-95"
                style={{
                    background: isLoading
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                        : 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                }}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin" size={16} />
                        평가 중...
                    </>
                ) : (
                    <>
                        <BarChart3 size={16} />
                        학습 결과 {totalCount > 0 && `${correctCount}/${totalCount}`}
                    </>
                )}
            </button>
        );
    }

    // Full overlay panel
    return (
        <div className="absolute inset-0 z-40 flex flex-col bg-black/30 backdrop-blur-[2px]" onClick={(e) => { if (e.target === e.currentTarget) onToggle(); }}>
            {/* Slide-up Panel */}
            <div className="mt-auto bg-[#f0f2f5] rounded-t-2xl shadow-2xl flex flex-col" style={{ maxHeight: '85%' }}>
                {/* Drag Handle + Header */}
                <div className="shrink-0">
                    <div className="flex justify-center py-2">
                        <div className="w-10 h-1 rounded-full bg-gray-300" />
                    </div>
                    <div className="px-4 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-gray-800">📝 학습 결과</span>
                        </div>
                        <button
                            onClick={onToggle}
                            className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="animate-spin text-indigo-600" size={32} />
                            <p className="text-sm font-medium text-gray-600">대화 평가 중...</p>
                            <p className="text-xs text-gray-400">Đang đánh giá cuộc hội thoại...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center py-8 gap-3">
                            <XCircle className="text-red-400" size={36} />
                            <p className="text-xs text-red-600 text-center">{error}</p>
                        </div>
                    ) : (
                        <>
                            {/* Score Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3">
                                <div className="flex items-center gap-4">
                                    {/* Circular Score */}
                                    <div className="relative w-16 h-16 shrink-0">
                                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                                            <circle
                                                cx="50" cy="50" r="42" fill="none"
                                                stroke={scorePercent >= 70 ? '#22c55e' : scorePercent >= 40 ? '#f59e0b' : '#ef4444'}
                                                strokeWidth="8"
                                                strokeLinecap="round"
                                                strokeDasharray={`${scorePercent * 2.64} ${264 - scorePercent * 2.64}`}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-lg font-black text-gray-800">{correctCount}/{totalCount}</span>
                                        </div>
                                    </div>
                                    {summary && (
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-700 leading-relaxed">{summary.message_ko}</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{summary.message_vn}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Feedback Cards */}
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">개별 피드백</h3>
                            <div className="space-y-2">
                                {feedbacks.map((fb, idx) => {
                                    const isCorrect = fb.correct === 'Yes';
                                    const isExpanded = expandedIndex === idx;

                                    return (
                                        <div
                                            key={idx}
                                            className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isCorrect ? 'border-green-100' : 'border-red-100'
                                                }`}
                                        >
                                            <button
                                                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                                                className="w-full p-3 flex items-start gap-2.5 text-left"
                                            >
                                                <div className={`mt-0.5 shrink-0 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                                                    {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-gray-400 truncate">AI: {fb.ai_asked}</p>
                                                    <p className={`text-sm font-medium ${isCorrect ? 'text-gray-800' : 'text-red-700'}`}>
                                                        {fb.user_said}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-gray-300 mt-1">
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className={`px-3 pb-3 pt-0 border-t ${isCorrect ? 'border-green-50 bg-green-50/30' : 'border-red-50 bg-red-50/30'}`}>
                                                    {isCorrect ? (
                                                        <div className="py-2">
                                                            <p className="text-xs text-green-700 font-medium">✅ 정확한 표현입니다!</p>
                                                            <p className="text-[10px] text-green-600/70 mt-0.5">Biểu đạt chính xác!</p>
                                                        </div>
                                                    ) : (
                                                        <div className="py-2 space-y-1.5">
                                                            {fb.correct_answer_ko && (
                                                                <div>
                                                                    <p className="text-[10px] text-gray-400">교정</p>
                                                                    <p className="text-sm font-bold text-gray-800">✅ {fb.correct_answer_ko}</p>
                                                                </div>
                                                            )}
                                                            {fb.correction_explanation && (
                                                                <div>
                                                                    <p className="text-[10px] text-gray-400">설명</p>
                                                                    <p className="text-xs text-gray-700 leading-relaxed">{fb.correction_explanation}</p>
                                                                </div>
                                                            )}
                                                            {fb.correction_explanation_vn && (
                                                                <div className="pt-1 border-t border-red-100/50">
                                                                    <p className="text-[10px] text-gray-400">Giải thích</p>
                                                                    <p className="text-xs text-gray-500 leading-relaxed">{fb.correction_explanation_vn}</p>
                                                                </div>
                                                            )}
                                                            <div className="flex gap-1.5 pt-0.5">
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${fb.grammatically_correct === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    문법 {fb.grammatically_correct === 'Yes' ? '✓' : '✗'}
                                                                </span>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${fb.contextually_appropriate === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    맥락 {fb.contextually_appropriate === 'Yes' ? '✓' : '✗'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Bottom Button */}
                {!isLoading && (
                    <div className="px-4 py-3 border-t border-gray-200 bg-white rounded-b-none shrink-0">
                        <button
                            onClick={onReset}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors"
                        >
                            <RotateCcw size={14} />
                            다시 대화하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
