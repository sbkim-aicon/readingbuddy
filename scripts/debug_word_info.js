
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
    const viewUrl = `https://krdict.korean.go.kr/api/view?key=${API_KEY}&method=target_code&q=${targetCode}`;
    const viewRes = await fetch(viewUrl);
    const viewText = await viewRes.text();

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    const jsonObj = parser.parse(viewText);
    const item = jsonObj.channel?.item;

    if (item && item.word_info) {
        console.log("word_info keys:", Object.keys(item.word_info));
        if (item.word_info.sense_info) {
            const senses = Array.isArray(item.word_info.sense_info) ? item.word_info.sense_info : [item.word_info.sense_info];
            console.log("Number of senses:", senses.length);
            console.log("First sense_info keys:", Object.keys(senses[0]));
            if (senses[0].example_info) {
                const examples = Array.isArray(senses[0].example_info) ? senses[0].example_info : [senses[0].example_info];
                console.log("First example text:", examples[0].example);
            }
        }
    } else {
        console.log("No word_info found in item");
    }
}
testApi();
