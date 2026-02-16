export interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface PlatformContext {
  request: Request;
  kv: KVStore;
  env(key: string): string | undefined;
}
