'use server';

import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey });

export async function transcribeAudio(formData: FormData): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            throw new Error('No file uploaded');
        }

        // Convert File to standard Blob/File object compatible with OpenAI SDK if needed
        // Since we are in Node environment (server action), we might need to handle it carefully.
        // OpenAI SDK accepts File/Blob/Buffer.
        // FormData entry 'file' in Server Action is typically a File object.

        const response = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language: 'ko',
            prompt: "This is a Korean language learning session. The audio is a student speaking Korean in a conversation.",
        });

        return { success: true, text: response.text };
    } catch (error: any) {
        console.error('STT Error:', error);
        return { success: false, error: error.message };
    }
}
