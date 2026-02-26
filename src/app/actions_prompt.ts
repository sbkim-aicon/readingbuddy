'use server'
import fs from 'fs/promises';
import path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'saved_prompts');

export interface PromptConfig {
    name: string;
    systemPrompt: string;
    feedbackPrompt?: string;
    reviewPrompt?: string;
    variables: { key: string; value: string }[];
    temperature: number;
    ttsProvider?: 'elevenlabs' | 'speechify';
    timestamp: string;
}

export async function savePrompt(config: PromptConfig, mode: string) {
    try {
        const modeDir = path.join(PROMPTS_DIR, mode);
        await fs.mkdir(modeDir, { recursive: true });
        // Use ISO string but sanitize for filename
        const safeName = config.name.replace(/[^a-z0-9가-힣]/gi, '_');
        const filename = `prompt_${safeName}_${Date.now()}.json`;
        await fs.writeFile(path.join(modeDir, filename), JSON.stringify(config, null, 2));
        return { success: true, filename };
    } catch (error) {
        console.error('Failed to save prompt:', error);
        return { success: false, error: String(error) };
    }
}

export async function loadPrompts(mode: string) {
    try {
        const modeDir = path.join(PROMPTS_DIR, mode);
        await fs.mkdir(modeDir, { recursive: true });
        const files = await fs.readdir(modeDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        const prompts = await Promise.all(jsonFiles.map(async (file) => {
            const content = await fs.readFile(path.join(modeDir, file), 'utf-8');
            try {
                const parsed = JSON.parse(content);
                return { filename: file, ...parsed };
            } catch (e) {
                return null;
            }
        }));

        return prompts.filter(p => p !== null).sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    } catch (error) {
        console.error('Failed to load prompts:', error);
        return [];
    }
}
