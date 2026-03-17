"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, BookOpen, MessageSquare, ChevronRight } from "lucide-react";
import type { CardConfig } from "@/lib/types";

export default function ParentCardsPage() {
  const [cards, setCards] = useState<CardConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch("/api/admin/cards");
        const data = await res.json();
        // Only show active cards
        setCards(data.filter((c: CardConfig) => c.active));
      } catch (err) {
        console.error("Failed to fetch cards:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  return (
    <div className="px-5 py-6 space-y-6">
      <header>
        <h1 className="text-xl font-bold text-gray-800">학습 콘텐츠</h1>
        <p className="text-sm text-gray-500 mt-1">아이와 함께 즐길 수 있는 카드를 선택해 보세요.</p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-gray-50 rounded-3xl p-10 text-center">
          <p className="text-gray-400 text-sm">활성화된 카드가 없어요.</p>
          <Link href="/admin" className="text-indigo-500 text-sm font-medium mt-2 inline-block">
            관리자 페이지에서 카드 활성화하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <Link
              key={card.card_id}
              href={`/parent/cards/${card.card_id}`}
              className="group block bg-white border border-gray-100 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all hover:border-indigo-100"
            >
              <div className="flex items-center gap-4">
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                  ${card.card_type === 'read_with_me' ? 'bg-orange-50' : 'bg-indigo-50'}
                `}>
                  {card.card_type === 'read_with_me' ? <BookOpen className="text-orange-500 w-6 h-6" /> : <MessageSquare className="text-indigo-500 w-6 h-6" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800 truncate">{card.title}</h3>
                    {card.card_type === 'read_with_me' && (
                      <span className="bg-orange-100 text-orange-600 text-[10px] px-1.5 py-0.5 rounded font-bold">READ</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{card.subtitle || card.persona_name}</p>
                </div>

                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                  <Play size={14} className="text-gray-400 group-hover:text-white" fill="currentColor" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
