import { NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import cosineSimilarity from 'compute-cosine-similarity';

const CACHE_FILE = path.join(process.cwd(), 'data', 'sound_cache.json');
const SOUNDS_DIR = path.join(process.cwd(), 'public', 'sounds', 'generated');
const SIMILARITY_THRESHOLD = 0.85;

interface CachedSound {
    id: string;
    description: string;
    embedding: number[];
    file_url: string;
    created_at: string;
}

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

async function getEmbedding(text: string): Promise<number[]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            input: text,
            model: "text-embedding-3-small",
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenAI Embedding API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
}

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
        }

        // 1. Get embedding for the requested text
        const embedding = await getEmbedding(text);

        // 2. Read Cache
        let cache: CachedSound[] = [];
        try {
            const cacheData = await fs.readFile(CACHE_FILE, 'utf-8');
            cache = JSON.parse(cacheData);
        } catch (e: any) {
            if (e.code !== 'ENOENT') {
                console.error("Error reading cache file:", e);
            }
        }

        // 3. Find most similar sound in cache using Cosine Similarity
        let bestMatch: CachedSound | null = null;
        let highestSimilarity = -1;

        for (const cachedSound of cache) {
            if (cachedSound.embedding && cachedSound.embedding.length > 0) {
                const sim = cosineSimilarity(embedding, cachedSound.embedding);
                if (sim !== null && sim > highestSimilarity) {
                    highestSimilarity = sim;
                    bestMatch = cachedSound;
                }
            }
        }

        // 4. Return cached sound if similarity is above threshold
        if (bestMatch && highestSimilarity >= SIMILARITY_THRESHOLD) {
            console.log(`[Sound Cache Hit] Similarity: ${highestSimilarity.toFixed(2)} for text: "${text}" matched: "${bestMatch.description}"`);
            return NextResponse.json({ url: bestMatch.file_url, cached: true });
        }

        console.log(`[Sound Cache Miss] Generating new sound for: "${text}"`);

        // 5. Generate new sound using ElevenLabs
        let audioStream;
        try {
            audioStream = await elevenlabs.textToSoundEffects.convert({
                text: text,
            });
        } catch (error: any) {
            console.error("ElevenLabs API Error:", error);
            return NextResponse.json({ error: error.message || "ElevenLabs generation failed" }, { status: 500 });
        }

        // 6. Save sound to file
        const id = crypto.randomUUID();
        const fileName = `${id}.mp3`;
        const filePath = path.join(SOUNDS_DIR, fileName);
        const fileUrl = `/sounds/generated/${fileName}`;

        // Convert stream to buffer
        const chunks: Buffer[] = [];
        for await (const chunk of audioStream as any) {
            chunks.push(Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        await fs.writeFile(filePath, buffer);

        // 7. Update Cache
        const newCacheEntry: CachedSound = {
            id,
            description: text,
            embedding,
            file_url: fileUrl,
            created_at: new Date().toISOString()
        };
        cache.push(newCacheEntry);
        await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));

        return NextResponse.json({ url: fileUrl, cached: false });

    } catch (error: unknown) {
        console.error("Sound generation error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
