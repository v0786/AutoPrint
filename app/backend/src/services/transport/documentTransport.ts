/**
 * AutoPrint Document Transport Abstraction
 * Decouples document transfer mechanism (Supabase Storage).
 */

export interface TransportFileResult {
  storagePath: string;
  sizeBytes: number;
  mimeType: string;
  checksumSha256?: string;
}

export interface DocumentTransport {
  readonly transportType: 'SUPABASE';

  /**
   * Uploads or stores a document file into the transport storage.
   */
  uploadDocument(
    merchantId: string,
    jobId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<TransportFileResult>;

  /**
   * Downloads a document file from the transport storage into a local buffer.
   */
  downloadDocument(storagePath: string): Promise<Buffer>;

  /**
   * Deletes a document file from the transport storage.
   */
  deleteDocument(storagePath: string): Promise<boolean>;

  /**
   * Checks if transport service is currently available and healthy.
   */
  isAvailable(): Promise<boolean>;
}
