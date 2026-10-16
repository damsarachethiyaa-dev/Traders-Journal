// Copies the latin woff2 files from @fontsource packages into ./fonts and writes fonts/fonts.css (offline fonts).
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'fonts'); fs.mkdirSync(out, { recursive: true });
const sets = [
  ['inter', 'Inter', [400, 500, 600, 700]],
  ['jetbrains-mono', 'JetBrains Mono', [500, 600, 700]],
  ['space-grotesk', 'Space Grotesk', [500, 600, 700]]
];
let css = '/* Bundled fonts so the app works offline */\n';
for (const [pkg, family, weights] of sets) for (const w of weights) {
  const f = `${pkg}-latin-${w}-normal.woff2`;
  const src = path.join(__dirname, '..', 'node_modules', '@fontsource', pkg, 'files', f);
  fs.copyFileSync(src, path.join(out, f));
  css += `@font-face{font-family:'${family}';font-style:normal;font-weight:${w};font-display:swap;src:url(${f}) format('woff2')}\n`;
}
fs.writeFileSync(path.join(out, 'fonts.css'), css);
console.log('fonts copied:', fs.readdirSync(out).length, 'files');
