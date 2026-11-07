import { randomBytes } from 'node:crypto';

const TTL_MS = 5 * 60_000;
const MAX_ENTRIES = 500;

interface Entry {
  challenge: string;
  expiresAt: number;
}

// Single-process dev database, so an in-memory store is enough; a pending
// challenge is only ever replayed by the browser that asked for it.
const pending = new Map<string, Entry>();

const prune = (): void => {
  const now = Date.now();

  for (const [key, entry] of pending) {
    if (entry.expiresAt <= now) {
      pending.delete(key);
    }
  }
};

export const saveChallenge = (scope: string, challenge: string): void => {
  prune();

  if (pending.size >= MAX_ENTRIES) {
    const oldest = pending.keys().next().value;

    if (oldest !== undefined) {
      pending.delete(oldest);
    }
  }

  pending.set(`${scope}:${randomBytes(6).toString('hex')}`, {
    challenge,
    expiresAt: Date.now() + TTL_MS,
  });
};

export const consumeChallenge = (scope: string, challenge: string): boolean => {
  prune();

  for (const [key, entry] of pending) {
    if (entry.challenge !== challenge || !key.startsWith(`${scope}:`)) {
      continue;
    }

    pending.delete(key);
    return true;
  }

  return false;
};
