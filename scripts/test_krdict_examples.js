
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
    const viewUrl = `https://krdict.korean.go.kr/api/view?key=${API_KEY}&method=target_code&q=32750`;
    const viewRes = await fetch(viewUrl);
    const viewText = await viewRes.text();

    console.log("VIEW XML (Look for examples):");
    const examples = viewText.match(/<example>([\s\S]+?)<\/example>/g);
    if (examples) {
        examples.forEach(e => console.log("Example:", e));
    } else {
        console.log("No <example> directly. Checking <subsense> or similar...");
        // In some cases it's inside <example_info>
        const exampleInfo = viewText.match(/<example_info>([\s\S]+?)<\/example_info>/g);
        if (exampleInfo) {
            exampleInfo.forEach(ei => console.log("Example Info:", ei));
        }
    }
}
testApi();
