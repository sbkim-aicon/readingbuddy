
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
    if (!API_KEY) {
        console.error("No API key found in .env.local");
        return;
    }

    // Test word "나무" (Tree) - very common, likely has audio
    const searchUrl = `https://krdict.korean.go.kr/api/search?key=${API_KEY}&q=나무&part=word`;
    const searchRes = await fetch(searchUrl);
    const searchText = await searchRes.text();

    const targetCodeMatch = searchText.match(/<target_code>(\d+)<\/target_code>/);
    if (targetCodeMatch) {
        const targetCode = targetCodeMatch[1];
        console.log(`Target Code: ${targetCode}`);

        const viewUrl = `https://krdict.korean.go.kr/api/view?key=${API_KEY}&method=target_code&q=${targetCode}`;
        const viewRes = await fetch(viewUrl);
        const viewText = await viewRes.text();

        console.log("\n--- VIEW XML SECTION ---");
        // Look for any link tags
        const links = viewText.match(/<link>([\s\S]+?)<\/link>/g);
        if (links) {
            console.log("Found links:");
            links.forEach(l => console.log(" ", l));
        }

        const multimedia = viewText.match(/<multimedia_info>([\s\S]+?)<\/multimedia_info>/g);
        if (multimedia) {
            console.log("\nFound multimedia_info:");
            multimedia.forEach(m => console.log(m));
        } else {
            console.log("\nNO <multimedia_info> found in the response.");
        }

        const mp3s = viewText.match(/https?:\/\/[^\s<>"]+?\.mp3/g);
        if (mp3s) {
            console.log("\nFound MP3 links:");
            mp3s.forEach(m => console.log(" ", m));
        } else {
            console.log("\nNO .mp3 links found in the whole XML.");
        }
    }
}

testApi();
