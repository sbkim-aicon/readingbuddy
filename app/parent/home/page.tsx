"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import SpeakerStatusCard from "@/components/parent/SpeakerStatusCard";
import TalkGuideCard from "@/components/parent/TalkGuideCard";
import ProfileSelector from "@/components/parent/ProfileSelector";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import type { ChildProfile, TalkGuide, DailyUsageSummary } from "@/lib/types";

export default function ParentHomePage() {
  const { activeProfileId, setActive } = useActiveProfile();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [latestGuide, setLatestGuide] = useState<TalkGuide | null>(null);
  const [todaySummary, setTodaySummary] = useState<DailyUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const activeProfile = profiles.find(p => p.profile_id === activeProfileId) ?? profiles[0] ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profilesRes = await fetch("/api/parent/profiles");
      const profilesData: ChildProfile[] = await profilesRes.json();
      setProfiles(profilesData);

      const id = activeProfileId ?? profilesData[0]?.profile_id;
      if (!id) { setLoading(false); return; }
      if (!activeProfileId && profilesData[0]) setActive(profilesData[0].profile_id);

      const [guidesRes, reportsRes] = await Promise.all([
        fetch(`/api/parent/talk-guide?profile_id=${id}&limit=1`),
        fetch(`/api/parent/reports?profile_id=${id}&period=day`),
      ]);

      const guides: TalkGuide[] = await guidesRes.json();
      setLatestGuide(guides[0] ?? null);

      const report = await reportsRes.json();
      setTodaySummary(report.days?.[0] ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeProfileId, setActive]);

  useEffect(() => { load(); }, [load]);

  const unread = latestGuide && !latestGuide.parent_acknowledged;

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">안녕하세요 👋</p>
          <h1 className="text-lg font-bold text-gray-800">
            {activeProfile ? `${activeProfile.name}의 오늘` : "리딩버디"}
          </h1>
        </div>
        <div className="relative">
          <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <Bell size={18} className="text-gray-600" />
          </button>
          {unread && (
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          )}
        </div>
      </div>

      {/* Profile selector */}
      {profiles.length > 0 && (
        <ProfileSelector
          profiles={profiles}
          activeId={activeProfileId}
          onSelect={setActive}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Speaker status */}
          <SpeakerStatusCard
            isOnline={false}
            currentCard={null}
            usedMinutes={todaySummary?.total_minutes ?? 0}
            limitMinutes={activeProfile?.daily_limit_minutes ?? 0}
          />

          {/* Talk guide */}
          {latestGuide ? (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">대화 가이드</h2>
              <TalkGuideCard guide={latestGuide} compact />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-sm text-gray-400">아직 대화 가이드가 없어요</p>
              <p className="text-xs text-gray-300 mt-0.5">아이가 카드를 이용하면 자동으로 만들어져요</p>
            </div>
          )}

          {/* Today summary */}
          {todaySummary && todaySummary.total_minutes > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">오늘 이용 현황</h2>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">총 이용 시간</span>
                  <span className="font-semibold text-gray-800">{todaySummary.total_minutes}분</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">세션 수</span>
                  <span className="font-semibold text-gray-800">{todaySummary.session_count}회</span>
                </div>
                {todaySummary.cards_used.slice(0, 3).map(card => (
                  <div key={card.card_id} className="flex justify-between text-xs text-gray-400">
                    <span className="truncate max-w-[65%]">{card.card_title}</span>
                    <span>{card.minutes}분</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {profiles.length === 0 && (
            <div className="text-center py-10">
              <p className="text-3xl mb-3">👶</p>
              <p className="text-sm font-semibold text-gray-700">아직 프로필이 없어요</p>
              <p className="text-xs text-gray-400 mt-1">설정에서 아이 프로필을 추가해 보세요</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
