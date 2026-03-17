"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Clock, Save } from "lucide-react";
import type { ChildProfile } from "@/lib/types";

const AVATARS = ["🐶", "🐱", "🐻", "🐼", "🦊", "🐸", "🦁", "🐯", "🦄", "🐧"];
const TIME_OPTIONS = [
  { label: "무제한", value: 0 },
  { label: "30분", value: 30 },
  { label: "45분", value: 45 },
  { label: "1시간", value: 60 },
  { label: "1시간 30분", value: 90 },
  { label: "2시간", value: 120 },
];

interface ProfileFormState {
  name: string;
  avatar: string;
  birth_date: string;
  daily_limit_minutes: number;
}

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileFormState>({
    name: "",
    avatar: AVATARS[0],
    birth_date: "",
    daily_limit_minutes: 60,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/parent/profiles");
    setProfiles(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditingId(null);
    setForm({ name: "", avatar: AVATARS[0], birth_date: "", daily_limit_minutes: 60 });
    setShowForm(true);
  };

  const openEdit = (profile: ChildProfile) => {
    setEditingId(profile.profile_id);
    setForm({
      name: profile.name,
      avatar: profile.avatar,
      birth_date: profile.birth_date,
      daily_limit_minutes: profile.daily_limit_minutes,
    });
    setShowForm(true);
  };

  const saveProfile = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch("/api/parent/profiles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile_id: editingId, ...form }),
        });
      } else {
        await fetch("/api/parent/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            interests: [],
            language: "ko",
            allowed_card_ids: [],
          }),
        });
      }
      await load();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteProfile = async (id: string) => {
    if (!confirm("프로필을 삭제할까요?")) return;
    await fetch(`/api/parent/profiles?profile_id=${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="px-4 py-5 space-y-5">
      <h1 className="text-lg font-bold text-gray-800">설정</h1>

      {/* Profiles section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">아이 프로필</h2>
          {profiles.length < 5 && (
            <button
              onClick={openNew}
              className="flex items-center gap-1 text-xs text-indigo-500 font-medium"
            >
              <Plus size={14} />추가
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : profiles.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">등록된 프로필이 없어요</p>
            <button
              onClick={openNew}
              className="mt-3 text-sm text-indigo-500 font-medium"
            >
              + 프로필 추가하기
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map(profile => (
              <div
                key={profile.profile_id}
                className="bg-white border border-gray-100 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm"
              >
                <span className="text-2xl">{profile.avatar}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{profile.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {profile.daily_limit_minutes === 0 ? "무제한" : `하루 ${profile.daily_limit_minutes}분`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(profile)}
                    className="text-xs text-indigo-400 font-medium"
                  >
                    편집
                  </button>
                  <button
                    onClick={() => deleteProfile(profile.profile_id)}
                    className="p-1 text-red-300 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* App info */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">앱 정보</h2>
        <div className="flex justify-between text-xs text-gray-400">
          <span>버전</span><span>0.1.0 (Beta)</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>제작</span><span>리딩버디</span>
        </div>
      </div>

      {/* Profile form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">
                {editingId ? "프로필 편집" : "새 프로필"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-sm">취소</button>
            </div>

            {/* Avatar picker */}
            <div>
              <p className="text-xs text-gray-500 mb-2">아바타 선택</p>
              <div className="flex gap-2 flex-wrap">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    onClick={() => setForm(f => ({ ...f, avatar: a }))}
                    className={`w-10 h-10 rounded-full text-xl flex items-center justify-center border-2 transition-all ${
                      form.avatar === a ? "border-indigo-500 bg-indigo-50 scale-110" : "border-transparent bg-gray-100"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">이름</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="아이 이름"
                maxLength={10}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>

            {/* Birth date */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">생년월일</label>
              <input
                type="date"
                value={form.birth_date}
                onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>

            {/* Daily limit */}
            <div>
              <label className="text-xs text-gray-500 block mb-2">하루 이용 시간 제한</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(f => ({ ...f, daily_limit_minutes: opt.value }))}
                    className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                      form.daily_limit_minutes === opt.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving || !form.name.trim()}
              className="w-full bg-indigo-500 text-white rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:bg-indigo-600 transition-colors"
            >
              <Save size={16} />
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
