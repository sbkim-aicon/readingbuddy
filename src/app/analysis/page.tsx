'use client'

import React, { useState } from 'react';
import SentenceAnalyzer from '../../components/SentenceAnalyzer';
import { Search, BookOpen, ArrowRight } from 'lucide-react';

export default function AnalysisPage() {
    const [input, setInput] = useState('');
    const [analyzedSentence, setAnalyzedSentence] = useState('');

    const handleAnalyze = () => {
        if (!input.trim()) return;
        setAnalyzedSentence(input);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-4">
                        <BookOpen className="text-white" size={32} />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">
                        한국어 문장 분석기
                    </h1>
                    <p className="text-lg text-gray-500">
                        문장을 입력하면 단어별 뜻과 베트남어 번역을 바로 확인할 수 있습니다.
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8">
                    <div className="p-8">
                        <label htmlFor="sentence-input" className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                            분석할 문장 입력
                        </label>
                        <div className="relative">
                            <textarea
                                id="sentence-input"
                                rows={3}
                                className="block w-full px-5 py-4 text-xl border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all resize-none bg-gray-50/50"
                                placeholder="예: 안녕하세요, 만나서 반갑습니다."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button
                                onClick={handleAnalyze}
                                className="absolute bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 group"
                            >
                                분석하기
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                {analyzedSentence && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-4 ml-2 text-gray-400 font-bold uppercase tracking-widest text-xs">
                            <Search size={14} />
                            분석 결과 (단어를 클릭해보세요)
                        </div>
                        <SentenceAnalyzer sentence={analyzedSentence} />
                    </div>
                )}

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-white rounded-2xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-2">간편한 단어 분석</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            문장의 각 단어를 클릭하여 사전적 의미를 즉시 확인하세요.
                        </p>
                    </div>
                    <div className="p-6 bg-white rounded-2xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-2">베트남어 번역 지원</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            한국어 뜻뿐만 아니라 정확한 베트남어 대역어를 함께 제공합니다.
                        </p>
                    </div>
                    <div className="p-6 bg-white rounded-2xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-2">실시간 데이터</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            국립국어원 한국어기초사전 API를 통해 신뢰할 수 있는 정보를 제공합니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
