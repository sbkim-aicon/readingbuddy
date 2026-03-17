"use client";

import { useEffect, useState, useCallback } from "react";
import UsageChart from "@/components/parent/UsageChart";
import ProfileSelector from "@/components/parent/ProfileSelector";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import type { ChildProfile, WeeklyUsageSummary } from "@/lib/types";

export default function ReportsPage() {
  const { activeProfileId, setActive } = useActiveProfile();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [report, setReport] = useState<WeeklyUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profilesRes = await fetch("/api/parent/profiles");
      const profilesData: ChildProfile[] = await profilesRes.json();
      setProfiles(profilesData);

      const id = activeProfileId ?? profilesData[0]?.profile_id;
      if (!id) { setLoading(false); return; }
      if (!activeProfileId && profilesData[0]) setActive(profilesData[0].profile_id);

      const res = await fetch(`/api/parent/reports?profile_id=${id}&period=week`);
      setReport(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeProfileId, setActive]);

  useEffect(() => { load(); }, [load]);

  const avgMinutes = report && report.days.length > 0
    ? Math.round(report.total_minutes / report.days.filter(d => d.total_minutes > 0).length || 0)
    : 0;

  return (
    <div className="px-4 py-5 space-y-5">
      <h1 className="text-lg font-bold text-gray-800">리포트</h1>

      {profiles.length > 1 && (
        <ProfileSelector
          profiles={profiles}
          activeId={activeProfileId}
          onSelect={(id) => { setActive(id); }}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : report ? (
        <>
          {/* Weekly summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-indigo-50 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-indigo-600">{report.total_minutes}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">주간 총 분</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-purple-600">{report.total_sessions}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">총 세션</p>
            </div>
            <div className="bg-pink-50 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold text-pink-600">{avgMinutes}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">일평균 분</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">주간 이용 시간</h2>
            {report.days.length > 0 ? (
              <UsageChart days={report.days} />
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">이용 데이터가 없어요</p>
            )}
          </div>

          {/* Top cards */}
          {report.top_cards.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">많이 이용한 카드</h2>
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50">
                {report.top_cards.map((card, i) => {
                  const maxMin = report.top_cards[0]?.minutes ?? 1;
                  return (
                    <div key={card.card_id} className="p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                          <span className="text-sm text-gray-700 truncate max-w-[200px]">{card.card_title}</span>
                        </div>
                        <span className="text-xs font-semibold text-indigo-600 shrink-0">{card.minutes}분</span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden ml-6">
                        <div
                          className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${(card.minutes / maxMin) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty */}
          {report.total_sessions === 0 && (
            <div className="text-center py-10">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-sm font-semibold text-gray-700">아직 이용 기록이 없어요</p>
              <p className="text-xs text-gray-400 mt-1">아이가 스피커를 이용하면 여기에 표시돼요</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-10">데이터를 불러올 수 없어요</p>
      )}
    </div>
  );
}
