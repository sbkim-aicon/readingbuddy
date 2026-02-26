
const fs = require('fs');
const path = require('path');

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
    const viewUrl = `https://krdict.korean.go.kr/api/view?key=${API_KEY}&method=target_code&q=${targetCode}`;
    const viewRes = await fetch(viewUrl);
    const viewText = await viewRes.text();

    console.log("Full XML Structure check for sense[0]:");
    // Print a portion of the XML around the first sense
    const senseMatch = viewText.match(/<sense>([\s\S]+?)<\/sense>/);
    if (senseMatch) {
        console.log(senseMatch[1]);
    } else {
        console.log("No <sense> tag found in view response.");
    }
}
testApi();
