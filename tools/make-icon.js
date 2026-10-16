// Generates build/icon.png (512x512) without any dependencies.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const N = 512, px = Buffer.alloc(N * N * 4);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = d => clamp(0.5 - d, 0, 1); // 1px AA from signed distance
const rrect = (x, y, cx, cy, hw, hh, r) => { const dx = Math.abs(x - cx) - (hw - r), dy = Math.abs(y - cy) - (hh - r); return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r; };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const BLUE = [59, 130, 246], PURPLE = [139, 92, 246];
function over(i, rgb, a) { const o = px[i + 3] / 255, na = a + o * (1 - a); if (na <= 0) return; for (let k = 0; k < 3; k++) px[i + k] = (rgb[k] * a + px[i + k] * o * (1 - a)) / na; px[i + 3] = na * 255; }
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const i = (y * N + x) * 4;
  // background tile with diagonal gradient
  over(i, mix(BLUE, PURPLE, (x + y) / (2 * N)), smooth(rrect(x, y, 256, 256, 240, 240, 104)));
  // notebook page
  over(i, [250, 250, 252], smooth(rrect(x, y, 282, 256, 118, 168, 26)));
  // binder tabs on the left
  for (const ty of [176, 256, 336]) over(i, [20, 20, 28], smooth(rrect(x, y, 168, ty, 30, 13, 6.5)));
  // ruled lines
  for (const ly of [200, 256, 312]) over(i, mix(BLUE, PURPLE, 0.5), smooth(rrect(x, y, 304, ly, 66, 8, 4)) * 0.9);
}
// PNG encode
const raw = Buffer.alloc((N * 4 + 1) * N);
for (let y = 0; y < N; y++) { raw[y * (N * 4 + 1)] = 0; px.copy(raw, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4); }
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = b => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
const out = path.join(__dirname, '..', 'build', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, png);
console.log('wrote', out, png.length, 'bytes');
