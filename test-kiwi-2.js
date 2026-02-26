const { KiwiBuilder } = require('kiwi-nlp');

async function test() {
    try {
        const builder = await KiwiBuilder.create('./node_modules/kiwi-nlp/dist/kiwi-wasm.wasm');
        console.log("KiwiBuilder created, version:", builder.version());

        const kiwi = await builder.build({
            modelFiles: {}, // Empty models
            loadDefaultDict: true,
        });

        const tokens = kiwi.tokenize('안녕하세요! 이건 테스트입니다.');
        console.log("Tokens analyzed:", JSON.stringify(tokens, null, 2));
    } catch (e) {
        console.error("Error during test:", e);
    }
}
test();
