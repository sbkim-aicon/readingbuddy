
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

    const targetCode = '32750'; // 나무
    const viewUrl = `https://krdict.korean.go.kr/api/view?key=${API_KEY}&method=target_code&q=${targetCode}`;
    const viewRes = await fetch(viewUrl);
    const viewText = await viewRes.text();

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    const jsonObj = parser.parse(viewText);
    const item = jsonObj.channel?.item;

    if (item && item.word_info && item.word_info.pronunciation_info) {
        console.log("pronunciation_info:", JSON.stringify(item.word_info.pronunciation_info, null, 2));
    } else {
        console.log("No pronunciation_info found");
    }
}
testApi();
