"use client";

import type { DailyUsageSummary } from "@/lib/types";

interface Props {
  days: DailyUsageSummary[];
  maxMinutes?: number;
}

const DAY_LABELS: Record<number, string> = { 0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토" };

export default function UsageChart({ days, maxMinutes }: Props) {
  const peak = maxMinutes ?? Math.max(...days.map(d => d.total_minutes), 1);

  return (
    <div className="flex items-end gap-1.5 h-24">
      {days.map((day) => {
        const pct = peak > 0 ? (day.total_minutes / peak) * 100 : 0;
        const date = new Date(day.date + "T00:00:00");
        const dayLabel = DAY_LABELS[date.getDay()];
        const isToday = day.date === new Date().toISOString().slice(0, 10);

        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end h-16 relative">
              {day.total_minutes > 0 && (
                <span
                  className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 whitespace-nowrap"
                >
                  {day.total_minutes}분
                </span>
              )}
              <div
                className={`w-full rounded-t-md transition-all ${
                  isToday ? "bg-indigo-500" : "bg-indigo-200"
                }`}
                style={{ height: `${Math.max(pct, day.total_minutes > 0 ? 8 : 0)}%` }}
              />
            </div>
            <span
              className={`text-[10px] font-medium ${
                isToday ? "text-indigo-600" : "text-gray-400"
              }`}
            >
              {dayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
