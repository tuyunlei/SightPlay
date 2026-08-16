export const LOOPBACK_HOST = '127.0.0.1';
export const DEFAULT_DEV_PORT = 5173;
export const DEFAULT_E2E_PORT = 4173;
export const DEFAULT_E2E_PREVIEW_PORT = 4174;

export function resolvePort(environmentVariable: string, fallback: number): number {
  const configured = process.env[environmentVariable];
  if (configured === undefined) return fallback;

  const port = Number(configured);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${environmentVariable} must be an integer between 1 and 65535`);
  }

  return port;
}
