const fs = require('fs');
const { KiwiBuilder } = require('kiwi-nlp');

async function test() {
    try {
        const builder = await KiwiBuilder.create('./node_modules/kiwi-nlp/dist/kiwi-wasm.wasm');
        console.log("Builder created, version:", builder.version());
        // In Node, there is usually a default or we can read from filesystem if needed, but wait!
        // Is base.bin available in node_modules? Let's check!
    } catch (e) {
        console.error(e);
    }
}
test();
