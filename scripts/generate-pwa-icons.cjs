// Run from the repository root: node scripts/generate-pwa-icons.cjs
const { createCanvas, loadImage } = require('../backend/node_modules/canvas');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
    const root = path.resolve(__dirname, '..');
    const logo = await loadImage(path.join(root, 'frontend/assets/icons/prospect-source.png'));
    const output = path.join(root, 'frontend/assets/icons');
    fs.mkdirSync(output, { recursive: true });
    for (const [name, size, scale] of [
        ['prospect-192.png', 192, 1],
        ['prospect-512.png', 512, 1],
        ['prospect-maskable-512.png', 512, 0.70],
        ['apple-touch-icon.png', 180, 1]
    ]) {
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#00244d';
        ctx.fillRect(0, 0, size, size);
        const factor = size * scale / Math.max(logo.width, logo.height);
        const width = logo.width * factor, height = logo.height * factor;
        ctx.drawImage(logo, (size - width) / 2, (size - height) / 2, width, height);
        fs.writeFileSync(path.join(output, name), canvas.toBuffer('image/png'));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
