import { describe, expect, it } from 'vitest';

import { detectMidiPitch } from './pitchDetection';

function sine(frequency: number, sampleRate = 44_100): Float32Array {
  return Float32Array.from({ length: 4_096 }, (_, index) =>
    Math.fround(0.5 * Math.sin((2 * Math.PI * frequency * index) / sampleRate))
  );
}

describe('pitch detection contract', () => {
  it('maps captured waveforms to the normalized MIDI identity consumed by Practice', () => {
    expect(Number(detectMidiPitch(sine(440), 44_100))).toBe(69);
    expect(Number(detectMidiPitch(sine(261.63), 44_100))).toBe(60);
  });

  it('rejects silence and frequencies outside the supported instrument range', () => {
    expect(detectMidiPitch(new Float32Array(4_096), 44_100)).toBeNull();
    expect(detectMidiPitch(sine(2_000), 44_100)).toBeNull();
  });
});
