
const { SpeechifyClient } = require("@speechify/api");

const SPEECHIFY_TOKEN = "5WXNeCUwIKCfNfbVwiLQBMTldwfKNE0FVaZy017l7T8=";

async function checkModels() {
    try {
        const client = new SpeechifyClient({ token: SPEECHIFY_TOKEN });
        const voices = await client.tts.voices.list();

        const idsToCheck = ['ji-seok', 'sang-hoon', 'yoon-jung'];
        const matches = voices.filter(v => idsToCheck.includes(v.id));

        console.log("Details for selected voices:");
        console.log(JSON.stringify(matches, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

checkModels();
