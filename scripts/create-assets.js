const fs = require('fs');
const zlib = require('zlib');

function makeCRCTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const CRC_TABLE = makeCRCTable();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, typeB, data, crcVal]);
}

function createPNG(width, height, r, g, b, a = 255) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
      rawData[offset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync('./assets/images', { recursive: true });

// #4A90E2 azul principal, #E6F4FE azul claro (background do app)
fs.writeFileSync('./assets/images/icon.png',                    createPNG(1024, 1024, 74, 144, 226));
fs.writeFileSync('./assets/images/android-icon-foreground.png', createPNG(1024, 1024, 74, 144, 226, 0)); // transparente
fs.writeFileSync('./assets/images/android-icon-background.png', createPNG(1024, 1024, 230, 244, 254));
fs.writeFileSync('./assets/images/android-icon-monochrome.png', createPNG(1024, 1024, 255, 255, 255));
fs.writeFileSync('./assets/images/splash-icon.png',             createPNG(200, 200, 74, 144, 226));
fs.writeFileSync('./assets/images/favicon.png',                 createPNG(32, 32, 74, 144, 226));

console.log('Assets criados com sucesso em ./assets/images/');
