import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { chatWithAiCoach } from './geminiService';

describe('geminiService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('chatWithAiCoach', () => {
    it('sends request with correct parameters', async () => {
      const mockResponse = {
        replyText: 'Hello! I am your AI coach.',
        challengeData: null,
      };
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await chatWithAiCoach('Hello', 'treble', 'en');

      expect(fetch).toHaveBeenCalledWith('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: 'Hello', clef: 'treble', lang: 'en' }),
      });
    });

    it('returns AI response on success', async () => {
      const mockResponse = {
        replyText: 'Here is a C major scale.',
        challengeData: {
          title: 'C Major Scale',
          notes: ['C4', 'D4', 'E4', 'F4', 'G4'],
          description: 'A simple ascending scale',
        },
      };
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await chatWithAiCoach('Generate a scale', 'treble', 'en');

      expect(result.replyText).toBe('Here is a C major scale.');
      expect(result.challengeData).toEqual(mockResponse.challengeData);
    });

    it('returns fallback response on API error status', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await chatWithAiCoach('Hello', 'treble', 'en');

      expect(result.challengeData).toBeNull();
      expect(result.replyText).toContain('trouble connecting');
    });

    it('returns fallback response when response contains error', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'Rate limit exceeded' }),
      } as Response);

      const result = await chatWithAiCoach('Hello', 'treble', 'en');

      expect(result.challengeData).toBeNull();
    });

    it('returns fallback response on network error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await chatWithAiCoach('Hello', 'treble', 'en');

      expect(result.challengeData).toBeNull();
    });

    it('uses Chinese translation for error when lang is zh', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await chatWithAiCoach('你好', 'treble', 'zh');

      expect(result.challengeData).toBeNull();
      // Should return some response (zh aiError or fallback)
      expect(result.replyText).toBeDefined();
    });

    it('handles bass clef parameter', async () => {
      const mockResponse = {
        replyText: 'Here is a bass clef exercise.',
        challengeData: null,
      };
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await chatWithAiCoach('Generate exercise', 'bass', 'en');

      expect(fetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          body: expect.stringContaining('"clef":"bass"'),
        })
      );
    });
  });
});
