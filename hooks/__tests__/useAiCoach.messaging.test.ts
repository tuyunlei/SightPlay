import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { AiResponse } from '../../types';
import { useAiCoach } from '../useAiCoach';

import { geminiService, defaultOptions } from './useAiCoach.setup';

vi.mock('../../services/geminiService');

describe('useAiCoach - messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default AI message', () => {
    const { result } = renderHook(() => useAiCoach(defaultOptions));

    expect(result.current.chatHistory).toHaveLength(1);
    expect(result.current.chatHistory[0].role).toBe('ai');
    expect(result.current.chatHistory[0].text).toContain("I'm your music coach");
  });

  it('initializes with Chinese AI message when lang is zh', () => {
    const { result } = renderHook(() =>
      useAiCoach({
        ...defaultOptions,
        lang: 'zh',
      })
    );

    expect(result.current.chatHistory[0].text).toContain('AI教练');
  });

  it('initializes with empty chat input', () => {
    const { result } = renderHook(() => useAiCoach(defaultOptions));

    expect(result.current.chatInput).toBe('');
  });

  it('initializes with isLoadingAi false', () => {
    const { result } = renderHook(() => useAiCoach(defaultOptions));

    expect(result.current.isLoadingAi).toBe(false);
  });

  describe('setChatInput', () => {
    it('updates chat input', () => {
      const { result } = renderHook(() => useAiCoach(defaultOptions));

      act(() => {
        result.current.setChatInput('Hello AI');
      });

      expect(result.current.chatInput).toBe('Hello AI');
    });
  });

  describe('sendMessage', () => {
    it('adds user message to chat history', async () => {
      vi.mocked(geminiService.chatWithAiCoach).mockResolvedValue({
        replyText: 'Hello!',
        challengeData: null,
      });

      const { result } = renderHook(() => useAiCoach(defaultOptions));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      const userMessages = result.current.chatHistory.filter((m) => m.role === 'user');
      expect(userMessages).toHaveLength(1);
      expect(userMessages[0].text).toBe('Hello');
    });

    it('clears chat input after sending', async () => {
      vi.mocked(geminiService.chatWithAiCoach).mockResolvedValue({
        replyText: 'Hello!',
        challengeData: null,
      });

      const { result } = renderHook(() => useAiCoach(defaultOptions));

      act(() => {
        result.current.setChatInput('Hello');
      });

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.chatInput).toBe('');
    });

    it('sets loading state while processing', async () => {
      let resolvePromise: ((value: AiResponse | PromiseLike<AiResponse>) => void) | undefined;
      vi.mocked(geminiService.chatWithAiCoach).mockReturnValue(
        new Promise<AiResponse>((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useAiCoach(defaultOptions));

      act(() => {
        result.current.sendMessage('Hello');
      });

      expect(result.current.isLoadingAi).toBe(true);

      await act(async () => {
        if (!resolvePromise) {
          throw new Error('Expected AI promise resolver to be set');
        }
        resolvePromise({ replyText: 'Hi', challengeData: null });
      });

      await waitFor(() => {
        expect(result.current.isLoadingAi).toBe(false);
      });
    });

    it('adds AI response to chat history', async () => {
      vi.mocked(geminiService.chatWithAiCoach).mockResolvedValue({
        replyText: 'I am your AI coach!',
        challengeData: null,
      });

      const { result } = renderHook(() => useAiCoach(defaultOptions));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      const aiMessages = result.current.chatHistory.filter((m) => m.role === 'ai');
      expect(aiMessages.some((m) => m.text === 'I am your AI coach!')).toBe(true);
    });

    it('does not send empty messages', async () => {
      const { result } = renderHook(() => useAiCoach(defaultOptions));

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(geminiService.chatWithAiCoach).not.toHaveBeenCalled();
    });

    it('does not send while already loading', async () => {
      let resolvePromise: ((value: AiResponse | PromiseLike<AiResponse>) => void) | undefined;
      vi.mocked(geminiService.chatWithAiCoach).mockReturnValue(
        new Promise<AiResponse>((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useAiCoach(defaultOptions));

      act(() => {
        result.current.sendMessage('Hello');
      });

      await act(async () => {
        await result.current.sendMessage('Another message');
      });

      expect(geminiService.chatWithAiCoach).toHaveBeenCalledTimes(1);

      await act(async () => {
        if (!resolvePromise) {
          throw new Error('Expected AI promise resolver to be set');
        }
        resolvePromise({ replyText: 'Hi', challengeData: null });
      });
    });

    it('calls chatWithAiCoach with correct parameters', async () => {
      vi.mocked(geminiService.chatWithAiCoach).mockResolvedValue({
        replyText: 'Response',
        challengeData: null,
      });

      const { result } = renderHook(() =>
        useAiCoach({
          clef: 'bass',
          lang: 'zh',
          onLoadChallenge: vi.fn(() => 5),
        })
      );

      await act(async () => {
        await result.current.sendMessage('Generate a scale');
      });

      expect(geminiService.chatWithAiCoach).toHaveBeenCalledWith('Generate a scale', 'bass', 'zh');
    });
  });

  describe('chatEndRef', () => {
    it('provides a ref object', () => {
      const { result } = renderHook(() => useAiCoach(defaultOptions));

      expect(result.current.chatEndRef).toBeDefined();
      expect(result.current.chatEndRef.current).toBeNull();
    });
  });
});
