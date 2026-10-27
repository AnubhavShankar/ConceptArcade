// Writes the share image and app icons into public/ (run with `npm run images`). Pure Node: no dependencies.
// The artwork is the brand tile: an indigo-to-violet gradient with a white diamond.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

export function encodePng(w: number, h: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const rows = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    rows[y * (w * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      rows[o] = r;
      rows[o + 1] = g;
      rows[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const A: [number, number, number] = [0x43, 0x38, 0xca];
const B: [number, number, number] = [0x7c, 0x3a, 0xed];

/** Gradient tile with a white diamond whose half-width is `size` × the shorter side, centred at (cx, cy) in 0..1. */
export function tile(w: number, h: number, size: number, cx = 0.5, cy = 0.5) {
  const short = Math.min(w, h);
  const ss = 3; // samples per axis, so the diamond's edges are smooth
  return (x: number, y: number): [number, number, number] => {
    let inside = 0;
    for (let i = 0; i < ss; i++) for (let j = 0; j < ss; j++) {
      const dx = Math.abs(x + (i + 0.5) / ss - cx * w);
      const dy = Math.abs(y + (j + 0.5) / ss - cy * h);
      if (dx + dy <= size * short) inside++;
    }
    const cover = inside / (ss * ss);
    const t = (x / w + y / h) / 2;
    return [lerp(lerp(A[0], B[0], t), 255, cover), lerp(lerp(A[1], B[1], t), 255, cover), lerp(lerp(A[2], B[2], t), 255, cover)];
  };
}

if (process.argv[1] && /gen-images\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  const out = path.resolve(process.cwd(), 'public');
  fs.mkdirSync(out, { recursive: true });
  const files: [string, number, number, number, number?][] = [
    ['icon-192.png', 192, 192, 0.3],
    ['icon-512.png', 512, 512, 0.3],
    ['apple-touch-icon.png', 180, 180, 0.3],
    ['og-image.png', 1200, 630, 0.34],
  ];
  for (const [name, w, h, size] of files) {
    fs.writeFileSync(path.join(out, name), encodePng(w, h, tile(w, h, size)));
    console.log(`wrote public/${name}`);
  }
}
