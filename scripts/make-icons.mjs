// One-off: generate Selah app icons from SVG. Run: node scripts/make-icons.mjs
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

const BG = '#1B1B1D';
const FG = '#F1ECE3';

// lucide "book-open" mark, centered + scaled into a 1024 canvas
const book = `<g transform="translate(248,248) scale(22)" fill="none" stroke="${FG}" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 7v14"/>
  <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>
</g>`;

const full = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="${BG}"/>${book}</svg>`;
const mark = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">${book}</svg>`;

const render = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size }, background: 'rgba(0,0,0,0)' }).render().asPng();

const dir = 'assets/images/';
writeFileSync(dir + 'icon.png', render(full, 1024));
writeFileSync(dir + 'adaptive-icon.png', render(mark, 1024));
writeFileSync(dir + 'splash-icon.png', render(mark, 1024));
writeFileSync(dir + 'favicon.png', render(full, 96));
console.log('Generated icon.png, adaptive-icon.png, splash-icon.png, favicon.png');
