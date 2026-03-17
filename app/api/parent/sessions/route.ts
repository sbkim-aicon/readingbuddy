import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { SessionLog } from "@/lib/types";

const SESSIONS_DIR = path.join(process.cwd(), "data", "parent", "sessions");

async function readSessionFile(dateStr: string): Promise<SessionLog[]> {
  try {
    const raw = await fs.readFile(path.join(SESSIONS_DIR, `${dateStr}.json`), "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// GET /api/parent/sessions?profile_id=xxx&days=7  (또는 &date=YYYY-MM-DD)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profile_id = searchParams.get("profile_id");
  const days = parseInt(searchParams.get("days") || "7");
  const date = searchParams.get("date");

  const results: SessionLog[] = [];

  if (date) {
    const logs = await readSessionFile(date);
    results.push(...logs);
  } else {
    // 최근 N일 세션 조회
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const logs = await readSessionFile(dateStr);
      results.push(...logs);
    }
  }

  const filtered = profile_id ? results.filter(s => s.profile_id === profile_id) : results;
  return NextResponse.json(filtered.sort((a, b) => b.started_at.localeCompare(a.started_at)));
}

// POST /api/parent/sessions — 세션 로그 직접 저장 (관리자/테스트용)
export async function POST(req: NextRequest) {
  const body: Partial<SessionLog> = await req.json();

  if (!body.card_id || !body.started_at) {
    return NextResponse.json({ error: "card_id and started_at are required" }, { status: 400 });
  }

  const log: SessionLog = {
    session_id: crypto.randomUUID(),
    profile_id: body.profile_id || "default",
    card_id: body.card_id,
    card_title: body.card_title || body.card_id,
    card_type: body.card_type || "general",
    started_at: body.started_at,
    ended_at: body.ended_at || new Date().toISOString(),
    duration_seconds: body.duration_seconds || 0,
    topics_covered: body.topics_covered || [],
    child_questions: body.child_questions || [],
    highlighted_words: body.highlighted_words || [],
    pages_completed: body.pages_completed,
    game_results: body.game_results,
    talk_guide_generated: false,
  };

  const dateStr = log.started_at.slice(0, 10);
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
  const filePath = path.join(SESSIONS_DIR, `${dateStr}.json`);

  let existing: SessionLog[] = [];
  try {
    existing = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch { /* 새 파일 */ }

  existing.push(log);
  await fs.writeFile(filePath, JSON.stringify(existing, null, 2), "utf8");

  return NextResponse.json(log, { status: 201 });
}
