const fs = require('fs');
const PNG = require('pngjs').PNG;

fs.createReadStream('C:\\Users\\ccm\\.gemini\\antigravity\\brain\\1c4771b1-d4aa-4406-bab4-ff4ee9efdad3\\media__1772168427215.png')
    .pipe(new PNG({ filterType: 4 }))
    .on('parsed', function () {
        let bgFound = null;
        let w = this.width, h = this.height;

        // Scan from top-middle downwards to find the top edge of the video box
        let x = Math.floor(w / 2);
        for (let y = 0; y < h; y++) {
            let i = (w * y + x) << 2;
            let r = this.data[i];
            let g = this.data[i + 1];
            let b = this.data[i + 2];

            // If it's not pure white (255,255,255), we likely hit the video background
            if (r < 255 || g < 255 || b < 255) {
                bgFound = { r, g, b, y };
                break;
            }
        }

        if (bgFound) {
            console.log(`Video top edge at Y=${bgFound.y}. Color: rgb(${bgFound.r}, ${bgFound.g}, ${bgFound.b})`);
            // Let's sample a bit deeper to be safe (10 pixels down)
            let safeY = bgFound.y + 10;
            let diffI = (w * safeY + x) << 2;
            console.log(`Video safe BG (Y=${safeY}): rgb(${this.data[diffI]}, ${this.data[diffI + 1]}, ${this.data[diffI + 2]})`);

            // Convert safe BG to hex
            const toHex = c => c.toString(16).padStart(2, '0');
            const hex = `#${toHex(this.data[diffI])}${toHex(this.data[diffI + 1])}${toHex(this.data[diffI + 2])}`;
            console.log(`Predicted Tailwind Hex: ${hex.toUpperCase()}`);
        } else {
            console.log("No non-white pixels found.");
        }
    });
