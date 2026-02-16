import { vi } from 'vitest';

import { useUiStore } from '../../../store/uiStore';

// Export mock functions to be used in tests
export const mockCheckSession = vi.fn();
export const mockWriteText = vi.fn().mockResolvedValue(undefined);

// Setup clipboard mock
export function setupClipboardMock() {
  Object.defineProperty(global.navigator, 'clipboard', {
    value: {
      writeText: mockWriteText,
    },
    writable: true,
    configurable: true,
  });
}

// Mock window.confirm
export const originalConfirm = window.confirm;

export function setupTestEnvironment() {
  vi.clearAllMocks();
  useUiStore.setState({ lang: 'en' });
  global.fetch = vi.fn();
  window.confirm = vi.fn(() => true);
  mockWriteText.mockClear();
}

export function cleanupTestEnvironment() {
  window.confirm = originalConfirm;
}
