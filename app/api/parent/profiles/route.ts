import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { ChildProfile } from "@/lib/types";

const PROFILES_PATH = path.join(process.cwd(), "data", "parent", "profiles.json");

async function readProfiles(): Promise<ChildProfile[]> {
  try {
    const raw = await fs.readFile(PROFILES_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeProfiles(profiles: ChildProfile[]): Promise<void> {
  await fs.mkdir(path.dirname(PROFILES_PATH), { recursive: true });
  await fs.writeFile(PROFILES_PATH, JSON.stringify(profiles, null, 2), "utf8");
}

export async function GET() {
  const profiles = await readProfiles();
  return NextResponse.json(profiles);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, birth_date, avatar = "🐣", interests = [], language = "ko", daily_limit_minutes = 60 } = body;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const profiles = await readProfiles();
  if (profiles.length >= 5) return NextResponse.json({ error: "최대 5명까지 등록 가능합니다" }, { status: 400 });

  const newProfile: ChildProfile = {
    profile_id: crypto.randomUUID(),
    name,
    birth_date: birth_date || "",
    avatar,
    interests,
    language,
    daily_limit_minutes,
    allowed_card_ids: [],
    created_at: new Date().toISOString(),
  };

  profiles.push(newProfile);
  await writeProfiles(profiles);
  return NextResponse.json(newProfile, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { profile_id, ...updates } = body;

  if (!profile_id) return NextResponse.json({ error: "profile_id is required" }, { status: 400 });

  const profiles = await readProfiles();
  const idx = profiles.findIndex(p => p.profile_id === profile_id);
  if (idx === -1) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  profiles[idx] = { ...profiles[idx], ...updates };
  await writeProfiles(profiles);
  return NextResponse.json(profiles[idx]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profile_id = searchParams.get("profile_id");

  if (!profile_id) return NextResponse.json({ error: "profile_id is required" }, { status: 400 });

  const profiles = await readProfiles();
  const filtered = profiles.filter(p => p.profile_id !== profile_id);
  if (filtered.length === profiles.length) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  await writeProfiles(filtered);
  return NextResponse.json({ success: true });
}
