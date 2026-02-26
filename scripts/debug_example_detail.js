
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

function getApiKey() {
    try {
        const envPath = path.join(process.cwd(), '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        for (let line of lines) {
            if (line.startsWith('KRDICT_API_KEY=')) {
                return line.split('=')[1].replace(/['"]/g, '').trim();
            }
        }
    } catch (e) {
        console.error("Error reading .env.local", e);
    }
    return null;
}

async function testApi() {
    const API_KEY = getApiKey();
    if (!API_KEY) return;

    const targetCode = '32750';
    const viewUrl = `https://krdict.korean.go.kr/api/view?key=${API_KEY}&method=target_code&q=${targetCode}&translated=y&trans_lang=7`;
    const viewRes = await fetch(viewUrl);
    const viewText = await viewRes.text();

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    const jsonObj = parser.parse(viewText);
    const item = jsonObj.channel?.item;

    if (item && item.word_info && item.word_info.sense_info) {
        const senses = Array.isArray(item.word_info.sense_info) ? item.word_info.sense_info : [item.word_info.sense_info];
        const exInfos = Array.isArray(senses[0].example_info) ? senses[0].example_info : [senses[0].example_info];
        console.log("Keys in example_info[0]:", Object.keys(exInfos[0]));
        console.log("Full first example info:", exInfos[0]);
    }
}
testApi();
