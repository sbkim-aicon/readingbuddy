import fs from "fs/promises";
import path from "path";
import type { SessionLog } from "./types";

export async function logSession(log: Omit<SessionLog, "session_id" | "ended_at" | "talk_guide_generated"> & { started_at: string }): Promise<void> {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const sessionId = crypto.randomUUID();

    const sessionLog: SessionLog = {
      session_id: sessionId,
      talk_guide_generated: false,
      ended_at: now.toISOString(),
      ...log,
    };

    const dir = path.join(process.cwd(), "data", "parent", "sessions");
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `${dateStr}.json`);
    let existing: SessionLog[] = [];
    try {
      const raw = await fs.readFile(filePath, "utf8");
      existing = JSON.parse(raw);
    } catch {
      // 파일 없으면 빈 배열로 시작
    }

    existing.push(sessionLog);
    await fs.writeFile(filePath, JSON.stringify(existing, null, 2), "utf8");
  } catch (err) {
    // 세션 로그 실패가 메인 기능을 방해하지 않도록 에러만 기록
    console.error("[session-logger] Failed to save session log:", err);
  }
}
