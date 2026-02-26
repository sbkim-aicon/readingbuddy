'use server';

import { SpeechifyClient } from "@speechify/api";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const SPEECHIFY_TOKEN = process.env.SPEECHIFY_TOKEN || "5WXNeCUwIKCfNfbVwiLQBMTldwfKNE0FVaZy017l7T8="; // Fallback to provided token for testing
const VOICE_ID = 'vegwJwUYr8zG700eJm0I'; // Updated by user

export async function generateSpeech(
    text: string,
    format: 'mp3_44100_128' | 'pcm_24000' = 'mp3_44100_128',
    provider: 'elevenlabs' | 'speechify' = 'elevenlabs'
): Promise<{ success: boolean; audioData?: string; error?: string }> {
    console.log(`Debug: generateSpeech called with provider=${provider}, format=${format}, text length=${text.length}`);

    if (provider === 'speechify') {
        try {
            const client = new SpeechifyClient({ token: SPEECHIFY_TOKEN });
            // Respect the requested format. Map pcm_24000 to pcm for Speechify.
            const speechifyFormat = format.startsWith('pcm') ? 'pcm' : 'mp3';

            console.log(`Debug: Speechify Request - voiceId: ji-seok, format: ${speechifyFormat}, text: "${text.slice(0, 20)}..."`);
            const response = await client.tts.audio.speech({
                input: text,
                voiceId: "ji-seok",
                audioFormat: speechifyFormat,
                language: "ko-KR",
                model: "simba-multilingual"
            });

            console.log(`Debug: Speechify Response Type: ${typeof response}, Keys: ${Object.keys(response)}`);

            if (!response || !response.audioData) {
                console.error("Speechify Error: No audio data in response", response);
                throw new Error("Speechify returned no audio data");
            }

            console.log(`Debug: AudioData Type: ${response.audioData.constructor.name}, length: ${response.audioData.length}`);

            let base64Audio = "";
            let buffer: Buffer;

            if (typeof response.audioData === 'string') {
                console.log("Debug: Speechify returned base64 string directly.");
                base64Audio = response.audioData;
                buffer = Buffer.from(base64Audio, 'base64');
            } else {
                console.log("Debug: Speechify returned binary data. Encoding to base64...");
                buffer = Buffer.from(response.audioData);
                base64Audio = buffer.toString('base64');
            }

            // Log first 16 bytes for format verification
            console.log(`Debug: Audio Data Start (Hex): ${buffer.slice(0, 16).toString('hex')}`);

            // If we requested PCM but got a RIFF header (WAV), strip the header (44 bytes) 
            // for raw PCM playback (HeyGen). Note: We only strip if we are sending raw PCM.
            if (speechifyFormat === 'pcm' && buffer.slice(0, 4).toString() === 'RIFF') {
                console.log("Debug: Detected WAV header in PCM request, stripping 44 bytes...");
                buffer = buffer.slice(44);
                base64Audio = buffer.toString('base64');
            }

            const mimeType = speechifyFormat === 'pcm' ? 'audio/pcm' : 'audio/mpeg';

            return {
                success: true,
                audioData: `data:${mimeType};base64,${base64Audio}`
            };
        } catch (error: any) {
            console.error('Speechify TTS Generation Error:', error);
            return { success: false, error: error.message };
        }
    }

    // Default to ElevenLabs
    if (!ELEVENLABS_API_KEY) {
        console.error('ElevenLabs API Key is missing');
        return { success: false, error: 'API Key Missing' };
    }

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${format}`, {
            method: 'POST',
            headers: {
                'Accept': format === 'pcm_24000' ? 'audio/pcm' : 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_turbo_v2_5",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API Error: ${response.status} - ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');
        const mimeType = format === 'pcm_24000' ? 'audio/pcm' : 'audio/mpeg';

        return {
            success: true,
            audioData: `data:${mimeType};base64,${base64Audio}`
        };

    } catch (error: any) {
        console.error('TTS Generation Error:', error);
        return { success: false, error: error.message };
    }
}
