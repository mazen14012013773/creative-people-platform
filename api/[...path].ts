import type { Request, Response } from 'express';

let app: ((req: Request, res: Response) => void) | null = null;
let initError: string | null = null;

try {
  // Loaded lazily at module scope so a startup misconfiguration (e.g. missing
  // env vars) is reported in the HTTP response instead of an opaque 500.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../server/api/index') as { default: (req: Request, res: Response) => void };
  app = mod.default;
} catch (error) {
  initError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export default function handler(req: Request, res: Response): void {
  if (!app || initError) {
    res.status(500).json({ success: false, error: 'FUNCTION_INIT_FAILED', detail: initError });
    return;
  }
  app(req, res);
}
