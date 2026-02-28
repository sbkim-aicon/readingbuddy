import fs from "fs/promises";
import path from "path";
import { PromptVersion, PromptVersionFile } from "./types";

const VERSIONS_DIR = path.join(process.cwd(), "data", "prompt-versions");

function getVersionFilePath(cardId: string, promptKey: string): string {
  return path.join(VERSIONS_DIR, `${cardId}__${promptKey}.json`);
}

export async function getVersionFile(
  cardId: string,
  promptKey: string
): Promise<PromptVersionFile | null> {
  const filePath = getVersionFilePath(cardId, promptKey);
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data) as PromptVersionFile;
  } catch {
    return null;
  }
}

export async function getActivePromptContent(
  cardId: string,
  promptKey: string
): Promise<string | null> {
  const versionFile = await getVersionFile(cardId, promptKey);
  if (!versionFile) return null;

  const activeVersion = versionFile.versions.find(
    (v) => v.id === versionFile.active_version_id
  );
  return activeVersion?.content ?? null;
}

export async function saveNewVersion(
  cardId: string,
  promptKey: string,
  content: string,
  label?: string
): Promise<PromptVersionFile> {
  await fs.mkdir(VERSIONS_DIR, { recursive: true });

  let versionFile = await getVersionFile(cardId, promptKey);

  const newVersion: PromptVersion = {
    id: `v_${Date.now()}`,
    content,
    label: label || `v${(versionFile?.versions.length ?? 0) + 1}`,
    created_at: new Date().toISOString(),
  };

  if (!versionFile) {
    versionFile = {
      card_id: cardId,
      prompt_key: promptKey,
      active_version_id: newVersion.id,
      versions: [newVersion],
    };
  } else {
    versionFile.versions.push(newVersion);
    versionFile.active_version_id = newVersion.id;
  }

  const filePath = getVersionFilePath(cardId, promptKey);
  await fs.writeFile(filePath, JSON.stringify(versionFile, null, 2), "utf8");

  return versionFile;
}

export async function activateVersion(
  cardId: string,
  promptKey: string,
  versionId: string
): Promise<PromptVersionFile | null> {
  const versionFile = await getVersionFile(cardId, promptKey);
  if (!versionFile) return null;

  const version = versionFile.versions.find((v) => v.id === versionId);
  if (!version) return null;

  versionFile.active_version_id = versionId;

  const filePath = getVersionFilePath(cardId, promptKey);
  await fs.writeFile(filePath, JSON.stringify(versionFile, null, 2), "utf8");

  return versionFile;
}

/**
 * Initialize version file from existing prompt file if no versions exist yet.
 */
export async function initializeFromFile(
  cardId: string,
  promptKey: string,
  filePath: string
): Promise<PromptVersionFile> {
  const existing = await getVersionFile(cardId, promptKey);
  if (existing && existing.versions.length > 0) {
    return existing;
  }

  const content = await fs.readFile(filePath, "utf8");
  return saveNewVersion(cardId, promptKey, content, "v1 (original)");
}

/**
 * Get prompt keys for a given card type.
 */
export function getPromptKeysForCardType(
  cardType: string
): { key: string; label: string }[] {
  if (cardType === "read_with_me") {
    return [
      { key: "pre", label: "PRE Reading" },
      { key: "during_dialogic", label: "DURING Dialogic" },
      { key: "post", label: "POST Reading" },
    ];
  }
  return [{ key: "default", label: "System Prompt" }];
}
