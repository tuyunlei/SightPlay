import { createNoteFromMidi } from '../domain/note';
import { Note } from '../types';

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private bufferLength: number = 2048;
  private dataArray: Float32Array = new Float32Array(2048);

  async start(): Promise<void> {
    if (this.audioContext) return;

    try {
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          autoGainControl: false,
          noiseSuppression: false,
        },
      });

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096; // Higher FFT size for better resolution at lower frequencies
      this.bufferLength = this.analyser.fftSize;
      this.dataArray = new Float32Array(this.bufferLength);

      this.source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      this.source.connect(this.analyser);
    } catch (err) {
      console.error('Error accessing microphone', err);
      throw err;
    }
  }

  stop() {
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((track) => track.stop());
      this.microphoneStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // Autocorrelation algorithm for pitch detection
  getPitch(): Note | null {
    if (!this.analyser || !this.audioContext) return null;

    this.analyser.getFloatTimeDomainData(this.dataArray);

    // RMS volume check to reduce noise
    let rms = 0;
    for (let i = 0; i < this.bufferLength; i++) {
      rms += this.dataArray[i] * this.dataArray[i];
    }
    rms = Math.sqrt(rms / this.bufferLength);

    if (rms < 0.015) {
      // Silence threshold
      return null;
    }

    const frequency = this.autoCorrelate(this.dataArray, this.audioContext.sampleRate);

    if (frequency === -1 || frequency < 50 || frequency > 1500) {
      return null;
    }

    // Convert freq to MIDI
    const midiNum = Math.round(12 * (Math.log(frequency / 440) / Math.log(2)) + 69);
    // Use -1 for detected note index to signify it's not part of the sequence
    return createNoteFromMidi(midiNum, -1);
  }

  private autoCorrelate(buf: Float32Array, sampleRate: number): number {
    const SIZE = buf.length;
    let rms = 0;

    // Check signal strength again slightly differently for the algo
    for (let i = 0; i < SIZE; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    // Find a range of interest to optimize
    let r1 = 0;
    let r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) {
        r2 = SIZE - i;
        break;
      }
    }

    const newBuf = buf.slice(r1, r2);
    const newSize = newBuf.length;
    const c = Array.from({ length: newSize }, () => 0);

    for (let i = 0; i < newSize; i++) {
      for (let j = 0; j < newSize - i; j++) {
        c[i] = c[i] + newBuf[j] * newBuf[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1;
    let maxpos = -1;

    for (let i = d; i < newSize; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    // Interpolation for better precision
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }
}
