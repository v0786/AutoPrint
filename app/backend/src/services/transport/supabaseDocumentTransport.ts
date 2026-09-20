/**
 * Supabase Document Transport
 * Implements DocumentTransport using Supabase Storage (private bucket: print-documents).
 */

import { DocumentTransport, TransportFileResult } from './documentTransport';
import { SupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { computeSha256 } from '../../utils/crypto';

export class SupabaseDocumentTransport implements DocumentTransport {
  public readonly transportType = 'SUPABASE';

  public static getStoragePath(merchantId: string, jobId: string, fileName: string): string {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `print-documents/${merchantId}/${jobId}/${cleanFileName}`;
  }

  public async uploadDocument(
    merchantId: string,
    jobId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<TransportFileResult> {
    const client = SupabaseAdminClient.getClient();
    if (!client) {
      throw new Error('Supabase client is not configured for document transport.');
    }

    const bucket = SupabaseAdminClient.getStorageBucketName();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const relativePath = `${merchantId}/${jobId}/${cleanFileName}`;
    const storagePath = `print-documents/${relativePath}`;

    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(relativePath, fileBuffer, {
        contentType: mimeType || 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload document to Supabase Storage: ${uploadError.message}`);
    }

    const checksum = computeSha256(fileBuffer);

    return {
      storagePath,
      sizeBytes: fileBuffer.length,
      mimeType,
      checksumSha256: checksum,
    };
  }

  public async downloadDocument(storagePath: string): Promise<Buffer> {
    const client = SupabaseAdminClient.getClient();
    if (!client) {
      throw new Error('Supabase client is not configured for document transport.');
    }

    const bucket = SupabaseAdminClient.getStorageBucketName();
    // Normalize path (strip 'print-documents/' prefix if present)
    const relativePath = storagePath.startsWith('print-documents/')
      ? storagePath.replace(/^print-documents\//, '')
      : storagePath;

    const { data: blob, error: dlError } = await client.storage
      .from(bucket)
      .download(relativePath);

    if (dlError || !blob) {
      throw new Error(`File not found in Supabase Storage: ${storagePath} (${dlError?.message})`);
    }

    const arrayBuf = await blob.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  public async deleteDocument(storagePath: string): Promise<boolean> {
    const client = SupabaseAdminClient.getClient();
    if (!client) return false;

    try {
      const bucket = SupabaseAdminClient.getStorageBucketName();
      const relativePath = storagePath.startsWith('print-documents/')
        ? storagePath.replace(/^print-documents\//, '')
        : storagePath;

      const { error } = await client.storage.from(bucket).remove([relativePath]);
      return !error;
    } catch (err) {
      console.warn(`[SUPABASE_TRANSPORT] Failed to delete document at ${storagePath}:`, err);
      return false;
    }
  }

  public async isAvailable(): Promise<boolean> {
    return SupabaseAdminClient.isConfigured();
  }
}
