export interface ScreenWakeLockHandle {
  release(): Promise<void>;
  onRelease(listener: () => void): () => void;
}

export interface ScreenWakeLockPort {
  isVisible(): boolean;
  request(): Promise<ScreenWakeLockHandle>;
  onVisibilityChange(listener: () => void): () => void;
}
