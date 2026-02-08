import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useUiStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    act(() => useUiStore.setState({ lang: 'zh' }));
  });

  it('defaults to zh', () => {
    expect(useUiStore.getState().lang).toBe('zh');
  });

  it('setLang changes language', () => {
    act(() => useUiStore.getState().setLang('en'));
    expect(useUiStore.getState().lang).toBe('en');
  });

  describe('toggleLang', () => {
    it('toggles from zh to en', () => {
      act(() => useUiStore.getState().toggleLang());
      expect(useUiStore.getState().lang).toBe('en');
    });

    it('toggles from en to zh', () => {
      act(() => useUiStore.setState({ lang: 'en' }));
      act(() => useUiStore.getState().toggleLang());
      expect(useUiStore.getState().lang).toBe('zh');
    });

    it('toggles back and forth', () => {
      act(() => useUiStore.getState().toggleLang());
      expect(useUiStore.getState().lang).toBe('en');
      act(() => useUiStore.getState().toggleLang());
      expect(useUiStore.getState().lang).toBe('zh');
    });
  });
});
