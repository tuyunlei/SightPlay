import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useAiCoach } from '../useAiCoach';

import { geminiService, defaultOptions } from './useAiCoach.setup';

vi.mock('../../services/geminiService');

describe('useAiCoach - errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(geminiService.chatWithAiCoach).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAiCoach(defaultOptions));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    const errorMessage = result.current.chatHistory.find((m) => m.text.includes('Error'));
    expect(errorMessage).toBeDefined();
    expect(result.current.isLoadingAi).toBe(false);

    consoleError.mockRestore();
  });
});
