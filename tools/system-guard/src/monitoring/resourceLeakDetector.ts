/**
 * AutoPrint SystemGuard — Resource Leak & System Degradation Detector
 */

import os from 'os';
import v8 from 'v8';
import fs from 'fs';
import { ResourceMetrics } from '../types';
import { GUARD_CONFIG, GUARD_PATHS } from '../config';
import { logger } from '../reporting/structuredLogger';

export class ResourceLeakDetector {
  private memoryHistoryMb: number[] = [];
  private readonly maxHistoryLength = 10;

  public sampleMetrics(): ResourceMetrics {
    const mem = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();

    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
    const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
    const usedMemMb = totalMemMb - freeMemMb;
    const usedPercent = Math.round((usedMemMb / totalMemMb) * 100);

    const heapUsedMb = Math.round(mem.heapUsed / (1024 * 1024));
    const heapTotalMb = Math.round(mem.heapTotal / (1024 * 1024));

    // Track memory progression
    this.memoryHistoryMb.push(heapUsedMb);
    if (this.memoryHistoryMb.length > this.maxHistoryLength) {
      this.memoryHistoryMb.shift();
    }

    const leakWarning = this.evaluateMemoryLeak();
    const isDiskPressure = this.checkDiskPressure();

    // CPU estimation
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const cpuUsagePercent = Math.min(100, Math.round(((loadAvg[0] || 0) / (cpus.length || 1)) * 100));

    const metrics: ResourceMetrics = {
      timestamp: new Date().toISOString(),
      processUptimeSeconds: Math.round(process.uptime()),
      systemUptimeSeconds: Math.round(os.uptime()),
      cpu: {
        usagePercent: cpuUsagePercent,
        loadAverage: loadAvg,
        cores: cpus.length,
      },
      memory: {
        totalMb: totalMemMb,
        freeMb: freeMemMb,
        usedMb: usedMemMb,
        usedPercent,
        heapUsedMb,
        heapTotalMb,
      },
      disk: {
        isDiskPressure,
      },
      leakWarning,
    };

    if (leakWarning) {
      logger.warn(`Resource anomaly detected: ${leakWarning}`);
    }

    return metrics;
  }

  private evaluateMemoryLeak(): string | undefined {
    if (this.memoryHistoryMb.length < 5) return undefined;

    // Check if memory has strictly increased across last 5 samples
    const last5 = this.memoryHistoryMb.slice(-5);
    let strictlyIncreasing = true;
    for (let i = 1; i < last5.length; i++) {
      if (last5[i] <= last5[i - 1]) {
        strictlyIncreasing = false;
        break;
      }
    }

    const initial = last5[0];
    const latest = last5[last5.length - 1];
    const growthPercent = initial > 0 ? ((latest - initial) / initial) * 100 : 0;

    if (strictlyIncreasing && growthPercent >= GUARD_CONFIG.THRESHOLDS.MEMORY_LEAK_GROWTH_RATE_PERCENT) {
      return `Potential unbounded heap growth: heap increased by ${growthPercent.toFixed(1)}% across last 5 intervals (${initial}MB -> ${latest}MB).`;
    }

    if (latest > GUARD_CONFIG.THRESHOLDS.MAX_MEMORY_MB) {
      return `High memory consumption: process heap ${latest}MB exceeds threshold of ${GUARD_CONFIG.THRESHOLDS.MAX_MEMORY_MB}MB.`;
    }

    return undefined;
  }

  private checkDiskPressure(): boolean {
    try {
      // Check if datastore directory is writable and accessible
      if (fs.existsSync(GUARD_PATHS.DATASTORE_ROOT)) {
        const testFile = `${GUARD_PATHS.DATASTORE_ROOT}/.disk_check_${Date.now()}`;
        fs.writeFileSync(testFile, 'ok');
        fs.unlinkSync(testFile);
      }
      return false;
    } catch (err: any) {
      logger.error('Disk write failure or pressure in datastore volume', { error: err.message });
      return true;
    }
  }
}
