import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { AudioProcessor } from './audioService';

describe('AudioProcessor', () => {
  let audioProcessor: AudioProcessor;
  let mockAudioContext: {
    createAnalyser: () => unknown;
    createMediaStreamSource: () => unknown;
    close: () => void;
    sampleRate: number;
  };
  let mockAnalyser: {
    fftSize: number;
    getFloatTimeDomainData: (arr: Float32Array) => void;
    connect: () => void;
  };
  let mockMediaStream: {
    getTracks: () => { stop: () => void }[];
  };

  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid-1234',
    });

    mockAnalyser = {
      fftSize: 4096,
      getFloatTimeDomainData: vi.fn(),
      connect: vi.fn(),
    };

    mockAudioContext = {
      createAnalyser: vi.fn(() => mockAnalyser),
      createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
      close: vi.fn(),
      sampleRate: 44100,
    };

    mockMediaStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }]),
    };

    audioProcessor = new AudioProcessor();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('start', () => {
    it('requests microphone access', async () => {
      const getUserMedia = vi.fn().mockResolvedValue(mockMediaStream);
      vi.stubGlobal('navigator', {
        mediaDevices: { getUserMedia },
      });
      vi.stubGlobal('window', {
        AudioContext: vi.fn(() => mockAudioContext),
      });

      await audioProcessor.start();

      expect(getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          autoGainControl: false,
          noiseSuppression: false,
        },
      });
    });

    it('creates audio context and analyser', async () => {
      const getUserMedia = vi.fn().mockResolvedValue(mockMediaStream);
      vi.stubGlobal('navigator', {
        mediaDevices: { getUserMedia },
      });
      const AudioContextMock = vi.fn(() => mockAudioContext);
      vi.stubGlobal('window', {
        AudioContext: AudioContextMock,
      });

      await audioProcessor.start();

      expect(AudioContextMock).toHaveBeenCalled();
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    });

    it('does not reinitialize if already started', async () => {
      const getUserMedia = vi.fn().mockResolvedValue(mockMediaStream);
      vi.stubGlobal('navigator', {
        mediaDevices: { getUserMedia },
      });
      vi.stubGlobal('window', {
        AudioContext: vi.fn(() => mockAudioContext),
      });

      await audioProcessor.start();
      await audioProcessor.start();

      expect(getUserMedia).toHaveBeenCalledTimes(1);
    });

    it('throws error when microphone access fails', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
      vi.stubGlobal('navigator', {
        mediaDevices: { getUserMedia },
      });

      await expect(audioProcessor.start()).rejects.toThrow('Permission denied');

      consoleError.mockRestore();
    });

    it('uses webkitAudioContext as fallback', async () => {
      const getUserMedia = vi.fn().mockResolvedValue(mockMediaStream);
      vi.stubGlobal('navigator', {
        mediaDevices: { getUserMedia },
      });
      const webkitAudioContext = vi.fn(() => mockAudioContext);
      vi.stubGlobal('window', {
        webkitAudioContext,
      });

      await audioProcessor.start();

      expect(webkitAudioContext).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('stops microphone tracks', async () => {
      const stopTrack = vi.fn();
      mockMediaStream = {
        getTracks: vi.fn(() => [{ stop: stopTrack }]),
      };
      const getUserMedia = vi.fn().mockResolvedValue(mockMediaStream);
      vi.stubGlobal('navigator', {
        mediaDevices: { getUserMedia },
      });
      vi.stubGlobal('window', {
        AudioContext: vi.fn(() => mockAudioContext),
      });

      await audioProcessor.start();
      audioProcessor.stop();

      expect(stopTrack).toHaveBeenCalled();
    });

    it('closes audio context', async () => {
      const getUserMedia = vi.fn().mockResolvedValue(mockMediaStream);
      vi.stubGlobal('navigator', {
        mediaDevices: { getUserMedia },
      });
      vi.stubGlobal('window', {
        AudioContext: vi.fn(() => mockAudioContext),
      });

      await audioProcessor.start();
      audioProcessor.stop();

      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('handles stop without start gracefully', () => {
      // Should not throw
      expect(() => audioProcessor.stop()).not.toThrow();
    });
  });

  describe('getPitch', () => {
    it('returns null if not started', () => {
      const result = audioProcessor.getPitch();
      expect(result).toBeNull();
    });

    it('returns null for silence (low RMS)', async () => {
      const getUserMedia = vi.fn().mockResolvedValue(mockMediaStream);
      vi.stubGlobal('navigator', {
        mediaDevices: { getUserMedia },
      });
      vi.stubGlobal('window', {
        AudioContext: vi.fn(() => mockAudioContext),
      });

      mockAnalyser.getFloatTimeDomainData = (arr: Float32Array) => {
        // Fill with near-zero values (silence)
        arr.fill(0.001);
      };

      await audioProcessor.start();
      const result = audioProcessor.getPitch();

      expect(result).toBeNull();
    });

    it('returns Note for valid pitch', async () => {
      const getUserMedia = vi.fn().mockResolvedValue(mockMediaStream);
      vi.stubGlobal('navigator', {
        mediaDevices: { getUserMedia },
      });
      vi.stubGlobal('window', {
        AudioContext: vi.fn(() => mockAudioContext),
      });

      // Generate a simple sine wave at 440Hz (A4)
      const sampleRate = 44100;
      const frequency = 440;
      mockAudioContext.sampleRate = sampleRate;

      mockAnalyser.getFloatTimeDomainData = (arr: Float32Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = 0.5 * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
        }
      };

      await audioProcessor.start();
      const result = audioProcessor.getPitch();

      // Should detect A4 (MIDI 69)
      expect(result).not.toBeNull();
      if (result) {
        expect(result.name).toBe('A');
        expect(result.octave).toBe(4);
        expect(result.midi).toBe(69);
      }
    });

    it('returns null for frequency outside valid range', async () => {
      const getUserMedia = vi.fn().mockResolvedValue(mockMediaStream);
      vi.stubGlobal('navigator', {
        mediaDevices: { getUserMedia },
      });
      vi.stubGlobal('window', {
        AudioContext: vi.fn(() => mockAudioContext),
      });

      // Generate a very high frequency (above 1500Hz threshold)
      const sampleRate = 44100;
      const frequency = 2000;
      mockAudioContext.sampleRate = sampleRate;

      mockAnalyser.getFloatTimeDomainData = (arr: Float32Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = 0.5 * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
        }
      };

      await audioProcessor.start();
      const result = audioProcessor.getPitch();

      expect(result).toBeNull();
    });

    it('detects middle C (C4)', async () => {
      const getUserMedia = vi.fn().mockResolvedValue(mockMediaStream);
      vi.stubGlobal('navigator', {
        mediaDevices: { getUserMedia },
      });
      vi.stubGlobal('window', {
        AudioContext: vi.fn(() => mockAudioContext),
      });

      const sampleRate = 44100;
      const frequency = 261.63; // C4
      mockAudioContext.sampleRate = sampleRate;

      mockAnalyser.getFloatTimeDomainData = (arr: Float32Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = 0.5 * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
        }
      };

      await audioProcessor.start();
      const result = audioProcessor.getPitch();

      expect(result).not.toBeNull();
      if (result) {
        expect(result.name).toBe('C');
        expect(result.octave).toBe(4);
        expect(result.midi).toBe(60);
      }
    });
  });
});
