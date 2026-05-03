/**
 * generate-icon.js — Renders the VirtualDeck dot-matrix app icon as
 * build/icon.ico (multi-res) + build/icon.png (256px).
 *
 * Usage: node scripts/generate-icon.js
 * Requires: sharp (devDependency)
 */
const sharp = require('sharp');
const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const SIZE = 17;
const PITCH = 8;
const PAD = 4;
const R_ON = 3.2;
const R_OFF = 1.6;
const VB = 140;

const primary = [
  ".................",
  ".................",
  "..#####.###.###..",
  "..#####.###.###..",
  "..#####.###.###..",
  ".................",
  "..###.BBBBB.###..",
  "..###.BBBBB.###..",
  "..###.BBBBB.###..",
  "..###.BBBBB.###..",
  "..###.BBBBB.###..",
  ".................",
  "..###.###.#####..",
  "..###.###.#####..",
  "..###.###.#####..",
  ".................",
  ".................",
];
const palette = { "#": "#E8E8EA", "B": "#3DA9FC" };

function buildSVG() {
  let halo = "", on = "", off = "";
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const cx = PAD + x * PITCH + PITCH / 2;
      const cy = PAD + y * PITCH + PITCH / 2;
      const ch = primary[y]?.[x] ?? ".";
      const isOn = ch !== "." && ch !== " ";
      if (isOn) {
        const c = palette[ch] || "#3DA9FC";
        halo += `<circle cx="${cx}" cy="${cy}" r="${R_ON + 1.6}" fill="${c}" filter="url(#blur)" opacity="0.55"/>`;
        on += `<circle cx="${cx}" cy="${cy}" r="${R_ON}" fill="${c}"/>`;
      } else {
        const fill = (x + y) % 2 ? "#1a1a20" : "#15151a";
        off += `<circle cx="${cx}" cy="${cy}" r="${R_OFF}" fill="${fill}"/>`;
      }
    }
  }
  return `<svg viewBox="0 0 ${VB} ${VB}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="blur"><feGaussianBlur stdDeviation="2.5"/></filter>
    <radialGradient id="vig" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#0a0a0f"/>
      <stop offset="100%" stop-color="#000"/>
    </radialGradient>
  </defs>
  <rect width="${VB}" height="${VB}" rx="22" fill="url(#vig)"/>
  <g>${off}</g>
  <g>${halo}</g>
  <g>${on}</g>
</svg>`;
}

function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * count;
  let dataOffset = headerSize + dirSize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // ICO type
  header.writeUInt16LE(count, 4); // image count

  const dirEntries = [];
  const sizes = [16, 24, 32, 48, 64, 128, 256];

  for (let i = 0; i < count; i++) {
    const entry = Buffer.alloc(dirEntrySize);
    const s = sizes[i];
    entry.writeUInt8(s >= 256 ? 0 : s, 0);   // width (0 = 256)
    entry.writeUInt8(s >= 256 ? 0 : s, 1);   // height
    entry.writeUInt8(0, 2);                    // color palette
    entry.writeUInt8(0, 3);                    // reserved
    entry.writeUInt16LE(1, 4);                 // color planes
    entry.writeUInt16LE(32, 6);                // bits per pixel
    entry.writeUInt32LE(pngBuffers[i].length, 8);  // image size
    entry.writeUInt32LE(dataOffset, 12);           // data offset
    dataOffset += pngBuffers[i].length;
    dirEntries.push(entry);
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

async function main() {
  const svgStr = buildSVG();
  const buildDir = join(__dirname, '..', 'build');
  mkdirSync(buildDir, { recursive: true });

  writeFileSync(join(buildDir, 'icon.svg'), svgStr, 'utf-8');

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const s of sizes) {
    const buf = await sharp(Buffer.from(svgStr))
      .resize(s, s)
      .png()
      .toBuffer();
    pngBuffers.push(buf);
  }

  writeFileSync(join(buildDir, 'icon.png'), pngBuffers[pngBuffers.length - 1]);

  const ico = buildIco(pngBuffers);
  writeFileSync(join(buildDir, 'icon.ico'), ico);

  console.log('Generated: build/icon.svg, build/icon.png (256px), build/icon.ico (multi-res)');
}

main().catch(e => { console.error(e); process.exit(1); });
