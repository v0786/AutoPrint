/**
 * AutoPrint Merchant Agent Service (Supabase Realtime Engine)
 * Listens for new and ready-to-print jobs via Supabase Realtime,
 * downloads documents from Supabase Storage, applies idempotency locks,
 * dispatches jobs to the local printer, and updates Supabase state.
 */

import fs from 'fs';
import path from 'path';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseAdminClient } from './supabaseAdminClient';
import { LocalPrintJobRepository } from '../../database/repositories/localPrintJobRepository';
import { PrinterService } from '../printerService';
import { jobRepository } from '../../database/repositories/jobRepository';
import { verificationRepository } from '../../database/repositories/verificationRepository';
import { PATHS } from '../../config/environment';
import { InstallationIdentityRepository } from '../../database/repositories/installationIdentityRepository';
import { verifyDocumentBuffer } from '../fileVerificationService';

export interface SupabasePrintJobPayload {
  id: string;
  job_id: string;
  job_no?: string;
  merchant_id: string;
  customer_id?: string;
  file_name: string;
  storage_path: string;
  file_size?: number;
  file_hash?: string;
  mime_type?: string;
  pages?: number;
  copies?: number;
  paper_size?: string;
  color_mode?: string;
  duplex?: boolean;
  orientation?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  payment_status?: string;
  status: string;
  verification_code?: string;
  printer_id?: string;
  attempt_count?: number;
  error_code?: string;
  error_message?: string;
  created_at?: string;
  paid_at?: string;
  printing_at?: string;
  printed_at?: string;
  ready_for_collection_at?: string;
  collected_at?: string;
  expires_at?: string;
  device_id?: string;
  downloading_at?: string;
  file_ready_at?: string;
  queued_at?: string;
}

async function clientOrNullUpdate(jobId: string, fields: Record<string, unknown>): Promise<void> {
  const client = SupabaseAdminClient.getClient();
  const identity = InstallationIdentityRepository.get();
  if (!client || !identity) return;
  const { error } = await client.from('print_jobs').update(fields)
    .eq('job_id', jobId)
    .eq('merchant_id', identity.merchant_id)
    .or(`device_id.is.null,device_id.eq.${identity.device_id}`);
  if (error) throw error;
}

export class SupabaseMerchantAgentService {
  private static realtimeChannel: RealtimeChannel | null = null;
  private static isRunning = false;
  private static activeMerchantId = '';
  private static activeDeviceId = process.env.DEVICE_ID || '';

  /**
   * Starts the Merchant Agent:
   * 1. Runs startup crash recovery
   * 2. Establishes Supabase Realtime listener on `print_jobs`
   */
  public static async start(merchantId?: string): Promise<void> {
    if (this.isRunning) return;
    const identity = InstallationIdentityRepository.get();
    this.activeMerchantId = merchantId || identity?.merchant_id || '';
    this.activeDeviceId = identity?.device_id || process.env.DEVICE_ID || '';
    if (!this.activeMerchantId) {
      console.log('[MERCHANT_AGENT] No local merchant identity yet; local queue mode remains available until onboarding completes.');
    }

    this.isRunning = true;
    console.log(`[MERCHANT_AGENT] Starting AutoPrint Merchant Agent for Merchant: "${this.activeMerchantId || 'unconfigured'}"`);

    // 1. Recover any unfinished/stuck jobs from previous application runs
    await this.recoverUnfinishedJobs();

    // 2. Attach Supabase Realtime Listener if configured
    if (SupabaseAdminClient.isConfigured() && this.activeMerchantId) {
      try {
        const client = SupabaseAdminClient.getClient();
        if (!client) {
          console.warn('[MERCHANT_AGENT] Supabase client could not be initialized; operating in local queue mode.');
          return;
        }

        this.realtimeChannel = client
          .channel(`merchant-jobs-${this.activeMerchantId}-${this.activeDeviceId || 'device'}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'print_jobs',
              filter: `merchant_id=eq.${this.activeMerchantId}`,
            },
            (payload) => {
              const record = payload.new as SupabasePrintJobPayload;
              if (
                record
                && record.merchant_id === this.activeMerchantId
                && (!record.device_id || record.device_id === this.activeDeviceId)
                && record.status === 'READY_TO_PRINT'
              ) {
                this.processJob(record).catch((err) => {
                  console.error(`[MERCHANT_AGENT] Error processing realtime job ${record.job_id}:`, err);
                });
              }
            }
          )
          .subscribe((status) => {
            console.log(`[MERCHANT_AGENT] Supabase Realtime subscription status: ${status}`);
          });

        console.log('[MERCHANT_AGENT] Supabase Realtime listener active.');
      } catch (err) {
        console.warn('[MERCHANT_AGENT] Could not initialize Supabase listener (Supabase offline/unconfigured):', err);
      }
    } else {
      console.log('[MERCHANT_AGENT] Supabase not fully configured; operating in local queue mode.');
    }
  }

  /**
   * Stops the agent and unsubscribes from Supabase Realtime
   */
  public static async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.realtimeChannel) {
      const client = SupabaseAdminClient.getClient();
      if (client) {
        await client.removeChannel(this.realtimeChannel);
      }
      this.realtimeChannel = null;
    }
    console.log('[MERCHANT_AGENT] AutoPrint Merchant Agent stopped.');
  }

  /**
   * Safe crash recovery on startup:
   * Finds unfinished jobs left in 'PRINTING' or 'READY_TO_PRINT', compares with Supabase,
   * and prevents blind duplicate prints.
   */
  public static async recoverUnfinishedJobs(): Promise<void> {
    if (!this.activeMerchantId) return;
    const unfinished = LocalPrintJobRepository.getUnfinishedJobs(this.activeMerchantId);
    if (unfinished.length === 0) return;

    console.log(`[MERCHANT_AGENT] Found ${unfinished.length} unfinished local jobs from prior run. Recovering safely...`);

    for (const localJob of unfinished) {
      const jobId = localJob.job_id;

      if (SupabaseAdminClient.isConfigured()) {
        try {
          const client = SupabaseAdminClient.getClient();
          const { data: remoteJob } = await client!
            .from('print_jobs')
            .select('*')
            .eq('job_id', jobId)
            .eq('merchant_id', this.activeMerchantId)
            .single();

          if (remoteJob) {
            if (['PRINTED', 'READY_FOR_COLLECTION', 'COLLECTED'].includes(remoteJob.status)) {
              console.log(`[MERCHANT_AGENT] Job ${jobId} was already completed remotely. Marking local record PRINTED.`);
              LocalPrintJobRepository.updateStatus(jobId, 'PRINTED');
              continue;
            }
          }
        } catch (err) {
          console.warn(`[MERCHANT_AGENT] Could not verify remote state for crashed job ${jobId}:`, err);
        }
      }

      // A physical print may have completed even if the process crashed before
      // the cloud acknowledgement. Never automatically print such a job again.
      if (localJob.status === 'PRINTING') {
        console.warn(`[MERCHANT_AGENT] Job ${jobId} was interrupted mid-print. Marking PRINT_FAILED with recovery note.`);
        LocalPrintJobRepository.updateStatus(
          jobId,
          'PRINT_FAILED',
          'Interrupted by unexpected agent restart. Ready for safe reprint.'
        );

        if (SupabaseAdminClient.isConfigured()) {
          const client = SupabaseAdminClient.getClient();
          await client!
            .from('print_jobs')
            .update({
              status: 'PRINT_FAILED',
              error_message: 'Interrupted by unexpected agent restart.',
            })
            .eq('job_id', jobId)
            .eq('merchant_id', this.activeMerchantId)
            .or(`device_id.is.null,device_id.eq.${this.activeDeviceId}`);
        }
      }

      // Downloading/queued jobs remain persisted for reconciliation. They are
      // intentionally not auto-dispatched on startup without a fresh cloud
      // state check and a new idempotent claim.
    }
  }

  /**
   * Core Idempotent Print Processing Pipeline
   */
  public static async processJob(job: SupabasePrintJobPayload): Promise<void> {
    if (!this.activeMerchantId || job.merchant_id !== this.activeMerchantId) {
      console.warn(`[MERCHANT_AGENT] Ignoring job ${job.job_id}: merchant scope mismatch.`);
      return;
    }
    const jobId = job.job_id;
    const storagePath = job.storage_path;
    const printerId = job.printer_id || null;

    // 1. Strict Idempotency Check: Don't print if already completed or active
    if (LocalPrintJobRepository.isAlreadyProcessedOrActive(jobId)) {
      console.log(`[MERCHANT_AGENT] Job ${jobId} already active or completed. Skipping duplicate event.`);
      return;
    }

    // 2. Acquire Local Lock
    const lockAcquired = LocalPrintJobRepository.claimJob(
      jobId,
      this.activeMerchantId,
      storagePath,
      printerId,
      job.file_hash || null,
      job.file_size ?? null,
      'DOWNLOADING'
    );
    if (!lockAcquired) {
      console.log(`[MERCHANT_AGENT] Could not acquire local lock for job ${jobId}. Another worker is processing.`);
      return;
    }

    console.log(`[MERCHANT_AGENT] Acquired lock for job ${jobId}. Downloading and verifying document before print.`);

    // 3. Update Supabase status to DOWNLOADING
    if (SupabaseAdminClient.isConfigured()) {
      const client = SupabaseAdminClient.getClient();
      await client!
        .from('print_jobs')
        .update({
          status: 'DOWNLOADING',
          downloading_at: new Date().toISOString(),
          attempt_count: (job.attempt_count || 0) + 1,
        })
        .eq('job_id', jobId)
        .eq('merchant_id', this.activeMerchantId)
        .or(`device_id.is.null,device_id.eq.${this.activeDeviceId}`);
    }

    // 4. Download document from Supabase Storage into dedicated temp folder
    const tempDir = path.join(PATHS.TEMP_DIR, 'supabase', jobId);
    fs.mkdirSync(tempDir, { recursive: true });
    const localFilePath = path.join(tempDir, job.file_name);

    try {
      const client = SupabaseAdminClient.getClient();
      if (!client) throw new Error('Supabase client unavailable for document download');

      const bucket = SupabaseAdminClient.getStorageBucketName();
      const relativePath = storagePath.startsWith(`${bucket}/`) ? storagePath.slice(bucket.length + 1) : storagePath;
      const { data: fileBlob, error: dlError } = await client.storage.from(bucket).download(relativePath);

      if (dlError || !fileBlob) {
        throw new Error(dlError?.message || `Document not found in Supabase Storage at: ${storagePath}`);
      }

      const buffer = Buffer.from(await fileBlob.arrayBuffer());
      const verification = verifyDocumentBuffer(buffer, job.file_size, job.file_hash);
      if (!verification.ok) {
        throw new Error(`${verification.reason}: downloaded=${verification.actualSize} bytes sha256=${verification.actualHash}`);
      }
      fs.writeFileSync(localFilePath, buffer);
      LocalPrintJobRepository.setLocalFilePath(jobId, localFilePath);
      LocalPrintJobRepository.setFileSize(jobId, buffer.length);
      LocalPrintJobRepository.setFileHash(jobId, verification.actualHash);
      LocalPrintJobRepository.updateStatus(jobId, 'FILE_READY');

      if (SupabaseAdminClient.isConfigured()) {
        await client!
          .from('print_jobs')
          .update({ status: 'FILE_READY', file_ready_at: new Date().toISOString() })
          .eq('job_id', jobId)
          .eq('merchant_id', this.activeMerchantId)
          .or(`device_id.is.null,device_id.eq.${this.activeDeviceId}`);
      }
      LocalPrintJobRepository.updateStatus(jobId, 'QUEUED');
      if (SupabaseAdminClient.isConfigured()) {
        await client!
          .from('print_jobs')
          .update({ status: 'QUEUED', queued_at: new Date().toISOString() })
          .eq('job_id', jobId)
          .eq('merchant_id', this.activeMerchantId)
          .or(`device_id.is.null,device_id.eq.${this.activeDeviceId}`);
      }

      console.log(`[MERCHANT_AGENT] Downloaded document for ${jobId} (${buffer.length} bytes) to ${localFilePath}`);
    } catch (dlErr: any) {
      console.error(`[MERCHANT_AGENT] Download failure for job ${jobId}:`, dlErr);
      const verificationFailure = String(dlErr?.message || '').startsWith('FILE_') || String(dlErr?.message || '').startsWith('MISSING_');
      await this.handleJobFailure(
        jobId,
        verificationFailure ? 'FILE_VERIFICATION_FAILED' : 'DOWNLOAD_FAILED',
        dlErr.message || 'Storage download failed'
      );
      return;
    }

    // 5. Select Printer and Dispatch Print
    try {
      const rawPrinter = printerId || 'AutoPrint Spooler';
      const printSettings = {
        paperFormat: (job.paper_size || 'A4').toUpperCase(),
        orientation: (job.orientation || 'portrait').toLowerCase() as any,
        colorMode: job.color_mode === 'COLOR' ? ('color' as any) : ('black_and_white' as any),
        copies: Number(job.copies || 1),
        duplex: Boolean(job.duplex),
        pageRange: 'all',
      };

      console.log(`[MERCHANT_AGENT] Dispatching job ${jobId} to printer "${rawPrinter}"...`);

      LocalPrintJobRepository.updateStatus(jobId, 'PRINTING');
      if (SupabaseAdminClient.isConfigured()) {
        await clientOrNullUpdate(jobId, {
          status: 'PRINTING',
          printing_at: new Date().toISOString(),
        });
      }

      const printResult = await PrinterService.dispatchPrintJob(
        jobId,
        job.job_no || `#${jobId}`,
        job.verification_code || 'PICKUP',
        localFilePath,
        rawPrinter,
        printSettings as any
      );

      if (printResult.success) {
        console.log(`[MERCHANT_AGENT] Job ${jobId} printed successfully.`);
        await this.handleJobSuccess(jobId);
      } else {
        console.error(`[MERCHANT_AGENT] Physical print failed for ${jobId}: ${printResult.message}`);
        await this.handleJobFailure(jobId, 'PRINTER_ERROR', printResult.message);
      }
    } catch (printErr: any) {
      console.error(`[MERCHANT_AGENT] Unexpected error printing job ${jobId}:`, printErr);
      await this.handleJobFailure(jobId, 'PRINT_EXECUTION_ERROR', printErr.message || 'Unknown printer error');
    } finally {
      // 6. Clean temporary files safely
      try {
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      } catch (cleanErr) {
        console.warn(`[MERCHANT_AGENT] Could not remove temp file for ${jobId}:`, cleanErr);
      }
    }
  }

  private static async handleJobSuccess(jobId: string): Promise<void> {
    LocalPrintJobRepository.updateStatus(jobId, 'PRINTED');

    // Also reflect in local SQLite database for kiosk UI pickup resolution
    try {
      jobRepository.markPrinted(jobId);
      verificationRepository.updateTrayReady(jobId);
    } catch {
      // Non-critical if job was created primarily via Supabase
    }

    if (SupabaseAdminClient.isConfigured()) {
      try {
        const client = SupabaseAdminClient.getClient();
        const printedAt = new Date().toISOString();
        await client!
          .from('print_jobs')
          .update({ status: 'PRINTED', printed_at: printedAt })
          .eq('job_id', jobId)
          .eq('merchant_id', this.activeMerchantId)
          .or(`device_id.is.null,device_id.eq.${this.activeDeviceId}`);
        await client!
          .from('print_jobs')
          .update({ status: 'READY_FOR_COLLECTION', ready_for_collection_at: new Date().toISOString() })
          .eq('job_id', jobId)
          .eq('merchant_id', this.activeMerchantId)
          .or(`device_id.is.null,device_id.eq.${this.activeDeviceId}`);
      } catch (err) {
        console.warn(`[MERCHANT_AGENT] Could not update Supabase status for ${jobId}:`, err);
      }
    }
  }

  private static async handleJobFailure(jobId: string, errorCode: string, errorMessage: string): Promise<void> {
    const localStatus = errorCode === 'DOWNLOAD_FAILED'
      ? 'DOWNLOAD_FAILED'
      : errorCode === 'FILE_VERIFICATION_FAILED'
      ? 'FILE_VERIFICATION_FAILED'
      : 'PRINT_FAILED';
    LocalPrintJobRepository.updateStatus(jobId, localStatus, errorMessage);

    if (SupabaseAdminClient.isConfigured()) {
      try {
        const client = SupabaseAdminClient.getClient();
        await client!
          .from('print_jobs')
          .update({
            status: 'PRINT_FAILED',
            error_code: errorCode,
            error_message: errorMessage,
          })
          .eq('job_id', jobId)
          .eq('merchant_id', this.activeMerchantId)
          .or(`device_id.is.null,device_id.eq.${this.activeDeviceId}`);
      } catch (err) {
        console.warn(`[MERCHANT_AGENT] Could not report failure to Supabase for ${jobId}:`, err);
      }
    }
  }
}
