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

    const publicUrl = `https://${this.config.subdomain.toLowerCase().trim()}.${this.config.domain}`;

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

  public updateConfig(newConfig: Partial<PageKiteConfig>): TunnelState {
    this.config = { ...this.config, ...newConfig };
    if (this.config.subdomain) {
      this.state.subdomain = this.config.subdomain;
      this.state.domain = this.config.domain || 'pagekite.me';
      this.state.publicUrl = `https://${this.config.subdomain.toLowerCase().trim()}.${this.state.domain}`;
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
   * Starts PageKite background tunnel process.
   */
  public start(): boolean {
    if (!this.config.enabled) {
      this.state.status = 'DISABLED';
      return false;
    }

    if (!this.config.subdomain) {
      this.state.status = 'ERROR';
      this.state.error = 'PageKite subdomain is not configured.';
      return false;
    }

    if (this.process) {
      return true;
    }

    this.state.status = 'CONNECTING';
    this.emit('status', this.state);

    const kiteName = `${this.config.subdomain.toLowerCase().trim()}.${this.config.domain}`;
    const localPort = this.config.localPort;

    // Locate pagekite.py script
    const possibleScriptPaths = [
      path.resolve(__dirname, 'pagekite.py'),
      path.resolve(process.cwd(), 'scripts/pagekite.py'),
      path.resolve(process.cwd(), 'app/connectors/tunnel/pagekite.py'),
      path.resolve(process.cwd(), 'app/backend/src/connectors/pagekite.py'),
    ];
    const scriptPath = possibleScriptPaths.find((p) => fs.existsSync(p));

    let execCmd = 'python';
    let args: string[] = ['--nossl'];

    if (this.config.secret) {
      args.push(`--service_cfg=${kiteName}:${localPort}:${this.config.secret}`);
    }
    args.push(String(localPort));
    args.push(kiteName);

    if (scriptPath) {
      args.unshift(scriptPath);
    }

    try {
      this.process = spawn(execCmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        if (text.includes('kites are flying') || text.includes('Connected') || text.includes('Flying') || text.includes('FE=')) {
          this.state.status = 'CONNECTED';
          this.state.lastConnectedAt = new Date().toISOString();
          this.state.error = null;
          this.emit('connected', this.state);
          this.emit('status', this.state);
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const errText = data.toString();
        if (errText.toLowerCase().includes('error') && !errText.includes('signal handler')) {
          this.state.error = errText.trim();
          this.emit('error', this.state.error);
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

      // Optimistic connection state after startup
      setTimeout(() => {
        if (this.process && this.state.status === 'CONNECTING') {
          this.state.status = 'CONNECTED';
          this.state.lastConnectedAt = new Date().toISOString();
          this.emit('status', this.state);
        }
      }, 3000);

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
