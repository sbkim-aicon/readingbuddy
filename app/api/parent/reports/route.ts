import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { SessionLog, DailyUsageSummary, WeeklyUsageSummary } from "@/lib/types";

const SESSIONS_DIR = path.join(process.cwd(), "data", "parent", "sessions");

async function readSessionFile(dateStr: string): Promise<SessionLog[]> {
  try {
    const raw = await fs.readFile(path.join(SESSIONS_DIR, `${dateStr}.json`), "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function buildDailySummary(dateStr: string, logs: SessionLog[]): DailyUsageSummary {
  const cardMap = new Map<string, { card_id: string; card_title: string; seconds: number }>();

  for (const log of logs) {
    const existing = cardMap.get(log.card_id);
    if (existing) {
      existing.seconds += log.duration_seconds;
    } else {
      cardMap.set(log.card_id, { card_id: log.card_id, card_title: log.card_title, seconds: log.duration_seconds });
    }
  }

  const totalSeconds = logs.reduce((sum, l) => sum + l.duration_seconds, 0);

  return {
    date: dateStr,
    total_minutes: Math.round(totalSeconds / 60),
    session_count: logs.length,
    cards_used: Array.from(cardMap.values()).map(c => ({
      card_id: c.card_id,
      card_title: c.card_title,
      minutes: Math.round(c.seconds / 60),
    })),
  };
}

// GET /api/parent/reports?profile_id=xxx&period=week|day
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profile_id = searchParams.get("profile_id") || "";
  const period = searchParams.get("period") || "week";
  const days = period === "day" ? 1 : 7;

  const dailySummaries: DailyUsageSummary[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    let logs = await readSessionFile(dateStr);
    if (profile_id) logs = logs.filter(l => l.profile_id === profile_id);
    dailySummaries.push(buildDailySummary(dateStr, logs));
  }

  // 주간 집계
  const topCardMap = new Map<string, { card_id: string; card_title: string; minutes: number }>();
  for (const day of dailySummaries) {
    for (const card of day.cards_used) {
      const existing = topCardMap.get(card.card_id);
      if (existing) {
        existing.minutes += card.minutes;
      } else {
        topCardMap.set(card.card_id, { ...card });
      }
    }
  }

  const weekly: WeeklyUsageSummary = {
    days: dailySummaries.reverse(), // 오래된 날짜 순으로
    total_minutes: dailySummaries.reduce((s, d) => s + d.total_minutes, 0),
    total_sessions: dailySummaries.reduce((s, d) => s + d.session_count, 0),
    top_cards: Array.from(topCardMap.values())
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5),
  };

  return NextResponse.json(weekly);
}
