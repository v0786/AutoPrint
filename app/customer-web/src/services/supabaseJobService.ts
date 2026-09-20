/**
 * Supabase Print Job Service for Customer Kiosk Web App
 * Handles direct-to-storage document uploads, metadata registration in Supabase PostgreSQL,
 * and real-time job status streaming via Supabase Realtime channels.
 */

import { getSupabaseClient } from './supabaseClient';
import { PrintSpecifications } from '../types';

export interface SupabaseJobUploadOptions {
  merchantId: string;
  jobId: string;
  file: File;
  fileHash?: string;
  customerName: string;
  customerPhone?: string;
  specs: PrintSpecifications;
  amountMinorUnits: number;
  currency?: string;
  paymentMethod: 'UPI' | 'CASH';
  verificationCode?: string;
  printerId?: string;
  onProgress?: (percent: number) => void;
}

/**
 * Calculates cryptographic SHA-256 hash in browser using Web Crypto API.
 */
export async function computeFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class SupabaseJobService {
  private static readonly BUCKET = 'print-documents';

  /**
   * Uploads a document directly to Supabase Storage:
   * Path: print-documents/{merchantId}/{jobId}/{fileName}
   */
  public static async uploadDocumentToStorage(
    merchantId: string,
    jobId: string,
    file: File,
    _onProgress?: (percent: number) => void
  ): Promise<{ storagePath: string; downloadUrl?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not initialized');

    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const relativePath = `${merchantId}/${jobId}/${cleanName}`;
    const storagePath = `print-documents/${relativePath}`;

    const { error: uploadError } = await supabase.storage
      .from(this.BUCKET)
      .upload(relativePath, file, {
        contentType: file.type || 'application/octet-stream',
        // Avoid requiring SELECT/UPDATE permissions for anonymous customers.
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed uploading document to Supabase Storage: ${uploadError.message}`);
    }

    // The bucket is private. The merchant agent downloads with its scoped
    // device authorization; no public URL is returned to the browser.
    return { storagePath };
  }

  /**
   * Creates the initial print job record in Supabase PostgreSQL:
   * Table: print_jobs
   */
  public static async createPrintJobRecord(options: SupabaseJobUploadOptions, storagePath: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not initialized');

    const isCash = options.paymentMethod === 'CASH';

    const { error } = await supabase.from('print_jobs').insert({
      job_id: options.jobId,
      merchant_id: options.merchantId,
      customer_id: options.customerPhone || 'walk-in-customer',
      file_name: options.file.name,
      storage_path: storagePath,
      file_size: options.file.size,
      file_hash: options.fileHash || null,
      mime_type: options.file.type || 'application/pdf',

      pages: 1,
      copies: Number(options.specs.copies || 1),

      paper_size: (options.specs.paperSize || 'A4').toUpperCase(),
      color_mode: options.specs.colorMode === 'color' ? 'COLOR' : 'BW',
      duplex: options.specs.duplex === 'double',
      orientation: (options.specs.orientation || 'portrait').toUpperCase(),

      amount: +(options.amountMinorUnits / 100).toFixed(2),
      amount_minor_units: options.amountMinorUnits,
      currency: options.currency || 'INR',

      payment_method: options.paymentMethod,
      payment_status: isCash ? 'AWAITING_CASH_CONFIRMATION' : 'PENDING',
      status: 'UPLOADED',

      verification_code: options.verificationCode || null,
      printer_id: options.printerId || null,
    });

    if (error) {
      throw new Error(`Failed to insert print job into Supabase: ${error.message}`);
    }
  }

  /**
   * Subscribes to real-time status updates for a specific job via Supabase Realtime
   */
  public static subscribeToJobStatus(jobId: string, onUpdate: (data: any) => void): () => void {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    const channel = supabase
      .channel(`job-status-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'print_jobs',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
