const path = require('path');
const kuromoji = require('kuromoji-ko');

const DIC_DIR = path.resolve(__dirname, 'node_modules/kuromoji-ko/dict/');
console.log("Dict path:", DIC_DIR);

kuromoji.builder({ dicPath: DIC_DIR }).build((err, tokenizer) => {
    if (err) {
        console.error("Error building tokenizer:", err);
        return;
    }
    console.log("Tokenizer built successfully!");

    const sentence = '안녕하세요! 오늘 날씨가 좋습니다.';
    const tokens = tokenizer.tokenize(sentence);

    console.log("=== Tokenization Result ===");
    tokens.forEach(t => {
        console.log(JSON.stringify({
            surface: t.surface_form,
            pos: t.pos,
            posDetail: t.pos_detail_1,
            reading: t.reading,
            baseForm: t.basic_form,
        }));
    });
});
