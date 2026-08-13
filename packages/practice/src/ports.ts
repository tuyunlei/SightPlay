import type { MidiPitch } from './model/types';

export type MidiInputSignal =
  | { readonly kind: 'pressed'; readonly pitch: MidiPitch }
  | { readonly kind: 'released'; readonly pitch: MidiPitch }
  | { readonly kind: 'connectionChanged'; readonly connected: boolean };

export interface MidiInputPort {
  start(observer: (signal: MidiInputSignal) => void): Promise<void>;
  dispose(): void;
}

export interface MicrophoneInputPort {
  start(observer: (pitch: MidiPitch | null) => void): Promise<void>;
  stop(): void;
  dispose(): void;
}

export interface PracticeClockPort {
  now(): number;
}

export interface PracticeSchedulerPort {
  schedule(delayMs: number, task: () => void): () => void;
}

export interface PracticeSeedPort {
  nextSeed(): number;
}

export interface PracticePorts {
  readonly clock: PracticeClockPort;
  readonly scheduler: PracticeSchedulerPort;
  readonly seed: PracticeSeedPort;
  readonly midi: MidiInputPort;
  readonly microphone: MicrophoneInputPort;
}
