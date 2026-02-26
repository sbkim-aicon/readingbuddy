
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

    // 나무 target_code: 32750
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
        console.log("Sense 0 Example Info:", JSON.stringify(senses[0].example_info, null, 2));
    } else {
        console.log("No sense_info found. Checking alternative paths...");
        console.log("Word Info keys:", Object.keys(item.word_info));
    }
}
testApi();
