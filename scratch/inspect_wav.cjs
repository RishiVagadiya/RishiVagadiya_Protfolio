const fs = require('fs');
const buf = fs.readFileSync('bycycle_driving_sound.wav');
console.log("File length:", buf.length);
console.log("RIFF header:", buf.toString('ascii', 0, 4));
console.log("Size in header:", buf.readUInt32LE(4));
console.log("Format:", buf.toString('ascii', 8, 12));

let pos = 12;
while (pos < buf.length - 8) {
  const chunkId = buf.toString('ascii', pos, pos + 4);
  const chunkSize = buf.readUInt32LE(pos + 4);
  console.log(`Chunk: "${chunkId}", Size: ${chunkSize} bytes at pos: ${pos}`);
  pos += 8 + chunkSize;
  // Prevent infinite loops if chunkSize is 0
  if (chunkSize === 0) {
    break;
  }
}
