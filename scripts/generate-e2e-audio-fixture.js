import { writeFileSync } from 'node:fs';

const outputPath = '/tmp/sightplay-e2e-a4.wav';
const sampleRate = 48_000;
const durationSeconds = 3;
const sampleCount = sampleRate * durationSeconds;
const dataSize = sampleCount * 2;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

for (let index = 0; index < sampleCount; index += 1) {
  const attack = Math.min(1, index / (sampleRate * 0.05));
  const sample = Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.45 * attack;
  buffer.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
}

writeFileSync(outputPath, buffer);
process.stdout.write(`${outputPath}\n`);
