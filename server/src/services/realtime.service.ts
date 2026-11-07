import type { Response } from 'express';

type RealtimeEvent = 'message' | 'notification' | 'services' | 'profile' | 'community' | 'support' | 'data' | 'order';
const clients = new Map<string, Set<Response>>();

export const openRealtimeStream = (userId: string, response: Response): (() => void) => {
  response.status(200);
  response.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  response.flushHeaders();
  response.write('retry: 1500\n\n');

  const userClients = clients.get(userId) ?? new Set<Response>();
  userClients.add(response);
  clients.set(userId, userClients);

  const heartbeat = setInterval(() => {
    if (!response.writableEnded) response.write(': keep-alive\n\n');
  }, 20_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    userClients.delete(response);
    if (userClients.size === 0) clients.delete(userId);
  };
  response.on('close', cleanup);
  return cleanup;
};

export const emitRealtimeEvent = (userId: string, type: RealtimeEvent, payload: Record<string, unknown> = {}): void => {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const frame = `event: update\ndata: ${JSON.stringify({ type, ...payload })}\n\n`;
  for (const response of userClients) {
    if (response.writableEnded || response.destroyed) {
      userClients.delete(response);
      continue;
    }
    response.write(frame);
  }
  if (userClients.size === 0) clients.delete(userId);
};

export const emitRealtimeEventToAll = (type: RealtimeEvent): void => {
  for (const userId of clients.keys()) emitRealtimeEvent(userId, type);
};
