'use client';

import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { savePrompt, loadPrompts, PromptConfig } from '../app/actions_prompt';

interface PromptEditorProps {
    onConfigChange: (config: PromptConfig) => void;
    initialConfig?: Partial<PromptConfig>;
    mode: string;
}

export default function PromptEditor({ onConfigChange, initialConfig, mode }: PromptEditorProps) {
    const [activeTab, setActiveTab] = useState<'system' | 'feedback' | 'review'>('system');
    const [systemPrompt, setSystemPrompt] = useState(initialConfig?.systemPrompt || '');
    const [feedbackPrompt, setFeedbackPrompt] = useState(initialConfig?.feedbackPrompt || '');
    const [reviewPrompt, setReviewPrompt] = useState(initialConfig?.reviewPrompt || '');
    const [variables, setVariables] = useState<{ key: string; value: string }[]>(
        initialConfig?.variables || [{ key: 'user_name', value: 'Student' }]
    );
    const [temperature, setTemperature] = useState(initialConfig?.temperature || 0.7);
    const [ttsProvider, setTtsProvider] = useState<'elevenlabs' | 'speechify'>(initialConfig?.ttsProvider || 'elevenlabs');
    const [promptName, setPromptName] = useState('My Prompt');
    const [savedPrompts, setSavedPrompts] = useState<any[]>([]);

    useEffect(() => {
        loadPrompts(mode).then((prompts) => {
            setSavedPrompts(prompts);
            if (prompts.length > 0) {
                // Auto-load the most recent prompt
                const latest = prompts[0];
                setSystemPrompt(latest.systemPrompt);
                setFeedbackPrompt(latest.feedbackPrompt || '');
                setReviewPrompt(latest.reviewPrompt || '');
                setVariables(latest.variables);
                setTemperature(latest.temperature);
                setTtsProvider(latest.ttsProvider || 'elevenlabs');
                setPromptName(latest.name);
            }
        });
    }, [mode]); // Reload when mode changes

    useEffect(() => {
        onConfigChange({
            name: promptName,
            systemPrompt,
            feedbackPrompt,
            reviewPrompt,
            variables,
            temperature,
            ttsProvider,
            timestamp: new Date().toISOString()
        });
    }, [systemPrompt, feedbackPrompt, reviewPrompt, variables, temperature, ttsProvider, promptName, onConfigChange]);

    const handleAddVariable = () => {
        setVariables([...variables, { key: '', value: '' }]);
    };

    const handleRemoveVariable = (index: number) => {
        setVariables(variables.filter((_, i) => i !== index));
    };

    const handleVariableChange = (index: number, field: 'key' | 'value', val: string) => {
        const newVars = [...variables];
        newVars[index][field] = val;
        setVariables(newVars);
    };

    const handleSave = async () => {
        const config: PromptConfig = {
            name: promptName,
            systemPrompt,
            feedbackPrompt,
            reviewPrompt,
            variables,
            temperature,
            ttsProvider,
            timestamp: new Date().toISOString(),
        };
        await savePrompt(config, mode); // Save with mode
        const updated = await loadPrompts(mode);
        setSavedPrompts(updated);
        alert('Prompt saved!');
    };

    const handleLoad = (filename: string) => {
        const prompt = savedPrompts.find(p => p.filename === filename);
        if (prompt) {
            setSystemPrompt(prompt.systemPrompt);
            setFeedbackPrompt(prompt.feedbackPrompt || '');
            setReviewPrompt(prompt.reviewPrompt || '');
            setVariables(prompt.variables);
            setTemperature(prompt.temperature);
            setTtsProvider(prompt.ttsProvider || 'elevenlabs');
            setPromptName(prompt.name);
        }
    };

    return (
        <div className="flex flex-col gap-4 p-2 h-full overflow-hidden">
            {/* Save/Load Controls */}
            <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                <input
                    type="text"
                    value={promptName}
                    onChange={(e) => setPromptName(e.target.value)}
                    className="bg-white border text-sm rounded-md px-2 py-1 flex-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Prompt Name"
                />
                <button
                    onClick={handleSave}
                    className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    title="Save Prompt"
                >
                    <Save size={16} />
                </button>
                <select
                    onChange={(e) => handleLoad(e.target.value)}
                    className="bg-white border text-sm rounded-md px-2 py-1 max-w-[120px]"
                    value=""
                >
                    <option value="" disabled>Load...</option>
                    {savedPrompts.map((p) => (
                        <option key={p.filename} value={p.filename}>
                            {p.name} ({new Date(p.timestamp).toLocaleDateString()})
                        </option>
                    ))}
                </select>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('system')}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors border-b-2 ${activeTab === 'system' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Conversation
                </button>
                <button
                    onClick={() => setActiveTab('feedback')}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors border-b-2 ${activeTab === 'feedback' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Real-time Feedback
                </button>
                <button
                    onClick={() => setActiveTab('review')}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors border-b-2 ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Wrap-up Review
                </button>
            </div>

            {/* Prompt Editor Content */}
            <div className="flex-1 flex flex-col min-h-0">
                {activeTab === 'system' && (
                    <div className="flex flex-col gap-2 h-full">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">System Prompt (Scenario)</label>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            className="flex-1 w-full p-3 border border-gray-300 rounded-md font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Set the scene, AI persona, and conversation rules..."
                        />
                    </div>
                )}

                {activeTab === 'feedback' && (
                    <div className="flex flex-col gap-2 h-full">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Real-time Feedback Instructions</label>
                        <textarea
                            value={feedbackPrompt}
                            onChange={(e) => setFeedbackPrompt(e.target.value)}
                            className="flex-1 w-full p-3 border border-gray-300 rounded-md font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Instruction for turn-by-turn evaluation (e.g. grading strictness, grammar focus)..."
                        />
                    </div>
                )}

                {activeTab === 'review' && (
                    <div className="flex flex-col gap-2 h-full">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Session Wrap-up Review Criteria</label>
                        <textarea
                            value={reviewPrompt}
                            onChange={(e) => setReviewPrompt(e.target.value)}
                            className="flex-1 w-full p-3 border border-gray-300 rounded-md font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Overall evaluation criteria used for the final review screen..."
                        />
                    </div>
                )}
            </div>

            {/* Variables & Other Settings (Collapsed view/Scrollable) */}
            <div className="space-y-4 overflow-y-auto max-h-[40%] pr-1">
                {/* Variables */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-700">Variables</label>
                        <button
                            onClick={handleAddVariable}
                            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>
                    <div className="space-y-2">
                        {variables.map((v, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={v.key}
                                    onChange={(e) => handleVariableChange(i, 'key', e.target.value)}
                                    placeholder="Key"
                                    className="w-1/3 text-xs p-1.5 border rounded-md"
                                />
                                <input
                                    type="text"
                                    value={v.value}
                                    onChange={(e) => handleVariableChange(i, 'value', e.target.value)}
                                    placeholder="Value"
                                    className="flex-1 text-xs p-1.5 border rounded-md"
                                />
                                <button
                                    onClick={() => handleRemoveVariable(i)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    {/* Temperature */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                            <label className="text-xs font-semibold text-gray-700">Temp</label>
                            <span className="text-[10px] text-gray-500">{temperature}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* TTS Provider */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-gray-700">TTS</label>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setTtsProvider('elevenlabs')}
                                className={`flex-1 py-1 px-1 text-[10px] rounded-md border transition ${ttsProvider === 'elevenlabs'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300'
                                    }`}
                            >
                                11labs
                            </button>
                            <button
                                onClick={() => setTtsProvider('speechify')}
                                className={`flex-1 py-1 px-1 text-[10px] rounded-md border transition ${ttsProvider === 'speechify'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300'
                                    }`}
                            >
                                Speechify
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
