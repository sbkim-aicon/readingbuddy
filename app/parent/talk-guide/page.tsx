"use client";

import { useEffect, useState, useCallback } from "react";
import TalkGuideCard from "@/components/parent/TalkGuideCard";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import type { ChildProfile, TalkGuide } from "@/lib/types";

export default function TalkGuidePage() {
  const { activeProfileId, setActive } = useActiveProfile();
  const [guides, setGuides] = useState<TalkGuide[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let id = activeProfileId;
      if (!id) {
        const res = await fetch("/api/parent/profiles");
        const profiles: ChildProfile[] = await res.json();
        id = profiles[0]?.profile_id ?? null;
        if (id) setActive(id);
      }
      if (!id) { setLoading(false); return; }

      const res = await fetch(`/api/parent/talk-guide?profile_id=${id}&limit=20`);
      setGuides(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeProfileId, setActive]);

  useEffect(() => { load(); }, [load]);

  const unreadCount = guides.filter(g => !g.parent_acknowledged).length;

  return (
    <div className="px-4 py-5 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-800">대화 가이드</h1>
        {unreadCount > 0 && (
          <p className="text-xs text-indigo-500 mt-0.5">
            {unreadCount}개의 새 가이드가 있어요
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : guides.length > 0 ? (
        <div className="space-y-3">
          {guides.map(guide => (
            <TalkGuideCard key={guide.guide_id} guide={guide} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-sm font-semibold text-gray-700">아직 대화 가이드가 없어요</p>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            아이가 스피커로 카드를 이용하면<br />
            AI가 대화 가이드를 자동으로 만들어줘요
          </p>
        </div>
      )}
    </div>
  );
}
