const fs = require('fs');
const path = require('path');
const { KiwiBuilder } = require('kiwi-nlp');

async function test() {
    try {
        console.time('init');
        const wasmPath = path.resolve(__dirname, 'node_modules/kiwi-nlp/dist/kiwi-wasm.wasm');
        const builder = await KiwiBuilder.create(wasmPath);
        console.timeEnd('init');

        console.time('build');
        const modelDir = path.resolve(__dirname, 'public/model');
        const files = [
            'combiningRule.txt', 'default.dict', 'extract.mdl',
            'multi.dict', 'sj.morph', 'typo.dict', 'cong.mdl', 'dialect.dict'
        ];

        const modelFiles = {};
        for (const file of files) {
            modelFiles[file] = new Uint8Array(fs.readFileSync(path.join(modelDir, file)));
        }

        const kiwi = await builder.build({
            modelFiles: modelFiles,
            modelType: 'cong',
            loadDefaultDict: true,
        });
        console.timeEnd('build');

        console.time('analyze');
        const sentence = '안녕하세요! 오늘 날씨가 참 좋네요.';
        const tokens = kiwi.tokenize(sentence);
        console.timeEnd('analyze');

        console.log("Tokens count:", tokens.length);
        console.log("First 3 tokens:", JSON.stringify(tokens.slice(0, 3), null, 2));

    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
