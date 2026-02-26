'use server'

import fs from 'fs';
import path from 'path';
import { KiwiBuilder } from 'kiwi-nlp';

let kiwiInstance: any = null;

async function getKiwiInstance() {
    if (kiwiInstance) return kiwiInstance;

    try {
        const wasmPath = path.join(process.cwd(), 'node_modules/kiwi-nlp/dist/kiwi-wasm.wasm');
        const builder = await KiwiBuilder.create(wasmPath);

        const modelDir = path.join(process.cwd(), 'public/model');
        const files = [
            'combiningRule.txt', 'default.dict', 'extract.mdl',
            'multi.dict', 'sj.morph', 'typo.dict', 'cong.mdl', 'dialect.dict'
        ];

        const modelFiles: Record<string, Uint8Array> = {};
        for (const file of files) {
            const filePath = path.join(modelDir, file);
            if (fs.existsSync(filePath)) {
                modelFiles[file] = new Uint8Array(fs.readFileSync(filePath));
            }
        }

        kiwiInstance = await builder.build({
            modelFiles: modelFiles,
            modelType: 'cong',
            loadDefaultDict: true,
        });
        return kiwiInstance;
    } catch (err) {
        console.error("Failed to initialize Kiwi on Server:", err);
        throw err;
    }
}

export async function analyzeKoreanSentenceServer(sentence: string) {
    try {
        const kiwi = await getKiwiInstance();
        // tokenize returns an array of TokenInfo
        const morphemes = kiwi.tokenize(sentence);

        // Return only the plain data to the client
        return JSON.parse(JSON.stringify(morphemes));
    } catch (err) {
        console.error("Server Analysis Error:", err);
        return [];
    }
}
