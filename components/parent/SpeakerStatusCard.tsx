"use client";

import { Wifi, WifiOff, Volume2, Clock } from "lucide-react";

interface Props {
  isOnline?: boolean;
  currentCard?: string | null;
  usedMinutes?: number;
  limitMinutes?: number;
}

export default function SpeakerStatusCard({
  isOnline = false,
  currentCard = null,
  usedMinutes = 0,
  limitMinutes = 0,
}: Props) {
  const pct = limitMinutes > 0 ? Math.min((usedMinutes / limitMinutes) * 100, 100) : 0;
  const remaining = limitMinutes > 0 ? Math.max(limitMinutes - usedMinutes, 0) : null;

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Volume2 size={16} />
          </div>
          <span className="font-semibold text-sm">리딩버디 스피커</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <>
              <Wifi size={14} className="text-green-300" />
              <span className="text-xs text-green-300">연결됨</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-white/50" />
              <span className="text-xs text-white/50">오프라인</span>
            </>
          )}
        </div>
      </div>

      {/* Current activity */}
      <div className="bg-white/15 rounded-xl p-3 mb-3">
        {currentCard ? (
          <div>
            <p className="text-xs text-white/70 mb-0.5">지금 이용 중</p>
            <p className="text-sm font-medium truncate">{currentCard}</p>
          </div>
        ) : (
          <p className="text-sm text-white/60">대기 중</p>
        )}
      </div>

      {/* Time usage */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span className="text-xs">오늘 이용 시간</span>
          </div>
          <span className="text-xs font-medium">
            {usedMinutes}분{remaining !== null ? ` / ${limitMinutes}분` : ""}
          </span>
        </div>
        {limitMinutes > 0 && (
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-300" : "bg-white"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {remaining !== null && remaining <= 10 && (
          <p className="text-xs text-yellow-200 mt-1">남은 시간: {remaining}분</p>
        )}
      </div>
    </div>
  );
}
