import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useAiCoach } from '../useAiCoach';

import { geminiService, defaultOptions } from './useAiCoach.setup';

vi.mock('../../services/geminiService');

describe('useAiCoach - challenges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles challenge data response', async () => {
    const mockChallenge = {
      title: 'C Major Scale',
      notes: ['C4', 'D4', 'E4'],
      description: 'A scale',
    };
    vi.mocked(geminiService.chatWithAiCoach).mockResolvedValue({
      replyText: 'Here is a scale',
      challengeData: mockChallenge,
    });

    const onLoadChallenge = vi.fn(() => 3);
    const { result } = renderHook(() =>
      useAiCoach({
        ...defaultOptions,
        onLoadChallenge,
      })
    );

    await act(async () => {
      await result.current.sendMessage('Generate a scale');
    });

    expect(onLoadChallenge).toHaveBeenCalledWith(mockChallenge);
  });

  it('adds challenge loaded message to chat', async () => {
    const mockChallenge = {
      title: 'C Major Scale',
      notes: ['C4', 'D4', 'E4'],
      description: 'A scale',
    };
    vi.mocked(geminiService.chatWithAiCoach).mockResolvedValue({
      replyText: 'Here is a scale',
      challengeData: mockChallenge,
    });

    const { result } = renderHook(() =>
      useAiCoach({
        ...defaultOptions,
        onLoadChallenge: vi.fn(() => 3),
      })
    );

    await act(async () => {
      await result.current.sendMessage('Generate a scale');
    });

    const loadedMessage = result.current.chatHistory.find(
      (m) => m.text.includes('C Major Scale') && m.text.includes('3 notes')
    );
    expect(loadedMessage).toBeDefined();
    expect(loadedMessage?.hasAction).toBe(true);
  });

  it('does not add loaded message if noteCount is 0', async () => {
    const mockChallenge = {
      title: 'Empty',
      notes: [],
      description: 'Empty',
    };
    vi.mocked(geminiService.chatWithAiCoach).mockResolvedValue({
      replyText: 'Here is a challenge',
      challengeData: mockChallenge,
    });

    const { result } = renderHook(() =>
      useAiCoach({
        ...defaultOptions,
        onLoadChallenge: vi.fn(() => 0),
      })
    );

    await act(async () => {
      await result.current.sendMessage('Generate');
    });

    const loadedMessage = result.current.chatHistory.find((m) => m.text.includes('0 notes'));
    expect(loadedMessage).toBeUndefined();
  });

  it('marks AI response with hasAction when challenge is present', async () => {
    vi.mocked(geminiService.chatWithAiCoach).mockResolvedValue({
      replyText: 'Here is your challenge',
      challengeData: {
        title: 'Test',
        notes: ['C4'],
        description: 'Test',
      },
    });

    const { result } = renderHook(() => useAiCoach(defaultOptions));

    await act(async () => {
      await result.current.sendMessage('Generate');
    });

    const responseMessage = result.current.chatHistory.find(
      (m) => m.text === 'Here is your challenge'
    );
    expect(responseMessage?.hasAction).toBe(true);
  });
});
