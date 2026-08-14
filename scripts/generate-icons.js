// Node.js script to create valid PNG icons without external dependencies using pure Node buffers and zlib
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height) {
  // Minimal PNG generator (RGBA)
  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // color type 6 (RGBA)
  ihdrData.writeUInt8(0, 10); // compression method 0
  ihdrData.writeUInt8(0, 11); // filter method 0
  ihdrData.writeUInt8(0, 12); // interlace method 0
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw Image Data (Filter byte 0 + RGBA pixels)
  // Modern gradient icon with a tab symbol
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // Filter type: None
    const ny = y / height;

    for (let x = 0; x < width; x++) {
      const nx = x / width;
      
      const cx = nx - 0.5;
      const cy = ny - 0.5;
      
      // Modern Indigo/Cyan Gradient
      let r = Math.round(99 * (1 - nx) + 6 * nx);
      let g = Math.round(102 * (1 - ny) + 182 * ny);
      let b = Math.round(241 * (1 - nx * 0.5) + 212 * (nx * 0.5));
      let a = 255;

      // Outer margin
      if (Math.abs(cx) > 0.45 || Math.abs(cy) > 0.45) {
        a = 0;
      }

      // Tab stacks in the center
      const inTab1 = (nx >= 0.22 && nx <= 0.78 && ny >= 0.25 && ny <= 0.42);
      const inTab2 = (nx >= 0.22 && nx <= 0.78 && ny >= 0.46 && ny <= 0.63);
      const inTab3 = (nx >= 0.22 && nx <= 0.78 && ny >= 0.67 && ny <= 0.84);

      if (inTab1 || inTab2 || inTab3) {
        r = 255;
        g = 255;
        b = 255;
        a = 230;

        if (nx >= 0.28 && nx <= 0.35) {
          if (inTab1) { r = 244; g = 63; b = 94; } // Red
          else if (inTab2) { r = 234; g = 179; b = 8; } // Yellow
          else if (inTab3) { r = 34; g = 197; b = 94; } // Green
        }
      }

      rawData.writeUInt8(r, offset++);
      rawData.writeUInt8(g, offset++);
      rawData.writeUInt8(b, offset++);
      rawData.writeUInt8(a, offset++);
    }
  }

  // Deflate compressed IDAT chunk
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = calculateCRC(chunk.subarray(4, 8 + length));
  chunk.writeInt32BE(crc, 8 + length);
  return chunk;
}

function calculateCRC(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

// Main execution
const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach(size => {
  const pngBuffer = createPNG(size, size);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Generated: ${filePath} (${pngBuffer.length} bytes)`);
});
