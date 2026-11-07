import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { NextFunction, Request, Response } from 'express';

const RING_SIZE = 500;
const LAG_TICK_MS = 50;
const MAX_TRUSTED_LAG_MS = 5_000;

interface RouteStat {
  method: string;
  path: string;
  count: number;
  totalMs: number;
  maxMs: number;
}

interface MetricsState {
  runId: string;
  startedAtMs: number;
  requests: number;
  statusCounts: { twoXx: number; threeXx: number; fourXx: number; fiveXx: number };
  uncaughtErrors: number;
  latencies: number[];
  routes: Map<string, RouteStat>;
  peakRssBytes: number;
  lagSamples: number[];
  lagMaxMs: number;
}

export const metricsState: MetricsState = {
  runId: randomUUID().slice(0, 8),
  startedAtMs: Date.now(),
  requests: 0,
  statusCounts: { twoXx: 0, threeXx: 0, fourXx: 0, fiveXx: 0 },
  uncaughtErrors: 0,
  latencies: [],
  routes: new Map(),
  peakRssBytes: process.memoryUsage.rss(),
  lagSamples: [],
  lagMaxMs: 0,
};

const percentile = (sorted: number[], factor: number): number => {
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.min(sorted.length - 1, Math.ceil(factor * sorted.length) - 1);

  return sorted[index];
};

const routeLabel = (req: Request): string => {
  const mounted = typeof req.baseUrl === 'string' ? req.baseUrl : '';
  const pattern =
    req.route?.path !== undefined ? String(req.route.path) : req.path.split('?')[0] || '/';

  const label = `${mounted}${pattern}`.replace(/\/:[A-Za-z0-9_]+/g, '/:id');

  return label.length > 1 ? label.replace(/\/+$/, '') : '/';
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const status = res.statusCode;

    metricsState.requests += 1;

    if (status >= 500) {
      metricsState.statusCounts.fiveXx += 1;
    } else if (status >= 400) {
      metricsState.statusCounts.fourXx += 1;
    } else if (status >= 300) {
      metricsState.statusCounts.threeXx += 1;
    } else {
      metricsState.statusCounts.twoXx += 1;
    }

    if (metricsState.latencies.length >= RING_SIZE) {
      metricsState.latencies.shift();
    }

    metricsState.latencies.push(elapsedMs);

    const label = `${req.method} ${routeLabel(req)}`;
    const existing = metricsState.routes.get(label);

    if (existing) {
      existing.count += 1;
      existing.totalMs += elapsedMs;
      existing.maxMs = Math.max(existing.maxMs, elapsedMs);
    } else {
      metricsState.routes.set(label, {
        method: req.method,
        path: routeLabel(req),
        count: 1,
        totalMs: elapsedMs,
        maxMs: elapsedMs,
      });
    }

    if (metricsState.routes.size > 120) {
      const sorted = [...metricsState.routes.entries()].sort((a, b) => b[1].count - a[1].count);

      metricsState.routes = new Map(sorted.slice(0, 80));
    }
  });

  next();
};

let expectedTick = performance.now() + LAG_TICK_MS;

const lagTimer = setInterval(() => {
  const now = performance.now();
  const drift = Math.max(0, now - expectedTick);

  // Re-anchor every tick so a single stall or clock jump cannot bias the series.
  expectedTick = now + LAG_TICK_MS;

  if (drift > MAX_TRUSTED_LAG_MS) {
    return;
  }

  if (metricsState.lagSamples.length >= 200) {
    metricsState.lagSamples.shift();
  }

  metricsState.lagSamples.push(drift);
  metricsState.lagMaxMs = Math.max(metricsState.lagMaxMs, drift);
  metricsState.peakRssBytes = Math.max(metricsState.peakRssBytes, process.memoryUsage.rss());
}, LAG_TICK_MS);

lagTimer.unref();

export const recordUncaughtError = (): void => {
  metricsState.uncaughtErrors += 1;
};

export interface MetricsSnapshot {
  runId: string;
  uptimeSeconds: number;
  startedAt: string;
  requests: number;
  statusCounts: MetricsState['statusCounts'];
  uncaughtErrors: number;
  latency: {
    samples: number;
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    maxMs: number;
  };
  eventLoop: { meanLagMs: number; maxLagMs: number };
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
    peakRssMb: number;
  };
  routes: Array<RouteStat & { avgMs: number }>;
}

const toMb = (bytes: number): number => Math.round((bytes / 1024 / 1024) * 100) / 100;

export const readMetrics = (): MetricsSnapshot => {
  const sorted = [...metricsState.latencies].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const memory = process.memoryUsage();
  const lagMean =
    metricsState.lagSamples.length > 0
      ? metricsState.lagSamples.reduce((sum, value) => sum + value, 0) /
        metricsState.lagSamples.length
      : 0;

  const routes = [...metricsState.routes.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((route) => ({
      ...route,
      avgMs: Math.round((route.totalMs / route.count) * 100) / 100,
    }));

  return {
    runId: metricsState.runId,
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: new Date(metricsState.startedAtMs).toISOString(),
    requests: metricsState.requests,
    statusCounts: { ...metricsState.statusCounts },
    uncaughtErrors: metricsState.uncaughtErrors,
    latency: {
      samples: sorted.length,
      avgMs: sorted.length > 0 ? Math.round((total / sorted.length) * 100) / 100 : 0,
      p50Ms: Math.round(percentile(sorted, 0.5) * 100) / 100,
      p95Ms: Math.round(percentile(sorted, 0.95) * 100) / 100,
      maxMs: Math.round((sorted.at(-1) ?? 0) * 100) / 100,
    },
    eventLoop: {
      meanLagMs: Math.round(lagMean * 100) / 100,
      maxLagMs: Math.round(metricsState.lagMaxMs * 100) / 100,
    },
    memory: {
      rssMb: toMb(memory.rss),
      heapUsedMb: toMb(memory.heapUsed),
      heapTotalMb: toMb(memory.heapTotal),
      externalMb: toMb(memory.external),
      peakRssMb: toMb(metricsState.peakRssBytes),
    },
    routes,
  };
};
