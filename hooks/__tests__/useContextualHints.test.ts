import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useContextualHints } from '../useContextualHints';

vi.mock('../../services/geminiService', () => ({
  chatWithAiCoach: vi.fn().mockResolvedValue({ replyText: 'AI hint', challengeData: null }),
}));

describe('useContextualHints', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 100_000 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns null hint initially', () => {
    const { result } = renderHook(() => useContextualHints('en', 'treble'));
    expect(result.current.currentHint).toBeNull();
  });

  it('shows hint after streak threshold', async () => {
    const { result } = renderHook(() => useContextualHints('en', 'treble'));

    // Simulate reaching streak of 5
    for (let i = 1; i <= 5; i++) {
      act(() => result.current.onPracticeUpdate(i, false));
    }
    // Allow the async fetchAiHint promise to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.currentHint).not.toBeNull();
    expect(result.current.currentHint?.type).toBe('encouragement');
  });

  it('shows hint after mistake threshold', async () => {
    const { result } = renderHook(() => useContextualHints('en', 'treble'));

    act(() => result.current.onPracticeUpdate(0, true));
    act(() => result.current.onPracticeUpdate(0, true));
    act(() => result.current.onPracticeUpdate(0, true));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.currentHint).not.toBeNull();
    expect(result.current.currentHint?.type).toBe('tip');
  });

  it('dismisses hint when dismissHint is called', async () => {
    const { result } = renderHook(() => useContextualHints('en', 'treble'));

    act(() => result.current.onPracticeUpdate(0, true));
    act(() => result.current.onPracticeUpdate(0, true));
    act(() => result.current.onPracticeUpdate(0, true));
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.currentHint).not.toBeNull();

    act(() => result.current.dismissHint());
    expect(result.current.currentHint).toBeNull();
  });

  it('rate-limits hints to one per 30 seconds', async () => {
    const { result } = renderHook(() => useContextualHints('en', 'treble'));

    act(() => result.current.onPracticeUpdate(0, true));
    act(() => result.current.onPracticeUpdate(0, true));
    act(() => result.current.onPracticeUpdate(0, true));
    await act(async () => {
      await Promise.resolve();
    });

    const firstHint = result.current.currentHint;
    expect(firstHint).not.toBeNull();

    // Try triggering another immediately — should be rate-limited
    act(() => result.current.onPracticeUpdate(0, true));
    act(() => result.current.onPracticeUpdate(0, true));
    act(() => result.current.onPracticeUpdate(0, true));
    await act(async () => {
      await Promise.resolve();
    });

    // Should still be the same hint (new one was rate-limited)
    expect(result.current.currentHint?.id).toBe(firstHint?.id);
  });

  it('auto-dismisses hint after display timeout', async () => {
    const { result } = renderHook(() => useContextualHints('en', 'treble'));

    act(() => result.current.onPracticeUpdate(0, true));
    act(() => result.current.onPracticeUpdate(0, true));
    act(() => result.current.onPracticeUpdate(0, true));
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.currentHint).not.toBeNull();

    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.currentHint).toBeNull();
  });
});
