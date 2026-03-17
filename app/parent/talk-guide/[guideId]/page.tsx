"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, BookOpen, Lightbulb, MessageSquare, Check } from "lucide-react";
import type { TalkGuide } from "@/lib/types";

export default function TalkGuideDetailPage() {
  const { guideId } = useParams<{ guideId: string }>();
  const router = useRouter();
  const [guide, setGuide] = useState<TalkGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    // We need profile_id too — find from list
    const profilesRes = await fetch("/api/parent/profiles");
    const profiles = await profilesRes.json();
    const profileId = profiles[0]?.profile_id;
    if (!profileId) { setLoading(false); return; }

    const res = await fetch(`/api/parent/talk-guide?profile_id=${profileId}&guide_id=${guideId}`);
    if (res.ok) {
      const data: TalkGuide = await res.json();
      setGuide(data);
      // Mark as acknowledged
      if (!data.parent_acknowledged) {
        await fetch("/api/parent/talk-guide", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile_id: profileId, guide_id: guideId, parent_acknowledged: true }),
        });
      }
    }
    setLoading(false);
  }, [guideId]);

  useEffect(() => { load(); }, [load]);

  const markConversationHappened = async () => {
    if (!guide) return;
    setSaving(true);
    const profilesRes = await fetch("/api/parent/profiles");
    const profiles = await profilesRes.json();
    const profileId = profiles[0]?.profile_id;
    const res = await fetch("/api/parent/talk-guide", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId, guide_id: guideId, conversation_happened: true }),
    });
    if (res.ok) setGuide({ ...guide, conversation_happened: true });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="px-4 py-5 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="px-4 py-5 text-center">
        <p className="text-sm text-gray-400">가이드를 찾을 수 없어요</p>
        <button onClick={() => router.back()} className="mt-3 text-indigo-500 text-sm">돌아가기</button>
      </div>
    );
  }

  const dateStr = new Date(guide.generated_at).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 truncate">{dateStr} · {guide.card_title}</p>
        </div>
        {guide.conversation_happened && (
          <CheckCircle2 size={18} className="text-green-500" />
        )}
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">{guide.title}</h1>
        </div>

        {/* Summary */}
        <div className="bg-indigo-50 rounded-2xl p-4">
          <p className="text-xs font-semibold text-indigo-500 mb-1.5">오늘 세션 요약</p>
          <p className="text-sm text-gray-700 leading-relaxed">{guide.summary_for_parent}</p>
        </div>

        {/* Child highlight */}
        {guide.child_highlight && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb size={14} className="text-amber-500" />
              <p className="text-xs font-semibold text-amber-600">아이가 관심 보인 것</p>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{guide.child_highlight}</p>
          </div>
        )}

        {/* Conversation starters */}
        {guide.conversation_starters.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <MessageSquare size={16} className="text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-700">대화 시작하기</h2>
            </div>
            <div className="space-y-3">
              {guide.conversation_starters.map((starter, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-sm font-medium text-gray-800 mb-2">💬 &ldquo;{starter.question}&rdquo;</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{starter.why_this_works}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offline activities */}
        {guide.offline_activities.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-3">함께 할 수 있는 활동</h2>
            <div className="space-y-2">
              {guide.offline_activities.map((activity, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-xs text-purple-600 font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed">{activity}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Book recommendations */}
        {guide.book_recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <BookOpen size={16} className="text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-700">다음에 읽어볼 책</h2>
            </div>
            <div className="space-y-2">
              {guide.book_recommendations.map((book, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm">
                  <p className="text-sm font-semibold text-gray-800 mb-1">{book.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{book.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversation happened CTA */}
        {!guide.conversation_happened ? (
          <button
            onClick={markConversationHappened}
            disabled={saving}
            className="w-full bg-indigo-500 text-white rounded-2xl py-3.5 text-sm font-semibold active:bg-indigo-600 transition-colors disabled:opacity-60"
          >
            {saving ? "저장 중..." : "✓ 아이와 대화했어요"}
          </button>
        ) : (
          <div className="w-full bg-green-50 border border-green-200 rounded-2xl py-3.5 flex items-center justify-center gap-2">
            <Check size={16} className="text-green-500" />
            <span className="text-sm font-semibold text-green-600">대화 완료!</span>
          </div>
        )}
      </div>
    </div>
  );
}
