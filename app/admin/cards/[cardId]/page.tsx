"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CardConfig } from "@/lib/types";
import PromptEditor from "@/components/admin/PromptEditor";
import { ArrowLeft, Save } from "lucide-react";

export default function CardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.cardId as string;

  const [card, setCard] = useState<CardConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchCard();
  }, [cardId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCard() {
    try {
      const res = await fetch(`/api/admin/cards/${cardId}`);
      if (res.ok) {
        setCard(await res.json());
      } else {
        router.push("/admin");
      }
    } catch {
      router.push("/admin");
    }
  }

  async function handleSaveCardInfo() {
    if (!card) return;
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/admin/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: card.title,
          subtitle: card.subtitle,
          voice_openai: card.voice_openai,
          temperature: card.temperature,
          active: card.active,
          persona_name: card.persona_name,
        }),
      });

      if (res.ok) {
        setStatusMessage({ type: "success", text: "카드 정보가 저장되었습니다." });
      } else {
        setStatusMessage({ type: "error", text: "저장에 실패했습니다." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setIsSaving(false);
    }
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] p-6 sm:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cards
          </button>
          <div className="flex-1" />
          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
            {card.card_id}
          </span>
        </header>

        {/* Card Info Section */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-[#333333] mb-4">Card Info</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Title
              </label>
              <input
                type="text"
                value={card.title}
                onChange={(e) => setCard({ ...card, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Subtitle
              </label>
              <input
                type="text"
                value={card.subtitle}
                onChange={(e) => setCard({ ...card, subtitle: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Persona Name
              </label>
              <input
                type="text"
                value={card.persona_name}
                onChange={(e) =>
                  setCard({ ...card, persona_name: e.target.value })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Voice
              </label>
              <select
                value={card.voice_openai}
                onChange={(e) =>
                  setCard({ ...card, voice_openai: e.target.value })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {["alloy", "echo", "fable", "onyx", "nova", "shimmer", "coral"].map(
                  (v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Temperature
              </label>
              <input
                type="number"
                step={0.1}
                min={0}
                max={2}
                value={card.temperature}
                onChange={(e) =>
                  setCard({ ...card, temperature: parseFloat(e.target.value) })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Status
              </label>
              <button
                onClick={() => setCard({ ...card, active: !card.active })}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  card.active ? "bg-green-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    card.active ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="ml-3 text-sm text-gray-600">
                {card.active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSaveCardInfo}
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "저장 중..." : "카드 정보 저장"}
            </button>
            {statusMessage && (
              <span
                className={`text-sm ${
                  statusMessage.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {statusMessage.text}
              </span>
            )}
          </div>
        </section>

        {/* Prompt Editor Section */}
        <section>
          <PromptEditor cardId={cardId} cardType={card.card_type} />
        </section>
      </div>
    </div>
  );
}
