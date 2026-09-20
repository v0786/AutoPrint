/**
 * Compatibility alias for LocalAccessService.
 * In V2, tunnels (e.g. PageKite) are eliminated; customer access is managed
 * via LAN IP (V1) or central Vercel cloud store URL (V2).
 */

export {
  LocalAccessService,
  localAccessService,
  localAccessService as tunnelService,
  PublicRuntimeConfig,
} from './localAccessService';
