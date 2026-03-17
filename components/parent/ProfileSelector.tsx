"use client";

import { Plus } from "lucide-react";
import type { ChildProfile } from "@/lib/types";

interface Props {
  profiles: ChildProfile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd?: () => void;
}

export default function ProfileSelector({ profiles, activeId, onSelect, onAdd }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {profiles.map((profile) => {
        const isActive = profile.profile_id === activeId;
        return (
          <button
            key={profile.profile_id}
            onClick={() => onSelect(profile.profile_id)}
            className={`flex flex-col items-center gap-1 shrink-0 transition-all ${
              isActive ? "opacity-100" : "opacity-50"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all border-2 ${
                isActive
                  ? "border-indigo-500 bg-indigo-50 scale-105"
                  : "border-transparent bg-gray-100"
              }`}
            >
              {profile.avatar}
            </div>
            <span
              className={`text-[10px] font-medium max-w-[48px] truncate ${
                isActive ? "text-indigo-600" : "text-gray-500"
              }`}
            >
              {profile.name}
            </span>
          </button>
        );
      })}

      {profiles.length < 5 && onAdd && (
        <button
          onClick={onAdd}
          className="flex flex-col items-center gap-1 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
            <Plus size={18} className="text-gray-400" />
          </div>
          <span className="text-[10px] text-gray-400">추가</span>
        </button>
      )}
    </div>
  );
}
