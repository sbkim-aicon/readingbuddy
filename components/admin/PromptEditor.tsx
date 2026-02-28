"use client";

import { useState, useEffect, useCallback } from "react";
import { PromptVersionFile } from "@/lib/types";
import VersionHistory from "./VersionHistory";
import { Save, RotateCcw } from "lucide-react";

interface PromptEditorProps {
  cardId: string;
  cardType: string;
}

interface PromptData {
  card_id: string;
  card_type: string;
  prompt_keys: { key: string; label: string }[];
  prompts: Record<string, PromptVersionFile>;
}

export default function PromptEditor({ cardId, cardType }: PromptEditorProps) {
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [editorContent, setEditorContent] = useState<string>("");
  const [saveLabel, setSaveLabel] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchPromptData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/cards/${cardId}/prompt`);
      if (res.ok) {
        const data: PromptData = await res.json();
        setPromptData(data);
        if (!activeTab && data.prompt_keys.length > 0) {
          setActiveTab(data.prompt_keys[0].key);
          loadVersionContent(data, data.prompt_keys[0].key);
        } else if (activeTab) {
          loadVersionContent(data, activeTab);
        }
      }
    } catch (e) {
      console.error("Failed to fetch prompt data:", e);
    }
  }, [cardId, activeTab]);

  useEffect(() => {
    fetchPromptData();
  }, [cardId]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadVersionContent(data: PromptData, key: string) {
    const vf = data.prompts[key];
    if (vf && vf.active_version_id) {
      const active = vf.versions.find((v) => v.id === vf.active_version_id);
      setEditorContent(active?.content ?? "");
    } else {
      setEditorContent("");
    }
    setIsDirty(false);
  }

  function handleTabChange(key: string) {
    if (isDirty) {
      const confirmed = window.confirm(
        "저장되지 않은 변경사항이 있습니다. 탭을 전환하시겠습니까?"
      );
      if (!confirmed) return;
    }
    setActiveTab(key);
    if (promptData) {
      loadVersionContent(promptData, key);
    }
  }

  async function handleSave() {
    if (!activeTab || !editorContent.trim()) return;
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/admin/cards/${cardId}/prompt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_key: activeTab,
          content: editorContent,
          label: saveLabel || undefined,
        }),
      });

      if (res.ok) {
        setSaveLabel("");
        setIsDirty(false);
        setStatusMessage({ type: "success", text: "새 버전으로 저장되었습니다!" });
        await fetchPromptData();
      } else {
        setStatusMessage({ type: "error", text: "저장에 실패했습니다." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleActivateVersion(versionId: string) {
    try {
      const res = await fetch(`/api/admin/cards/${cardId}/prompt/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_key: activeTab,
          version_id: versionId,
        }),
      });

      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: "이전 버전이 활성화되었습니다!",
        });
        await fetchPromptData();
      }
    } catch {
      setStatusMessage({ type: "error", text: "버전 활성화에 실패했습니다." });
    }
  }

  function handleResetToActive() {
    if (promptData && activeTab) {
      loadVersionContent(promptData, activeTab);
    }
  }

  if (!promptData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <p className="text-gray-400">프롬프트 데이터를 불러오는 중...</p>
      </div>
    );
  }

  const currentVersionFile = promptData.prompts[activeTab];
  const activeVersion = currentVersionFile?.versions.find(
    (v) => v.id === currentVersionFile.active_version_id
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 p-4">
        <h2 className="text-lg font-bold text-[#333333]">Prompt Editor</h2>
        <p className="text-sm text-gray-500 mt-1">
          프롬프트를 수정하고 새 버전으로 저장하세요. 저장 즉시 실제 카드에 반영됩니다.
        </p>
      </div>

      {/* Tabs for read_with_me cards */}
      {cardType === "read_with_me" && (
        <div className="flex border-b border-gray-100">
          {promptData.prompt_keys.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        {/* Editor area */}
        <div className="flex-1 p-4 flex flex-col min-h-0">
          {/* Active version info */}
          {activeVersion && (
            <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                Active: {activeVersion.label}
              </span>
              <span>
                {new Date(activeVersion.created_at).toLocaleString("ko-KR")}
              </span>
            </div>
          )}

          <textarea
            value={editorContent}
            onChange={(e) => {
              setEditorContent(e.target.value);
              setIsDirty(true);
              setStatusMessage(null);
            }}
            className="w-full h-[500px] border border-gray-200 rounded-lg p-4 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            placeholder="프롬프트 내용을 입력하세요..."
            spellCheck={false}
          />

          {/* Save controls */}
          <div className="mt-3 flex items-center gap-3">
            <input
              type="text"
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              placeholder="버전 라벨 (선택사항, 예: 톤 변경)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleResetToActive}
              disabled={!isDirty}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              되돌리기
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="flex items-center gap-1.5 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "저장 중..." : "새 버전으로 저장"}
            </button>
          </div>

          {/* Status message */}
          {statusMessage && (
            <div
              className={`mt-2 text-sm px-3 py-2 rounded-lg ${
                statusMessage.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {statusMessage.text}
            </div>
          )}
        </div>

        {/* Version history sidebar */}
        <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-100">
          <VersionHistory
            versionFile={currentVersionFile}
            onActivate={handleActivateVersion}
            onPreview={(content) => {
              setEditorContent(content);
              setIsDirty(true);
            }}
          />
        </div>
      </div>
    </div>
  );
}
