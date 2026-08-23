import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBrowserRoute } from './useBrowserRoute';

describe('browser route adapter', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/library?difficulty=intermediate');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads, writes, and resynchronizes the typed route through browser history', () => {
    const { result } = renderHook(() => useBrowserRoute());

    expect(result.current.route).toEqual({ kind: 'library', difficulty: 'intermediate' });

    act(() => result.current.navigate({ kind: 'songPractice', songId: 'song / 1' }));
    expect(window.location.pathname).toBe('/songs/song%20%2F%201');
    expect(result.current.route).toEqual({ kind: 'songPractice', songId: 'song / 1' });

    act(() => {
      window.history.replaceState(null, '', '/practice');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.route).toEqual({ kind: 'randomPractice' });
  });

  it('does not push a duplicate entry for the current route', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useBrowserRoute());

    act(() => result.current.navigate({ kind: 'library', difficulty: 'intermediate' }));

    expect(pushState).not.toHaveBeenCalled();
  });

  it('removes an application-opened overlay entry instead of duplicating its source', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const { result } = renderHook(() => useBrowserRoute());

    act(() =>
      result.current.navigate({
        kind: 'passkeys',
        returnTo: { kind: 'library', difficulty: 'intermediate' },
      })
    );
    act(() => result.current.dismissEntry({ kind: 'library', difficulty: 'intermediate' }));

    expect(back).toHaveBeenCalledOnce();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('replaces a direct overlay deep link with its safe fallback', () => {
    window.history.replaceState(null, '', '/passkeys?from=library&difficulty=intermediate');
    const { result } = renderHook(() => useBrowserRoute());

    act(() => result.current.dismissEntry({ kind: 'library', difficulty: 'intermediate' }));

    expect(window.location.pathname).toBe('/library');
    expect(window.location.search).toBe('?difficulty=intermediate');
    expect(result.current.route).toEqual({ kind: 'library', difficulty: 'intermediate' });
  });

  it('removes an application-opened song entry so its prior library state remains authoritative', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const { result } = renderHook(() => useBrowserRoute());

    act(() => result.current.navigate({ kind: 'songPractice', songId: 'twinkle-twinkle' }));
    act(() => result.current.dismissEntry({ kind: 'library' }));

    expect(back).toHaveBeenCalledOnce();
  });

  it('removes an application-opened lesson so its prior course state remains authoritative', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const { result } = renderHook(() => useBrowserRoute());

    act(() => result.current.navigate({ kind: 'lessonPractice', lessonId: 'landmark-steps' }));
    act(() => result.current.dismissEntry({ kind: 'course' }));

    expect(back).toHaveBeenCalledOnce();
  });
});
