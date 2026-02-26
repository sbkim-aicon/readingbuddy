'use server';

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Upload a photo (base64 data URL) and get an English description via GPT-4o Vision.
 */
export async function describePhoto(
    base64DataUrl: string
): Promise<{ success: boolean; description?: string; error?: string }> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: base64DataUrl, detail: 'low' }
                        },
                        {
                            type: 'text',
                            text: 'Describe this photo in 2-3 concise English sentences. Focus on the main subjects, setting, and atmosphere. This description will be used in a Korean language learning context.'
                        }
                    ]
                }
            ],
            max_completion_tokens: 200,
        });

        const description = response.choices[0].message.content?.trim();
        if (!description) throw new Error('No description returned');

        return { success: true, description };
    } catch (error: any) {
        console.error('Vision Error:', error);
        return { success: false, error: error.message };
    }
}
