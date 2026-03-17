"use client";

import Link from "next/link";
import { MessageCircle, ChevronRight, CheckCircle2, Sparkles } from "lucide-react";
import type { TalkGuide } from "@/lib/types";

interface Props {
  guide: TalkGuide;
  compact?: boolean;
}

export default function TalkGuideCard({ guide, compact = false }: Props) {
  const dateStr = new Date(guide.generated_at).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });

  if (compact) {
    return (
      <Link href={`/parent/talk-guide/${guide.guide_id}`}>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3 active:bg-amber-100 transition-colors">
          <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-600 font-medium mb-0.5">오늘의 대화 가이드</p>
            <p className="text-sm font-semibold text-gray-800 truncate">{guide.title}</p>
          </div>
          <ChevronRight size={16} className="text-amber-400 shrink-0" />
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/parent/talk-guide/${guide.guide_id}`}>
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm active:bg-gray-50 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <MessageCircle size={18} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">{dateStr} · {guide.card_title}</span>
              {guide.conversation_happened && (
                <CheckCircle2 size={14} className="text-green-500" />
              )}
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">{guide.title}</p>
            <p className="text-xs text-gray-500 line-clamp-2">{guide.summary_for_parent}</p>
          </div>
          <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
        </div>

        {!guide.parent_acknowledged && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-xs text-indigo-600 font-medium">아직 확인하지 않은 가이드</span>
          </div>
        )}
      </div>
    </Link>
  );
}
