import { NoteName } from '../types';

export interface MistakeEntry {
  expected: NoteName;
  played: NoteName;
  timestamp: number;
}

export type MistakePattern =
  | { kind: 'note-pair'; noteA: NoteName; noteB: NoteName; count: number }
  | { kind: 'accidentals'; count: number }
  | { kind: 'adjacent'; count: number };

const BUFFER_SIZE = 10;

const ACCIDENTALS = new Set<NoteName>(['C#', 'D#', 'F#', 'G#', 'A#', 'Db', 'Eb', 'Gb', 'Ab', 'Bb']);

const NATURAL_ORDER: NoteName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

function areAdjacent(a: NoteName, b: NoteName): boolean {
  const ia = NATURAL_ORDER.indexOf(a);
  const ib = NATURAL_ORDER.indexOf(b);
  if (ia === -1 || ib === -1) return false;
  const diff = Math.abs(ia - ib);
  return diff === 1 || diff === NATURAL_ORDER.length - 1;
}

function pairKey(a: NoteName, b: NoteName): string {
  return [a, b].sort().join(':');
}

export function createMistakeTracker() {
  const buffer: MistakeEntry[] = [];

  function addMistake(expected: NoteName, played: NoteName): void {
    if (buffer.length >= BUFFER_SIZE) buffer.shift();
    buffer.push({ expected, played, timestamp: Date.now() });
  }

  function getMistakes(): readonly MistakeEntry[] {
    return buffer;
  }

  function getTopConfusions(limit = 3): Array<{ noteA: NoteName; noteB: NoteName; count: number }> {
    const counts = new Map<string, { noteA: NoteName; noteB: NoteName; count: number }>();
    for (const m of buffer) {
      const key = pairKey(m.expected, m.played);
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        const [noteA, noteB] = key.split(':') as [NoteName, NoteName];
        counts.set(key, { noteA, noteB, count: 1 });
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
  }

  function getDifficultNotes(limit = 3): Array<{ note: NoteName; errorCount: number }> {
    const counts = new Map<NoteName, number>();
    for (const m of buffer) {
      counts.set(m.expected, (counts.get(m.expected) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([note, errorCount]) => ({ note, errorCount }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, limit);
  }

  function detectPatterns(): MistakePattern | null {
    if (buffer.length < 2) return null;

    // Check accidentals confusion
    const accidentalMistakes = buffer.filter(
      (m) => ACCIDENTALS.has(m.expected) || ACCIDENTALS.has(m.played)
    );
    if (accidentalMistakes.length >= 3) {
      return { kind: 'accidentals', count: accidentalMistakes.length };
    }

    // Check top note pair
    const top = getTopConfusions(1);
    if (top.length > 0 && top[0].count >= 2) {
      return { kind: 'note-pair', ...top[0] };
    }

    // Check adjacent note confusion
    const adjacentCount = buffer.filter((m) => areAdjacent(m.expected, m.played)).length;
    if (adjacentCount >= 3) {
      return { kind: 'adjacent', count: adjacentCount };
    }

    return null;
  }

  function clear(): void {
    buffer.length = 0;
  }

  return { addMistake, getMistakes, getTopConfusions, getDifficultNotes, detectPatterns, clear };
}
