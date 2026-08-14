export type DecodeResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issue: string };

export const decoded = <T>(value: T): DecodeResult<T> => ({ ok: true, value });

export const rejected = <T>(issue: string): DecodeResult<T> => ({ ok: false, issue });

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export interface UnknownJsonSource {
  json(): Promise<unknown>;
}

export async function readUnknownJson(source: UnknownJsonSource): Promise<unknown> {
  try {
    return await source.json();
  } catch {
    return null;
  }
}

export function parseUnknownJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
