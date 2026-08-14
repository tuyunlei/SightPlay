import type { MicrophoneInputPort, MidiPitch } from '@sightplay/practice';

import { detectMidiPitch } from './pitchDetection';

export interface BrowserMicrophoneEnvironment {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  createAudioContext(): AudioContext;
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(handle: number): void;
}

const browserEnvironment: BrowserMicrophoneEnvironment = {
  getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
  createAudioContext: () => new AudioContext(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
};

export function createBrowserMicrophoneInput(
  environment: BrowserMicrophoneEnvironment = browserEnvironment
): MicrophoneInputPort {
  let generation = 0;
  let stream: MediaStream | null = null;
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let frameHandle: number | null = null;

  const stop = () => {
    generation += 1;
    if (frameHandle !== null) environment.cancelFrame(frameHandle);
    frameHandle = null;
    source?.disconnect();
    source = null;
    analyser = null;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    if (context) void context.close();
    context = null;
  };

  const start = async (observer: (pitch: MidiPitch | null) => void) => {
    stop();
    const currentGeneration = generation;
    const nextStream = await environment.getUserMedia({
      audio: { echoCancellation: true, autoGainControl: false, noiseSuppression: false },
    });
    if (generation !== currentGeneration) {
      nextStream.getTracks().forEach((track) => track.stop());
      return;
    }
    try {
      stream = nextStream;
      context = environment.createAudioContext();
      analyser = context.createAnalyser();
      analyser.fftSize = 4_096;
      source = context.createMediaStreamSource(stream);
      source.connect(analyser);
      detectLoop(currentGeneration, observer);
    } catch (error) {
      stop();
      throw error;
    }
  };

  const detectLoop = (currentGeneration: number, observer: (pitch: MidiPitch | null) => void) => {
    if (generation !== currentGeneration || !analyser || !context) return;
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    observer(detectMidiPitch(samples, context.sampleRate));
    frameHandle = environment.requestFrame(() => detectLoop(currentGeneration, observer));
  };

  return { start, stop, dispose: stop };
}
