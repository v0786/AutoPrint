/**
 * AutoPrint Merchant Desktop API Client Utility
 * Ensures robust connectivity to backend whether running in Vite dev,
 * Electron, or static web hosting on any configured port.
 *
 * Uses relative '/api' requests by default, routing seamlessly through the
 * server's transparent reverse proxy to the backend port.
 */

let cachedApiBaseUrl: string | null = null;

export function getApiBaseUrl(): string {
  if (cachedApiBaseUrl) {
    return cachedApiBaseUrl;
  }

  // 1. Check explicit environment override
  if (import.meta.env.VITE_API_BASE_URL) {
    cachedApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string;
    return cachedApiBaseUrl;
  }

  // 2. Check window runtime configuration if injected
  if (typeof window !== 'undefined' && (window as any).__AUTOPRINT_CONFIG__?.apiBaseUrl) {
    cachedApiBaseUrl = (window as any).__AUTOPRINT_CONFIG__.apiBaseUrl;
    return cachedApiBaseUrl!;
  }

  // 3. Default to relative /api (works on any host/port with reverse proxy or same-origin backend)
  cachedApiBaseUrl = '/api';
  return cachedApiBaseUrl;
}

export function setApiBaseUrl(url: string): void {
  cachedApiBaseUrl = url.replace(/\/+$/, '');
}

export async function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`;

  try {
    const res = await fetch(url, init);
    return res;
  } catch (err) {
    // If relative /api failed and running on localhost, attempt fallback to runtime config probe
    if (typeof window !== 'undefined' && baseUrl === '/api') {
      try {
        const configRes = await fetch('/config/runtime.json');
        if (configRes.ok) {
          const cfg = await configRes.json();
          if (cfg.backendPort && cfg.backendPort !== window.location.port) {
            const fallbackBase = `http://${window.location.hostname || '127.0.0.1'}:${cfg.backendPort}/api`;
            setApiBaseUrl(fallbackBase);
            const fallbackUrl = `${fallbackBase}${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`;
            return await fetch(fallbackUrl, init);
          }
        }
      } catch { }
    }
    throw err;
  }
}
