// Generates the PWA launcher icons (a colorful segmented wheel) without any
// image dependencies: pixels are computed directly and encoded as PNG via zlib.
// Run with: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TAU = Math.PI * 2;

const PALETTE = ["#3B82F6", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899"].map(hex);
const WHITE = [255, 255, 255, 255];
const MASKABLE_BG = hex("#0F172A");

function hex(s) {
  return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
}

// --- PNG encoding -----------------------------------------------------------

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(...bufs) {
  let c = -1;
  for (const buf of bufs) for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8), data), 8 + data.length);
  return out;
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Wheel rendering --------------------------------------------------------

function drawWheel(size, { background = null, wheelRatio = 0.48 }) {
  const pixels = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const R = size * wheelRatio;
  const hubR = R * 0.28;
  const lineW = Math.max(1, size * 0.008);
  const SS = 3; // supersampling grid per pixel

  const sample = (dx, dy) => {
    const r = Math.hypot(dx, dy);
    if (r > R) return background;
    if (r <= hubR) return WHITE;
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += TAU;
    const segAngle = TAU / PALETTE.length;
    const m = angle % segAngle;
    if (Math.min(m, segAngle - m) * r < lineW / 2) return WHITE; // segment dividers
    return PALETTE[Math.floor(angle / segAngle) % PALETTE.length];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sr = 0, sg = 0, sb = 0, sa = 0;
      for (let i = 0; i < SS; i++) {
        for (let j = 0; j < SS; j++) {
          const col = sample(x + (j + 0.5) / SS - c, y + (i + 0.5) / SS - c);
          if (col) {
            sr += col[0] * col[3];
            sg += col[1] * col[3];
            sb += col[2] * col[3];
            sa += col[3];
          }
        }
      }
      const o = (y * size + x) * 4;
      if (sa > 0) {
        pixels[o] = Math.round(sr / sa);
        pixels[o + 1] = Math.round(sg / sa);
        pixels[o + 2] = Math.round(sb / sa);
        pixels[o + 3] = Math.round(sa / (SS * SS));
      }
    }
  }
  return encodePng(size, pixels);
}

// --- Outputs ----------------------------------------------------------------

const iconsDir = join(ROOT, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

const outputs = [
  [join(iconsDir, "icon-192.png"), 192, { background: null, wheelRatio: 0.48 }],
  [join(iconsDir, "icon-512.png"), 512, { background: null, wheelRatio: 0.48 }],
  // Maskable icons keep the wheel inside the 40% safe zone on a full-bleed background.
  [join(iconsDir, "icon-maskable-192.png"), 192, { background: MASKABLE_BG, wheelRatio: 0.4 }],
  [join(iconsDir, "icon-maskable-512.png"), 512, { background: MASKABLE_BG, wheelRatio: 0.4 }],
  [join(ROOT, "app", "apple-icon.png"), 180, { background: MASKABLE_BG, wheelRatio: 0.42 }],
];

for (const [path, size, opts] of outputs) {
  writeFileSync(path, drawWheel(size, opts));
  console.log(`wrote ${path} (${size}x${size})`);
}
