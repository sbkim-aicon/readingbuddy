"use client";

import { PromptVersionFile } from "@/lib/types";
import { History, CheckCircle, Eye, RotateCcw } from "lucide-react";

interface VersionHistoryProps {
  versionFile: PromptVersionFile | null;
  onActivate: (versionId: string) => void;
  onPreview: (content: string) => void;
}

export default function VersionHistory({
  versionFile,
  onActivate,
  onPreview,
}: VersionHistoryProps) {
  if (!versionFile || versionFile.versions.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-600">Version History</h3>
        </div>
        <p className="text-xs text-gray-400">아직 저장된 버전이 없습니다.</p>
      </div>
    );
  }

  const sortedVersions = [...versionFile.versions].reverse();

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-600">
          Version History ({versionFile.versions.length})
        </h3>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {sortedVersions.map((version) => {
          const isActive = version.id === versionFile.active_version_id;

          return (
            <div
              key={version.id}
              className={`border rounded-lg p-3 text-xs transition-colors ${
                isActive
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isActive && (
                      <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    )}
                    <span className="font-medium text-gray-800 truncate">
                      {version.label}
                    </span>
                  </div>
                  <p className="text-gray-400 mt-1">
                    {new Date(version.created_at).toLocaleString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => onPreview(version.content)}
                  className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="에디터에 불러오기"
                >
                  <Eye className="w-3 h-3" />
                  보기
                </button>
                {!isActive && (
                  <button
                    onClick={() => onActivate(version.id)}
                    className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="이 버전을 활성화"
                  >
                    <RotateCcw className="w-3 h-3" />
                    활성화
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
