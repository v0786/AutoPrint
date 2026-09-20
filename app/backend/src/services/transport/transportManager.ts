/**
 * Document Transport Manager
 * Selects the active document transport backend.
 * Default and only supported transport: Supabase Storage.
 */

import { DocumentTransport } from './documentTransport';
import { SupabaseDocumentTransport } from './supabaseDocumentTransport';

export class TransportManager {
  private static activeTransport: DocumentTransport | null = null;

  public static getTransport(): DocumentTransport {
    if (this.activeTransport) return this.activeTransport;

    console.log('[TRANSPORT] Using Supabase Document Transport');
    this.activeTransport = new SupabaseDocumentTransport();

    return this.activeTransport;
  }

  public static setTransport(transport: DocumentTransport): void {
    this.activeTransport = transport;
  }

  public static resetTransport(): void {
    this.activeTransport = null;
  }
}
