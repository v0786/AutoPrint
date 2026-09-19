/**
 * AutoPrint SystemGuard — Process Lifecycle, Crash Detector & Watchdog
 */

import http from 'http';
import { ServiceHealth } from '../types';
import { GUARD_CONFIG } from '../config';
import { logger } from '../reporting/structuredLogger';

export class ProcessMonitor {
  private serviceHealthMap: Map<string, ServiceHealth> = new Map();

  constructor() {
    for (const s of GUARD_CONFIG.SERVICES) {
      this.serviceHealthMap.set(s.name, {
        name: s.name,
        port: s.port,
        expectedUrl: s.url,
        isAlive: false,
        consecutiveFailures: 0,
        lastChecked: new Date().toISOString(),
      });
    }
  }

  public async checkAllServices(): Promise<ServiceHealth[]> {
    const results: ServiceHealth[] = [];

    for (const service of GUARD_CONFIG.SERVICES) {
      const state = await this.pingService(service.name, service.port, service.url);
      this.serviceHealthMap.set(service.name, state);
      results.push(state);

      if (!state.isAlive) {
        logger.warn(`Service heartbeat failure: ${service.name} on port ${service.port}`, {
          consecutiveFailures: state.consecutiveFailures,
          error: state.errorMessage,
        });
      }
    }

    return results;
  }

  public getServiceState(name: string): ServiceHealth | undefined {
    return this.serviceHealthMap.get(name);
  }

  private pingService(name: string, port: number, urlString: string): Promise<ServiceHealth> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const existing = this.serviceHealthMap.get(name) || {
        name,
        port,
        expectedUrl: urlString,
        isAlive: false,
        consecutiveFailures: 0,
        lastChecked: new Date().toISOString(),
      };

      try {
        const url = new URL(urlString);
        const req = http.request(
          {
            hostname: url.hostname,
            port: url.port || port,
            path: url.pathname || '/',
            method: 'GET',
            timeout: GUARD_CONFIG.THRESHOLDS.SERVICE_TIMEOUT_MS,
          },
          (res) => {
            const latencyMs = Date.now() - startTime;
            const isOk = res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 500;

            if (isOk) {
              resolve({
                name,
                port,
                expectedUrl: urlString,
                isAlive: true,
                statusCode: res.statusCode,
                latencyMs,
                consecutiveFailures: 0,
                lastChecked: new Date().toISOString(),
              });
            } else {
              resolve({
                name,
                port,
                expectedUrl: urlString,
                isAlive: false,
                statusCode: res.statusCode,
                latencyMs,
                consecutiveFailures: existing.consecutiveFailures + 1,
                lastChecked: new Date().toISOString(),
                errorMessage: `Unexpected HTTP status code: ${res.statusCode}`,
              });
            }
          }
        );

        req.on('timeout', () => {
          req.destroy();
          resolve({
            name,
            port,
            expectedUrl: urlString,
            isAlive: false,
            latencyMs: Date.now() - startTime,
            consecutiveFailures: existing.consecutiveFailures + 1,
            lastChecked: new Date().toISOString(),
            errorMessage: `Connection timed out after ${GUARD_CONFIG.THRESHOLDS.SERVICE_TIMEOUT_MS}ms`,
          });
        });

        req.on('error', (err: any) => {
          resolve({
            name,
            port,
            expectedUrl: urlString,
            isAlive: false,
            latencyMs: Date.now() - startTime,
            consecutiveFailures: existing.consecutiveFailures + 1,
            lastChecked: new Date().toISOString(),
            errorMessage: `Connection refused / error: ${err.message}`,
          });
        });

        req.end();
      } catch (err: any) {
        resolve({
          name,
          port,
          expectedUrl: urlString,
          isAlive: false,
          consecutiveFailures: existing.consecutiveFailures + 1,
          lastChecked: new Date().toISOString(),
          errorMessage: `Ping invocation exception: ${err.message}`,
        });
      }
    });
  }
}
