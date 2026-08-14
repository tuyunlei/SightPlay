import { createMidiPitch, type MidiPitch } from '@sightplay/practice';

const SILENCE_RMS = 0.015;
const MIN_FREQUENCY = 50;
const MAX_FREQUENCY = 1_500;

export function detectMidiPitch(samples: Float32Array, sampleRate: number): MidiPitch | null {
  if (samples.length < 3 || !Number.isFinite(sampleRate) || sampleRate <= 0) return null;
  if (rootMeanSquare(samples) < SILENCE_RMS) return null;
  const frequency = autoCorrelate(samples, sampleRate);
  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) return null;
  return createMidiPitch(Math.round(12 * Math.log2(frequency / 440) + 69));
}

function rootMeanSquare(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}

function autoCorrelate(samples: Float32Array, sampleRate: number): number {
  const trimmed = trimQuietEdges(samples);
  if (trimmed.length < 3) return -1;
  const correlation = correlations(trimmed);
  let start = 0;
  while (start + 1 < correlation.length && correlation[start] > correlation[start + 1]) start++;
  let bestPosition = -1;
  let bestValue = -1;
  for (let index = start; index < correlation.length; index++) {
    if (correlation[index] > bestValue) {
      bestValue = correlation[index];
      bestPosition = index;
    }
  }
  if (bestPosition <= 0 || bestPosition >= correlation.length - 1) return -1;
  return sampleRate / interpolatePeak(correlation, bestPosition);
}

function trimQuietEdges(samples: Float32Array): Float32Array {
  const threshold = 0.2;
  let start = 0;
  let end = samples.length - 1;
  for (let index = 0; index < samples.length / 2; index++) {
    if (Math.abs(samples[index]) < threshold) {
      start = index;
      break;
    }
  }
  for (let offset = 1; offset < samples.length / 2; offset++) {
    if (Math.abs(samples[samples.length - offset]) < threshold) {
      end = samples.length - offset;
      break;
    }
  }
  return samples.slice(start, end);
}

function correlations(samples: Float32Array): number[] {
  return Array.from({ length: samples.length }, (_, lag) => {
    let value = 0;
    for (let index = 0; index < samples.length - lag; index++) {
      value += samples[index] * samples[index + lag];
    }
    return value;
  });
}

function interpolatePeak(values: readonly number[], position: number): number {
  const left = values[position - 1];
  const center = values[position];
  const right = values[position + 1];
  const curvature = (left + right - 2 * center) / 2;
  const slope = (right - left) / 2;
  return curvature === 0 ? position : position - slope / (2 * curvature);
}
