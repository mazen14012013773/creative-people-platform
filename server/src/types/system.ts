export interface SystemStatus {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  maintenanceReturnsAt: string | null;
  registrationOpen: boolean;
  serverTime: string;
}

export interface MemoryMetrics {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
  peakRssMb: number;
}

export interface LatencyMetrics {
  samples: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}

export interface TrafficMetrics {
  windowSize: number;
  requests: number;
  statusCounts: {
    twoXx: number;
    threeXx: number;
    fourXx: number;
    fiveXx: number;
  };
  errors: number;
  topRoutes: Array<{ route: string; count: number; avgMs: number }>;
}

export interface RouteLatencySnapshot {
  method: string;
  path: string;
  count: number;
  avgMs: number;
  maxMs: number;
}

export interface SystemHealth {
  status: 'ok' | 'degraded';
  environment: string;
  nodeVersion: string;
  uptimeSeconds: number;
  startedAt: string;
  now: string;
  memory: MemoryMetrics;
  eventLoop: { meanLagMs: number; maxLagMs: number };
  database: { latencyMs: number; sizeMb: number; users: number; sessions: number };
  latency: LatencyMetrics;
  traffic: TrafficMetrics;
  routes: RouteLatencySnapshot[];
  security: {
    blockedIps: number;
    liveSessions: number;
    anonymousSessions: number;
    revokedSessions: number;
    pendingFlags: number;
  };
  growth: {
    signups24h: number;
    profileViews24h: number;
  };
}

export interface ActiveSession {
  id: number;
  userId: string | null;
  name: string | null;
  email: string | null;
  role: 'Freelancer' | 'Buyer' | 'Parent' | 'Admin' | null;
  ip: string;
  userAgent: string;
  device: string;
  firstSeen: string;
  lastSeen: string;
  routeCount: number;
  revokedAt: string | null;
}

export interface IpBlock {
  ip: string;
  reason: string;
  createdAt: string;
  expiresAt: string | null;
  createdByName: string | null;
}

export interface ModerationFlag {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  field: string;
  rule: string;
  severity: 'low' | 'medium' | 'high';
  excerpt: string;
  suggestion: string | null;
  status: 'Pending' | 'Resolved' | 'Dismissed';
  createdAt: string;
  resolvedAt: string | null;
}

export interface ModerationScanResult {
  scanned: number;
  flagged: number;
  skipped: number;
}
