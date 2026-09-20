/**
 * AutoPrint Conservative Secret & Log Redaction Utility
 * Sanitizes logs and diagnostic payloads to ensure zero credentials, tokens, or private secrets leak.
 */

export class LogRedactor {
  private static readonly PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
    // 1. Authorization & Bearer tokens
    { regex: /(bearer\s+)[a-zA-Z0-9_\-\.]{10,}/gi, replacement: '$1[REDACTED_TOKEN]' },
    { regex: /(authorization:\s*['"]?)[^\r\n,'"]+/gi, replacement: '$1[REDACTED_AUTH]' },

    // 2. Passwords, secret keys, API keys in JSON or key-value strings
    { regex: /("(?:password|secret|keySecret|secretKey|apiKey|token|sessionToken)":\s*")[^"]+(")/gi, replacement: '$1[REDACTED_SECRET]$2' },
    { regex: /((?:password|secret|key_secret|secret_key|api_key|token)\s*[:=]\s*)[^\s,;&]+/gi, replacement: '$1[REDACTED_SECRET]' },

    // 3. Service endpoint credentials passed as a command-line argument.
    { regex: /(--endpoint-token=)[^\s"']+/gi, replacement: '$1[REDACTED_SERVICE_SECRET]' },

    // 4. Razorpay Secret (rzp_test_... / rzp_live_... / secret keys)
    { regex: /(rzp_(?:test|live)_[a-zA-Z0-9]{14,})/gi, replacement: '[REDACTED_RAZORPAY_KEY]' },
    { regex: /([a-zA-Z0-9]{24,32})(?=\s*\|\s*razorpay)/gi, replacement: '[REDACTED_RAZORPAY_SECRET]' },

    // 5. Generic Private Keys & Certificates
    { regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[^-]+-----END [A-Z ]+ PRIVATE KEY-----/gs, replacement: '[REDACTED_PRIVATE_KEY]' },

    // 6. Cookies & Session headers
    { regex: /(cookie:\s*)[^\r\n]+/gi, replacement: '$1[REDACTED_COOKIES]' },
    { regex: /(set-cookie:\s*)[^\r\n]+/gi, replacement: '$1[REDACTED_COOKIES]' },

    // 7. Base64 DPAPI / Crypto Blobs (strings of 64+ base64 chars)
    { regex: /([A-Za-z0-9+/]{64,}={0,2})/g, replacement: '[REDACTED_BINARY_BLOB]' },
  ];

  /**
   * Sanitizes a single log string or text blob.
   */
  public static redactText(text: string): string {
    if (!text || typeof text !== 'string') return text;
    let sanitized = text;
    for (const { regex, replacement } of this.PATTERNS) {
      sanitized = sanitized.replace(regex, replacement);
    }
    return sanitized;
  }

  /**
   * Recursively sanitizes any JSON object or diagnostic record.
   */
  public static redactObject<T>(obj: T): T {
    if (!obj || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return this.redactText(obj) as any;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as any;
    }

    const cleaned: Record<string, any> = {};
    const sensitiveKeyPattern = /(password|secret|key|token|auth|cookie|credential|private|dpapi)/i;

    for (const [k, v] of Object.entries(obj)) {
      if (sensitiveKeyPattern.test(k)) {
        cleaned[k] = '[REDACTED_FIELD]';
      } else if (typeof v === 'string') {
        cleaned[k] = this.redactText(v);
      } else if (typeof v === 'object' && v !== null) {
        cleaned[k] = this.redactObject(v);
      } else {
        cleaned[k] = v;
      }
    }

    return cleaned as T;
  }
}
