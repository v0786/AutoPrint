/**
 * QRPrint merchant connectivity configuration.
 *
 * The customer application communicates with the merchant backend through
 * a public HTTPS endpoint. In production this endpoint can be provided by
 * Cloudflare Tunnel.
 *
 * This module deliberately contains no tunnel credentials or secrets.
 * Secrets remain in environment variables or Cloudflare configuration.
 */

export interface MerchantConnectionConfig {
  /**
   * Public HTTPS URL used by the customer application.
   *
   * Example:
   * https://merchant.example.com
   */
  publicUrl?: string;

  /**
   * Local backend URL used by Electron and localhost development.
   */
  localUrl: string;

  /**
   * Health endpoint used to verify backend availability.
   */
  healthPath: string;
}

function removeTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getMerchantConnectionConfig(): MerchantConnectionConfig {
  const localUrl =
    process.env.QRPRINT_BACKEND_URL ??
    "http://127.0.0.1:4100";

  const publicUrl =
    process.env.QRPRINT_PUBLIC_BACKEND_URL;

  return {
    localUrl: removeTrailingSlash(localUrl),
    publicUrl: publicUrl
      ? removeTrailingSlash(publicUrl)
      : undefined,
    healthPath: "/health",
  };
}

export function getMerchantHealthUrl(): string {
  const config = getMerchantConnectionConfig();

  return `${config.localUrl}${config.healthPath}`;
}

export function getCustomerFacingMerchantUrl(): string {
  const config = getMerchantConnectionConfig();

  if (!config.publicUrl) {
    throw new Error(
      "QRPRINT_PUBLIC_BACKEND_URL is not configured. " +
      "Configure the public HTTPS endpoint before enabling customer access."
    );
  }

  return config.publicUrl;
}
