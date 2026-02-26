'use server';

export async function getHeyGenToken() {
    try {
        const apiKey = process.env.HEYGEN_API_KEY;
        const avatarId = process.env.HEYGEN_AVATAR_ID;
        const voiceId = process.env.HEYGEN_VOICE_ID;

        if (!apiKey) {
            throw new Error('HEYGEN_API_KEY is not set');
        }
        if (!avatarId) {
            throw new Error('HEYGEN_AVATAR_ID is not set');
        }

        // Construct body for Live Avatar API (LITE Mode for Audio Streaming)
        // Sandbox Mode only supports Wayne: dd73ea75-1218-4ef3-92ce-606d5f7fbc0a
        const body: any = {
            mode: 'LITE', // Changed to LITE for audio streaming support
            avatar_id: 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a', // Wayne for Sandbox
            voice_id: voiceId || '2d5b0e6f3630441a918a22530c515a0c', // Fallback to a default voice if env not set
            video_settings: {
                background: {
                    type: 'color',
                    value: '#FFFFFF'
                }
            },
            is_sandbox: true,
        };

        // In LITE mode, we don't need voice_id/persona as we stream audio
        // or handle TTS locally.

        const response = await fetch('https://api.liveavatar.com/v1/sessions/token', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch token: ${response.status} ${errorText}`);
        }

        const responseData = await response.json();
        console.log("LiveAvatar API Response:", responseData);

        // API returns { data: { session_token: "..." } } based on raw logs.
        // Raw: { code: 1000, data: { session_id: "...", session_token: "..." }, message: "..." }
        const token = responseData.data?.session_token;

        if (!token) {
            return { error: "Token missing in response", raw: responseData };
        }

        return { token };
    } catch (error: any) {
        console.error('Error fetching HeyGen token:', error);
        return { error: error.message };
    }
}
