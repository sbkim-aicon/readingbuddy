
const { romanize } = require('../src/utils/romanization');

function test() {
    console.log("나무 ->", romanize("나무"));
    console.log("학교 ->", romanize("학교"));
    console.log("국립 ->", romanize("국립"));
    console.log("안녕하세요 ->", romanize("안녕하세요"));
}

test();
