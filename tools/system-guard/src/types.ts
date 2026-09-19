/**
 * AutoPrint SystemGuard — Domain Types & Interfaces
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type SystemHealthStatus = 'OPTIMAL' | 'DEGRADED' | 'CRITICAL' | 'RECOVERING';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ServiceHealth {
  name: string;
  port: number;
  expectedUrl: string;
  isAlive: boolean;
  statusCode?: number;
  latencyMs?: number;
  pid?: number;
  consecutiveFailures: number;
  lastChecked: string;
  errorMessage?: string;
}

export interface ResourceMetrics {
  timestamp: string;
  processUptimeSeconds: number;
  systemUptimeSeconds: number;
  cpu: {
    usagePercent: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    totalMb: number;
    freeMb: number;
    usedMb: number;
    usedPercent: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  disk: {
    datastoreFreeMb?: number;
    isDiskPressure: boolean;
  };
  leakWarning?: string;
}

export interface FileIntegrityRecord {
  relativePath: string;
  absolutePath: string;
  sha256: string;
  sizeBytes: number;
  lastModifiedMs: number;
}

export interface IntegrityDiff {
  type: 'MODIFIED' | 'MISSING' | 'CORRUPTED' | 'UNEXPECTED';
  relativePath: string;
  expectedHash?: string;
  actualHash?: string;
  expectedSize?: number;
  actualSize?: number;
  timestamp: string;
}

export interface BaselineManifest {
  version: string;
  createdAt: string;
  totalFiles: number;
  systemMetadata: {
    platform: string;
    nodeVersion: string;
    osRelease: string;
    arch: string;
  };
  files: Record<string, FileIntegrityRecord>;
}

export interface AnomalyIssue {
  filePath: string;
  type: 'SYNTAX_ERROR' | 'MALFORMED_CONFIG' | 'LOGIC_FLAW' | 'DANGLING_RESOURCE' | 'CORRUPT_ENCODING';
  severity: IncidentSeverity;
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
}

export interface RecoveryAction {
  id: string;
  timestamp: string;
  type: 'SERVICE_RESTART' | 'FILE_RESTORE' | 'LOCK_CLEANED' | 'ORPHAN_TERMINATED' | 'CACHE_PURGED' | 'WAL_CHECKPOINT';
  target: string;
  success: boolean;
  details: string;
  backoffDelayMs?: number;
  attemptNumber?: number;
}

export interface IncidentReport {
  id: string;
  timestamp: string;
  severity: IncidentSeverity;
  title: string;
  component: string;
  summary: string;
  systemState: {
    healthStatus: SystemHealthStatus;
    os: string;
    nodeVersion: string;
    memoryUsedMb: number;
    freeMemoryMb: number;
    cpuLoad: number;
  };
  telemetry: {
    exceptionType?: string;
    errorMessage?: string;
    stackTrace?: string;
    triggeringInput?: string;
    reproducibilityNotes?: string;
  };
  recentChanges: {
    tamperedFiles: IntegrityDiff[];
    recentLogs: string[];
  };
  recoveryHistory: RecoveryAction[];
  aiAssistantInstructions: string;
  markdownPath?: string;
  jsonPath?: string;
}

export interface SystemHealthReport {
  timestamp: string;
  overallStatus: SystemHealthStatus;
  healthScore: number; // 0 - 100
  services: ServiceHealth[];
  resources: ResourceMetrics;
  integrity: {
    isClean: boolean;
    tamperedCount: number;
    missingCount: number;
    diffs: IntegrityDiff[];
  };
  codeAnomalies: {
    count: number;
    issues: AnomalyIssue[];
  };
  recentRecoveryActions: RecoveryAction[];
  activeIncidentsCount: number;
}
