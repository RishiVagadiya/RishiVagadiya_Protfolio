const fs = require('fs');

function optimizeWav(inputPath, outputPath) {
  const buf = fs.readFileSync(inputPath);
  
  // Verify RIFF header
  const magic = buf.toString('ascii', 0, 4);
  const format = buf.toString('ascii', 8, 12);
  if (magic !== 'RIFF' || format !== 'WAVE') {
    console.error("Not a valid WAV file");
    return;
  }
  
  // Find fmt chunk
  let fmtPos = 12;
  while (fmtPos < buf.length) {
    const chunkId = buf.toString('ascii', fmtPos, fmtPos + 4);
    const chunkSize = buf.readUInt32LE(fmtPos + 4);
    if (chunkId === 'fmt ') {
      break;
    }
    fmtPos += 8 + chunkSize;
  }
  
  if (fmtPos >= buf.length) {
    console.error("fmt chunk not found");
    return;
  }
  
  const numChannels = buf.readUInt16LE(fmtPos + 10);
  const sampleRate = buf.readUInt32LE(fmtPos + 12);
  const bitsPerSample = buf.readUInt16LE(fmtPos + 22);
  
  console.log(`Original: ${numChannels} channels, ${sampleRate}Hz, ${bitsPerSample}-bit`);
  
  // Find data chunk
  let dataPos = 12;
  while (dataPos < buf.length) {
    const chunkId = buf.toString('ascii', dataPos, dataPos + 4);
    const chunkSize = buf.readUInt32LE(dataPos + 4);
    if (chunkId === 'data') {
      break;
    }
    dataPos += 8 + chunkSize;
  }
  
  if (dataPos >= buf.length) {
    console.error("data chunk not found");
    return;
  }
  
  const dataSize = buf.readUInt32LE(dataPos + 4);
  const rawData = buf.slice(dataPos + 8, dataPos + 8 + dataSize);
  
  if (bitsPerSample !== 16) {
    console.error("Only 16-bit WAV is supported for downsampling");
    return;
  }
  
  // Number of 16-bit samples
  const numSamples = dataSize / 2;
  const numFrames = numSamples / numChannels;
  
  // Downsample target: mono, half sample rate (e.g. 44100 -> 22050)
  const targetSampleRate = Math.round(sampleRate / 2);
  const targetChannels = 1;
  
  // Downsampled frames
  const outFrames = Math.floor(numFrames / 2);
  const outBuffer = Buffer.alloc(outFrames * 2); // 1 channel, 16-bit = 2 bytes per frame
  
  for (let i = 0; i < outFrames; i++) {
    // Take average of two original frames (downsampling by 2)
    // And average channels if original was stereo
    let sum = 0;
    
    for (let f = 0; f < 2; f++) {
      const origFrameIdx = i * 2 + f;
      let frameVal = 0;
      
      for (let c = 0; c < numChannels; c++) {
        const sampleIdx = origFrameIdx * numChannels + c;
        if (sampleIdx < numSamples) {
          frameVal += rawData.readInt16LE(sampleIdx * 2);
        }
      }
      
      frameVal /= numChannels;
      sum += frameVal;
    }
    
    const avgSample = Math.round(sum / 2);
    outBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, avgSample)), i * 2);
  }
  
  // Write new WAV file header
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + outBuffer.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(targetChannels, 22);
  header.writeUInt32LE(targetSampleRate, 24);
  header.writeUInt32LE(targetSampleRate * targetChannels * 2, 28); // Byte rate
  header.writeUInt16LE(targetChannels * 2, 32); // Block align
  header.writeUInt16LE(16, 34); // Bits per sample
  header.write('data', 36);
  header.writeUInt32LE(outBuffer.length, 40);
  
  const finalFile = Buffer.concat([header, outBuffer]);
  fs.writeFileSync(outputPath, finalFile);
  
  console.log(`Optimized WAV saved. Size: ${finalFile.length} bytes`);
}

optimizeWav("bycycle_driving_sound.wav", "bycycle_driving_sound.wav");
