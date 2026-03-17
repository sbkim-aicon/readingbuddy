import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { generateOpenAIChatResponse } from "@/lib/openai-chat";
import type { TalkGuide, SessionLog } from "@/lib/types";

const GUIDES_DIR = path.join(process.cwd(), "data", "parent", "talk-guides");
const SESSIONS_DIR = path.join(process.cwd(), "data", "parent", "sessions");
const PROMPT_PATH = path.join(process.cwd(), "prompts", "parent", "talk_guide.md");

async function readGuides(profile_id: string): Promise<TalkGuide[]> {
  try {
    const dir = path.join(GUIDES_DIR, profile_id);
    const files = await fs.readdir(dir);
    const guides: TalkGuide[] = [];
    for (const file of files.filter(f => f.endsWith(".json"))) {
      const raw = await fs.readFile(path.join(dir, file), "utf8");
      guides.push(JSON.parse(raw));
    }
    return guides.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
  } catch {
    return [];
  }
}

// GET /api/parent/talk-guide?profile_id=xxx&limit=10
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profile_id = searchParams.get("profile_id") || "";
  const limit = parseInt(searchParams.get("limit") || "20");
  const guide_id = searchParams.get("guide_id");

  if (guide_id && profile_id) {
    try {
      const raw = await fs.readFile(path.join(GUIDES_DIR, profile_id, `${guide_id}.json`), "utf8");
      return NextResponse.json(JSON.parse(raw));
    } catch {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }
  }

  const guides = await readGuides(profile_id);
  return NextResponse.json(guides.slice(0, limit));
}

// POST /api/parent/talk-guide — AI 대화 가이드 생성
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile_id, session_id, card_id, card_title, session_summary } = body;

    if (!profile_id || !card_id) {
      return NextResponse.json({ error: "profile_id and card_id are required" }, { status: 400 });
    }

    const systemPrompt = await fs.readFile(PROMPT_PATH, "utf8");

    const userMessage = `
오늘 세션 정보:
- 카드: ${card_title || card_id}
- 이용 시간: ${Math.round((session_summary?.duration_seconds || 0) / 60)}분
- 다룬 주제: ${(session_summary?.topics_covered || []).join(", ") || "정보 없음"}
- 아이가 한 질문들: ${(session_summary?.child_questions || []).join(", ") || "정보 없음"}
- 아이가 반응한 단어/주제: ${(session_summary?.highlighted_words || []).join(", ") || "정보 없음"}
${session_summary?.game_results ? `- 게임 결과: ${session_summary.game_results.correct_answers}/${session_summary.game_results.total_rounds} 정답` : ""}
${session_summary?.pages_completed ? `- 읽은 페이지: ${session_summary.pages_completed}페이지` : ""}

위 정보를 바탕으로 부모님 대화 가이드를 JSON 형식으로 작성해주세요.
`.trim();

    const aiResponse = await generateOpenAIChatResponse(systemPrompt, userMessage, [], true, "gpt-4o");
    const parsed = JSON.parse(aiResponse);

    const guide: TalkGuide = {
      guide_id: crypto.randomUUID(),
      profile_id,
      session_id: session_id || "",
      card_id,
      card_title: card_title || card_id,
      generated_at: new Date().toISOString(),
      title: parsed.title || "오늘의 대화 주제",
      summary_for_parent: parsed.summary_for_parent || "",
      child_highlight: parsed.child_highlight || "",
      conversation_starters: parsed.conversation_starters || [],
      offline_activities: parsed.offline_activities || [],
      book_recommendations: parsed.book_recommendations || [],
      parent_acknowledged: false,
      conversation_happened: false,
    };

    // 저장
    const dir = path.join(GUIDES_DIR, profile_id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${guide.guide_id}.json`), JSON.stringify(guide, null, 2), "utf8");

    // 세션 로그에 talk_guide_generated 플래그 업데이트
    if (session_id) {
      const dateStr = guide.generated_at.slice(0, 10);
      const sessionFilePath = path.join(SESSIONS_DIR, `${dateStr}.json`);
      try {
        const sessions: SessionLog[] = JSON.parse(await fs.readFile(sessionFilePath, "utf8"));
        const idx = sessions.findIndex(s => s.session_id === session_id);
        if (idx !== -1) {
          sessions[idx].talk_guide_generated = true;
          await fs.writeFile(sessionFilePath, JSON.stringify(sessions, null, 2), "utf8");
        }
      } catch { /* 세션 파일 없으면 무시 */ }
    }

    return NextResponse.json(guide, { status: 201 });
  } catch (error) {
    console.error("Talk guide generation error:", error);
    return NextResponse.json({ error: "가이드 생성에 실패했습니다" }, { status: 500 });
  }
}

// PATCH /api/parent/talk-guide — acknowledged / conversation_happened 업데이트
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { profile_id, guide_id, parent_acknowledged, conversation_happened } = body;

  if (!profile_id || !guide_id) {
    return NextResponse.json({ error: "profile_id and guide_id are required" }, { status: 400 });
  }

  const filePath = path.join(GUIDES_DIR, profile_id, `${guide_id}.json`);
  try {
    const guide: TalkGuide = JSON.parse(await fs.readFile(filePath, "utf8"));
    if (parent_acknowledged !== undefined) guide.parent_acknowledged = parent_acknowledged;
    if (conversation_happened !== undefined) guide.conversation_happened = conversation_happened;
    await fs.writeFile(filePath, JSON.stringify(guide, null, 2), "utf8");
    return NextResponse.json(guide);
  } catch {
    return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  }
}
