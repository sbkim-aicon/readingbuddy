"use client";

import { useState, useEffect } from "react";
import { CardConfig } from "@/lib/types";
import { Save, Settings } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
    const [cards, setCards] = useState<CardConfig[]>([]);

    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        try {
            const res = await fetch('/api/admin/cards');
            if (res.ok) {
                const data = await res.json();
                setCards(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async (updatedCards: CardConfig[]) => {
        try {
            const res = await fetch('/api/admin/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedCards)
            });
            if (res.ok) {
                alert("Saved successfully!");
                setCards(updatedCards);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to save.");
        }
    };

    const toggleActive = (index: number) => {
        const newCards = [...cards];
        newCards[index].active = !newCards[index].active;
        setCards(newCards);
    };

    return (
        <div className="min-h-screen bg-[#F4F6F8] p-6 sm:p-12">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-[#333333]">Card Management</h1>
                    <div className="flex gap-4">
                        <a href="/" className="text-gray-600 hover:underline my-auto mr-4">← Back to App</a>
                        <button
                            onClick={() => handleSave(cards)}
                            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                        >
                            <Save className="w-4 h-4" /> Save Changes
                        </button>
                    </div>
                </header>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm">ID</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm">Title</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm">Type</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm">Voice</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cards.map((card, index) => (
                                <tr key={card.card_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleActive(index)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${card.active ? 'bg-green-500' : 'bg-gray-200'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${card.active ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </td>
                                    <td className="p-4 text-sm font-mono text-gray-500">{card.card_id}</td>
                                    <td className="p-4 text-[#333333] font-medium">{card.title}</td>
                                    <td className="p-4 text-sm text-gray-600">{card.card_type}</td>
                                    <td className="p-4">
                                        <select
                                            value={card.voice_openai}
                                            onChange={(e) => {
                                                const newCards = [...cards];
                                                newCards[index].voice_openai = e.target.value;
                                                setCards(newCards);
                                            }}
                                            className="border border-gray-200 rounded px-2 py-1 text-sm bg-white"
                                        >
                                            {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <Link
                                            href={`/admin/cards/${card.card_id}`}
                                            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                                        >
                                            <Settings className="w-3.5 h-3.5" />
                                            Detail
                                        </Link>
                                    </td>
                                    <td className="p-4">
                                        {card.card_type === 'read_with_me' ? (
                                            <div className="flex flex-col gap-2">
                                                {card.book_data_path ? (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded inline-block w-fit">
                                                        ✅ Data Analyzed
                                                    </span>
                                                ) : (
                                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded inline-block w-fit">
                                                        PDF Upload Required
                                                    </span>
                                                )}
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        const formData = new FormData();
                                                        formData.append("pdf", file);
                                                        formData.append("book_id", card.card_id);

                                                        try {
                                                            const res = await fetch('/api/book-data-analyzer', {
                                                                method: 'POST',
                                                                body: formData
                                                            });

                                                            if (res.ok) {
                                                                const data = await res.json();
                                                                const newCards = [...cards];
                                                                newCards[index].book_data_path = data.book_data_path;
                                                                // Activate automatically when PDF is analyzed
                                                                newCards[index].active = true;
                                                                setCards(newCards);
                                                                handleSave(newCards);
                                                                alert(`Successfully analyzed! Extracted ${data.book_metadata.total_pages} pages.`);
                                                            } else {
                                                                const err = await res.json();
                                                                alert(`Analysis failed: ${err.error}`);
                                                            }
                                                        } catch (error) {
                                                            console.error(error);
                                                            alert("Upload error occurred.");
                                                        }
                                                    }}
                                                    className="block w-full text-xs text-gray-500
                                                        file:mr-2 file:py-1 file:px-2
                                                        file:rounded file:border-0
                                                        file:text-xs file:font-semibold
                                                        file:bg-blue-50 file:text-blue-700
                                                        hover:file:bg-blue-100 cursor-pointer"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">Not Applicable</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
