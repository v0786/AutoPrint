/**
 * AutoPrint Merchant Desktop API Client Utility
 * Ensures robust connectivity to backend (:5000) whether running in Vite dev,
 * Electron, or static web hosting on port 8000.
 */

export function getApiBaseUrl(): string {
  // If running in browser on port 8000, connect directly to backend port 5000
  if (typeof window !== 'undefined') {
    if (window.location.port === '8000' || window.location.port === '8085' || window.location.port === '3001') {
      const hostname = window.location.hostname || 'localhost';
      return `http://${hostname}:5000/api`;
    }
  }
  return '/api';
}

export async function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`;

  try {
    const res = await fetch(url, init);
    // Check if response is valid JSON vs HTML fallback
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok && contentType.includes('text/html') && baseUrl !== 'http://localhost:5000/api') {
      // Retry once directly with localhost:5000
      const fallbackUrl = `http://localhost:5000/api${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`;
      return await fetch(fallbackUrl, init);
    }
    return res;
  } catch (err) {
    if (baseUrl !== 'http://localhost:5000/api') {
      const fallbackUrl = `http://localhost:5000/api${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`;
      return await fetch(fallbackUrl, init);
    }
    throw err;
  }
}
