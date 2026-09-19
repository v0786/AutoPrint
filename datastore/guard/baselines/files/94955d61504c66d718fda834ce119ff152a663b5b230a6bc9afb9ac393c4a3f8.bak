import { Request, Response } from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { CONFIG, PATHS } from '../config/environment';

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(__dirname, '../../../../');
const guardCli = path.join(workspaceRoot, 'tools', 'system-guard', 'dist', 'bin', 'guard-cli.js');

type ServiceProbe = { name: string; port: number; reachable: boolean; latencyMs: number };

function probe(port: number, pathName: string): Promise<ServiceProbe> {
  return new Promise((resolve) => {
    const started = Date.now();
    const request = http.get({ hostname: '127.0.0.1', port, path: pathName, timeout: 750 }, (response) => {
      response.resume();
      response.once('end', () => resolve({ name: pathName, port, reachable: (response.statusCode || 500) < 500, latencyMs: Date.now() - started }));
    });
    request.once('timeout', () => { request.destroy(); resolve({ name: pathName, port, reachable: false, latencyMs: Date.now() - started }); });
    request.once('error', () => resolve({ name: pathName, port, reachable: false, latencyMs: Date.now() - started }));
  });
}

async function runGuardCommand(command: string): Promise<{ output: string; exitCode: number }> {
  try {
    const result = await execFileAsync(process.execPath, [guardCli, command], { cwd: workspaceRoot, timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
    return { output: `${result.stdout}${result.stderr}`, exitCode: 0 };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; code?: number };
    return { output: `${failure.stdout || ''}${failure.stderr || ''}`, exitCode: typeof failure.code === 'number' ? failure.code : 1 };
  }
}

export class SystemGuardController {
  public static async health(_req: Request, res: Response): Promise<void> {
    const services = await Promise.all([
      probe(CONFIG.PORT, '/health'),
      probe(CONFIG.CUSTOMER_PORT, '/'),
      probe(CONFIG.MERCHANT_PORT, '/'),
    ]);
    const memory = process.memoryUsage();
    const datastoreReady = fs.existsSync(PATHS.DATA_DIR) && fs.existsSync(PATHS.DB_DIR);
    const healthyServices = services.filter((service) => service.reachable).length;
    const score = Math.max(0, Math.min(100, Math.round((healthyServices / services.length) * 75 + (datastoreReady ? 25 : 0))));
    res.status(score >= 50 ? 200 : 503).json({
      ok: score >= 85,
      status: score >= 85 ? 'healthy' : score >= 50 ? 'degraded' : 'critical',
      score,
      checkedAt: new Date().toISOString(),
      services,
      resources: {
        processUptimeSeconds: Math.round(process.uptime()),
        rssMb: Math.round(memory.rss / 1048576),
        heapUsedMb: Math.round(memory.heapUsed / 1048576),
        freeMemoryMb: Math.round(os.freemem() / 1048576),
        totalMemoryMb: Math.round(os.totalmem() / 1048576),
        datastoreReady,
      },
    });
  }

  public static async command(req: Request, res: Response): Promise<void> {
    const command = String(req.params.command || 'status');
    if (!['status', 'scan', 'recover', 'report'].includes(command)) {
      res.status(400).json({ ok: false, error: 'Unsupported SystemGuard command.' });
      return;
    }
    const result = await runGuardCommand(command);
    res.status(result.exitCode === 0 ? 200 : 503).json({ ok: result.exitCode === 0, command, exitCode: result.exitCode, output: result.output.slice(-100000) });
  }
}
