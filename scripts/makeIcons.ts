// Renders PWA icons + OG image from SVG. Run once: npx tsx scripts/makeIcons.ts
import sharp from 'sharp';

const mark = (pad: number, bg = '#1A73E8', rx = 112) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rx}" fill="${bg}"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 32})">
    <path d="M16 5.5c-4.7 0-8.2 3.6-8.2 8.2 0 5.9 8.2 13 8.2 13s8.2-7.1 8.2-13c0-4.6-3.5-8.2-8.2-8.2z" fill="#FFFFFF"/>
    <circle cx="16" cy="13.6" r="3.2" fill="${bg}"/>
    <path d="M6 26.5h20" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
  </g>
</svg>`;

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FFFFFF"/>
  <g stroke="#F1F3F4" stroke-width="2">${Array.from({ length: 13 }, (_, i) => `<path d="M${i * 100} 0v630"/>`).join('')}${Array.from({ length: 7 }, (_, i) => `<path d="M0 ${i * 100}h1200"/>`).join('')}</g>
  <circle cx="980" cy="330" r="190" fill="none" stroke="#1A73E8" stroke-width="18"/>
  <path d="M980 230c-50 0-87 38-87 87 0 63 87 138 87 138s87-75 87-138c0-49-37-87-87-87z" fill="#1A73E8"/>
  <circle cx="980" cy="314" r="34" fill="#FFFFFF"/>
  <text x="80" y="360" font-family="Arial Narrow, Arial, sans-serif" font-weight="900" font-size="170" fill="#202124" letter-spacing="-4">OUTHERE</text>
    <text x="84" y="450" font-family="Arial, sans-serif" font-weight="600" font-size="34" fill="#5F6368">Courts. Trails. Parks. Events.</text>
</svg>`;

await sharp(Buffer.from(mark(56))).resize(192, 192).png().toFile('public/pwa-192.png');
await sharp(Buffer.from(mark(56))).resize(512, 512).png().toFile('public/pwa-512.png');
await sharp(Buffer.from(mark(120, '#1A73E8', 0))).resize(512, 512).png().toFile('public/pwa-maskable-512.png');
await sharp(Buffer.from(mark(70, '#1A73E8', 0))).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(Buffer.from(og)).png().toFile('public/og.png');
console.log('icons written');
