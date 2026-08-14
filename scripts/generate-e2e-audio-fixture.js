import { writeFileSync } from 'node:fs';

const outputPath = '/tmp/sightplay-e2e-practice-range.wav';
const sampleRate = 48_000;
const lowestMidi = 60;
const highestMidi = 83;
const noteDurationSeconds = 0.25;
const durationSeconds = (highestMidi - lowestMidi + 1) * noteDurationSeconds;
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
  const noteSample = index % Math.round(sampleRate * noteDurationSeconds);
  const noteIndex = Math.floor(index / (sampleRate * noteDurationSeconds));
  const midi = lowestMidi + noteIndex;
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  const attack = Math.min(1, noteSample / (sampleRate * 0.02));
  const release = Math.min(1, (sampleRate * noteDurationSeconds - noteSample) / (sampleRate * 0.02));
  const envelope = Math.min(attack, release);
  const sample = Math.sin((2 * Math.PI * frequency * noteSample) / sampleRate) * 0.45 * envelope;
  buffer.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
}

writeFileSync(outputPath, buffer);
process.stdout.write(`${outputPath}\n`);
