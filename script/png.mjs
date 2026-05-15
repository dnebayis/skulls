import fs from "node:fs";
import zlib from "node:zlib";

function crc32(buffer) {
  let c = ~0;
  for (const b of buffer) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function hexToRgba(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    255,
  ];
}

export function svgRects(svg) {
  return [...svg.matchAll(/<rect ([^>]*)\/>/g)].map(match => {
    const attrs = {};
    for (const attr of match[1].matchAll(/(x|y|width|height|fill)="([^"]+)"/g)) {
      attrs[attr[1]] = attr[2];
    }
    return attrs;
  });
}

export function writeSvgContactSheet(svgs, outputPath, options = {}) {
  const tile = options.tile ?? 256;
  const gap = options.gap ?? 24;
  const width = svgs.length * tile + (svgs.length - 1) * gap;
  const height = tile;
  const pixels = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = 18;
    pixels[i * 4 + 1] = 18;
    pixels[i * 4 + 2] = 18;
    pixels[i * 4 + 3] = 255;
  }

  svgs.forEach((svg, index) => {
    const offsetX = index * (tile + gap);
    for (const rect of svgRects(svg)) {
      const x = Number(rect.x ?? 0);
      const y = Number(rect.y ?? 0);
      const rectWidth = Number(rect.width ?? 256);
      const rectHeight = Number(rect.height ?? 256);
      const [r, g, b, a] = hexToRgba(rect.fill);
      for (let yy = y; yy < y + rectHeight; yy++) {
        for (let xx = x; xx < x + rectWidth; xx++) {
          const px = offsetX + xx;
          if (px < 0 || px >= width || yy < 0 || yy >= height) continue;
          const pointer = (yy * width + px) * 4;
          pixels[pointer] = r;
          pixels[pointer + 1] = g;
          pixels[pointer + 2] = b;
          pixels[pointer + 3] = a;
        }
      }
    }
  });

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  fs.writeFileSync(outputPath, Buffer.concat([
    Buffer.from("\x89PNG\r\n\x1a\n", "binary"),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}
