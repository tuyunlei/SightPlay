import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import * as geminiService from '../services/geminiService';

import { useAiCoach } from './useAiCoach';


vi.mock('../services/geminiService');

describe('useAiCoach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const defaultOptions = {
    clef: 'treble',
    lang: 'en' as const,
    onLoadChallenge: vi.fn(() => 5),
  };

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
      let resolvePromise: (value: unknown) => void;
      vi.mocked(geminiService.chatWithAiCoach).mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useAiCoach(defaultOptions));

      act(() => {
        result.current.sendMessage('Hello');
      });

      expect(result.current.isLoadingAi).toBe(true);

      await act(async () => {
        resolvePromise!({ replyText: 'Hi', challengeData: null });
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
      let resolvePromise: (value: unknown) => void;
      vi.mocked(geminiService.chatWithAiCoach).mockReturnValue(
        new Promise((resolve) => {
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
        resolvePromise!({ replyText: 'Hi', challengeData: null });
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

  describe('chatEndRef', () => {
    it('provides a ref object', () => {
      const { result } = renderHook(() => useAiCoach(defaultOptions));

      expect(result.current.chatEndRef).toBeDefined();
      expect(result.current.chatEndRef.current).toBeNull();
    });
  });
});
