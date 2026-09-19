/**
 * PageKite Reverse Proxy & Public Tunnel Connector
 * Manages outbound tunnel connection exposing local Customer Web (:7000)
 * to a secure public URL (https://autoprint.pagekite.me) without router configuration.
 */

import { spawn, ChildProcess } from 'child_process';
import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';

export type TunnelStatus = 'DISABLED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface PageKiteConfig {
  enabled: boolean;
  subdomain: string;
  domain: string;
  secret?: string;
  localPort: number;
  executablePath?: string;
}

export interface TunnelState {
  status: TunnelStatus;
  publicUrl: string | null;
  subdomain: string;
  domain: string;
  localPort: number;
  lastConnectedAt: string | null;
  error: string | null;
}

export class PageKiteConnector extends EventEmitter {
  private config: PageKiteConfig;
  private process: ChildProcess | null = null;
  private state: TunnelState;

  constructor(config: PageKiteConfig) {
    super();
    this.config = {
      ...config,
      subdomain: config.subdomain || 'autoprint',
      domain: config.domain || 'pagekite.me',
      localPort: config.localPort || 7000,
    };

    const cleanSub = (this.config.subdomain || 'autoprint').toLowerCase().trim();
    const publicUrl = `https://${cleanSub}.${this.config.domain || 'pagekite.me'}`;

    this.state = {
      status: this.config.enabled ? 'CONNECTING' : 'DISABLED',
      publicUrl: this.config.enabled ? publicUrl : null,
      subdomain: this.config.subdomain,
      domain: this.config.domain,
      localPort: this.config.localPort,
      lastConnectedAt: null,
      error: null,
    };
  }

  public getState(): TunnelState {
    return { ...this.state };
  }

  public getPublicUrl(): string | null {
    return this.state.publicUrl;
  }

  public static findPythonRuntime(explicitPath?: string): string {
    if (explicitPath && fs.existsSync(explicitPath)) return explicitPath;
    if (process.env.PAGEKITE_PYTHON_PATH && fs.existsSync(process.env.PAGEKITE_PYTHON_PATH)) {
      return process.env.PAGEKITE_PYTHON_PATH;
    }

    const localAppData = process.env.LOCALAPPDATA || '';
    const username = process.env.USERNAME || '';
    const candidatePaths = [
      path.join(localAppData, 'Python/bin/python.exe'),
      path.join(localAppData, 'Microsoft/WindowsApps/python.exe'),
      `C:\\Users\\${username}\\AppData\\Local\\Python\\bin\\python.exe`,
      'C:\\Program Files\\Python312\\python.exe',
      'C:\\Program Files\\Python311\\python.exe',
      'C:\\Program Files\\Python310\\python.exe',
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }

    // Default fallback to PATH commands
    return process.platform === 'win32' ? 'python.exe' : 'python';
  }

  public static findScriptPath(): string | null {
    const cwd = process.cwd();
    const candidatePaths = [
      path.resolve(cwd, 'tools/pagekite/pagekite.py'),
      path.resolve(cwd, 'scripts/pagekite.py'),
      path.resolve(__dirname, 'pagekite.py'),
      path.resolve(__dirname, '../tools/pagekite/pagekite.py'),
      path.resolve(__dirname, '../../tools/pagekite/pagekite.py'),
      path.resolve(__dirname, '../../../tools/pagekite/pagekite.py'),
      path.resolve(__dirname, '../../../../tools/pagekite/pagekite.py'),
      path.resolve(cwd, 'app/connectors/tunnel/pagekite.py'),
      path.resolve(cwd, 'app/backend/src/connectors/pagekite.py'),
      'C:\\Program Files\\AutoPrint\\tools\\pagekite\\pagekite.py',
      'C:\\Program Files\\AutoPrint\\scripts\\pagekite.py',
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  public updateConfig(newConfig: Partial<PageKiteConfig>): TunnelState {
    this.config = { ...this.config, ...newConfig };
    if (this.config.subdomain) {
      const cleanSub = this.config.subdomain.toLowerCase().trim();
      this.state.subdomain = cleanSub;
      this.state.domain = this.config.domain || 'pagekite.me';
      this.state.publicUrl = `https://${cleanSub}.${this.state.domain}`;
    }

    if (!this.config.enabled) {
      this.stop();
      this.state.status = 'DISABLED';
    } else {
      this.start();
    }

    return this.getState();
  }

  /**
   * Performs an automated live test probe of PageKite credentials and connectivity.
   */
  public static async verifyCredentials(options: {
    subdomain: string;
    domain?: string;
    secret?: string;
    localPort?: number;
    timeoutMs?: number;
  }): Promise<{ success: boolean; message: string; publicUrl: string; rawOutput?: string }> {
    const cleanSubdomain = (options.subdomain || '').trim().toLowerCase();
    const domain = options.domain || 'pagekite.me';
    const localPort = options.localPort || 7000;
    const secret = (options.secret || '').trim();
    const timeoutMs = options.timeoutMs || 6000;
    const publicUrl = `https://${cleanSubdomain}.${domain}`;

    if (!cleanSubdomain || !/^[a-z0-9_-]{1,64}$/.test(cleanSubdomain)) {
      return {
        success: false,
        message: 'Invalid PageKite subdomain. Must be 1-64 characters (alphanumeric, dashes, underscores).',
        publicUrl,
      };
    }

    if (!secret || !/^[a-zA-Z0-9_.-]{1,128}$/.test(secret)) {
      return {
        success: false,
        message: 'Invalid PageKite secret key format.',
        publicUrl,
      };
    }

    const scriptPath = PageKiteConnector.findScriptPath();
    if (!scriptPath) {
      return {
        success: false,
        message: 'Bundled pagekite.py script was not found on this computer.',
        publicUrl,
      };
    }

    const pythonCmd = PageKiteConnector.findPythonRuntime();
    const kiteName = `${cleanSubdomain}.${domain}`;
    const serviceArg = `--service_on=http:${kiteName}:localhost:${localPort}:${secret}`;
    const args = [scriptPath, '--defaults', '--clean', serviceArg];

    return new Promise((resolve) => {
      let settled = false;
      let output = '';

      const finalize = (success: boolean, message: string) => {
        if (settled) return;
        settled = true;
        try {
          proc.kill();
        } catch {}
        resolve({ success, message, publicUrl, rawOutput: output.trim() });
      };

      const proc = spawn(pythonCmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });

      const handleData = (buf: Buffer) => {
        const text = buf.toString();
        output += text;

        if (text.includes('err=Rejected') || text.includes('unauthorized') || text.includes('Authentication failed')) {
          finalize(false, `Authentication failed for ${kiteName}. Please verify your PageKite Secret Key.`);
        } else if (text.includes('kites are flying') || text.includes('Flying') || (text.includes('FE=') && !text.includes('err=Rejected'))) {
          finalize(true, `PageKite tunnel successfully verified! Kites are flying at ${publicUrl}`);
        }
      };

      proc.stdout?.on('data', handleData);
      proc.stderr?.on('data', handleData);

      proc.on('error', (err) => {
        finalize(false, `Failed to execute Python/PageKite: ${err.message}`);
      });

      proc.on('close', (code) => {
        if (!settled) {
          if (output.includes('unauthorized') || output.includes('Rejected')) {
            finalize(false, `PageKite credentials rejected for ${kiteName}.`);
          } else if (code === 0 || output.includes('connect=')) {
            finalize(true, `PageKite tunnel verified successfully at ${publicUrl}`);
          } else {
            finalize(false, `PageKite exited with code ${code}. ${output.slice(0, 150)}`);
          }
        }
      });

      setTimeout(() => {
        if (!settled) {
          if (output.includes('Rejected') || output.includes('unauthorized')) {
            finalize(false, `PageKite rejected secret key for ${kiteName}.`);
          } else if (output.includes('connect=') || output.includes('FE=')) {
            finalize(true, `PageKite tunnel connected and verified at ${publicUrl}!`);
          } else {
            finalize(false, `PageKite verification timed out after ${timeoutMs / 1000}s. Check internet connection.`);
          }
        }
      }, timeoutMs);
    });
  }

  /**
   * Starts PageKite background tunnel process.
   */
  public start(): boolean {
    if (!this.config.enabled) {
      this.state.status = 'DISABLED';
      return false;
    }

    // Strict alphanumeric/hyphen validation to prevent command injection
    const cleanSubdomain = (this.config.subdomain || '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{1,64}$/.test(cleanSubdomain)) {
      this.state.status = 'ERROR';
      this.state.error = 'Invalid PageKite subdomain. Subdomain may only contain alphanumeric characters, dashes, and underscores.';
      this.emit('status', this.state);
      return false;
    }

    if (this.config.secret && !/^[a-zA-Z0-9_.-]{1,128}$/.test(this.config.secret.trim())) {
      this.state.status = 'ERROR';
      this.state.error = 'Invalid PageKite secret format.';
      this.emit('status', this.state);
      return false;
    }

    if (this.process) {
      return true;
    }

    this.state.status = 'CONNECTING';
    this.emit('status', this.state);

    const kiteName = `${cleanSubdomain}.${this.config.domain || 'pagekite.me'}`;
    const localPort = this.config.localPort || 7000;
    const scriptPath = PageKiteConnector.findScriptPath();

    if (!scriptPath) {
      this.state.status = 'ERROR';
      this.state.error = 'Bundled pagekite.py script was not found.';
      this.emit('status', this.state);
      return false;
    }

    const pythonCmd = PageKiteConnector.findPythonRuntime(this.config.executablePath);
    const secret = (this.config.secret || '').trim();
    const serviceArg = secret
      ? `--service_on=http:${kiteName}:localhost:${localPort}:${secret}`
      : `--service_on=http:${kiteName}:localhost:${localPort}`;

    const args = [scriptPath, '--defaults', '--clean', serviceArg];

    try {
      this.process = spawn(pythonCmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        if (text.includes('err=Rejected') || text.includes('reason=unauthorized')) {
          this.state.status = 'ERROR';
          this.state.error = 'Authentication failed: Invalid PageKite secret key.';
          this.emit('status', this.state);
        } else if (text.includes('kites are flying') || text.includes('Connected') || text.includes('Flying') || (text.includes('FE=') && !text.includes('err=Rejected'))) {
          this.state.status = 'CONNECTED';
          this.state.lastConnectedAt = new Date().toISOString();
          this.state.error = null;
          this.emit('connected', this.state);
          this.emit('status', this.state);
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const errText = data.toString();
        if (errText.toLowerCase().includes('error') && !errText.includes('signal handler') && !errText.includes('/bin/sh')) {
          this.state.error = errText.trim();
        }
      });

      this.process.on('close', (code: number) => {
        this.process = null;
        if (this.config.enabled) {
          this.state.status = 'DISCONNECTED';
          this.emit('disconnected', code);
        } else {
          this.state.status = 'DISABLED';
        }
        this.emit('status', this.state);
      });

      return true;
    } catch (e: any) {
      this.state.status = 'ERROR';
      this.state.error = e.message || 'Failed to spawn PageKite process';
      this.process = null;
      this.emit('status', this.state);
      return false;
    }
  }

  /**
   * Stops the PageKite process.
   */
  public stop(): void {
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch {
        // ignore
      }
      this.process = null;
    }
    this.state.status = 'DISABLED';
    this.emit('status', this.state);
  }
}
