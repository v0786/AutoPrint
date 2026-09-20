/** Optional V2 cloud synchronizer.
 *
 * This service is deliberately layered above SQLite. Network failures are
 * recorded as cloud-offline state and never stop the local print engine.
 */
import fs from 'fs/promises';
import path from 'path';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseAdminClient } from './supabaseAdminClient';
import { InstallationIdentityRepository } from '../../database/repositories/installationIdentityRepository';
import { MerchantRepository } from '../../database/repositories/merchantRepository';
import { verifyDocumentBuffer } from '../fileVerificationService';
import { PATHS } from '../../config/environment';


export interface CloudJobNotification {
  job_id: string;
  merchant_id: string;
  device_id?: string | null;
  file_name: string;
  storage_path: string;
  file_size: number;
  file_hash: string;
  status: string;
  [key: string]: unknown;
}

export class CloudSyncService {
  private static channel: RealtimeChannel | null = null;
  private static retryAttempt = 0;

  public static async authenticateDevice(): Promise<boolean> {
    const client = SupabaseAdminClient.getClient();
    if (!client) return false;
    const { data, error } = await client.auth.getUser();
    return !error && Boolean(data.user);
  }

  public static async registerDevice(): Promise<boolean> {
    const client = SupabaseAdminClient.getClient();
    const identity = InstallationIdentityRepository.get();
    if (!client || !identity) return false;

    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return false;

    const { error } = await client.from('merchant_devices').insert({
      merchant_id: identity.merchant_id,
      device_id: identity.device_id,
      installation_id: identity.installation_id,
      auth_user_id: authData.user.id,
      device_name: process.env.COMPUTERNAME || process.env.HOSTNAME || 'AutoPrint device',
      last_seen_at: new Date().toISOString(),
    });
    if (!error) return true;

    // A reconnecting station may already be registered. The SELECT policy
    // allows the authenticated device to confirm its own existing record.
    const { data: existing } = await client
      .from('merchant_devices')
      .select('id')
      .eq('device_id', identity.device_id)
      .eq('merchant_id', identity.merchant_id)
      .maybeSingle();
    return Boolean(existing);
  }

  public static subscribeToJobs(onJob: (job: CloudJobNotification) => void): () => void {
    const client = SupabaseAdminClient.getClient();
    const identity = InstallationIdentityRepository.get();
    if (!client || !identity) return () => {};

    this.channel = client
      .channel(`merchant-device-${identity.merchant_id}-${identity.device_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'print_jobs',
        filter: `merchant_id=eq.${identity.merchant_id}`,
      }, (payload) => {
        const job = payload.new as CloudJobNotification;
        if (
          job.merchant_id === identity.merchant_id
          && (!job.device_id || job.device_id === identity.device_id)
          && job.status === 'READY_TO_PRINT'
        ) onJob(job);
      });

    this.channel.subscribe();
    return () => {
      if (this.channel) void client.removeChannel(this.channel);
      this.channel = null;
    };
  }

  public static async downloadJob(job: CloudJobNotification): Promise<string> {
    const client = SupabaseAdminClient.getClient();
    if (!client) throw new Error('CLOUD_OFFLINE');
    const bucket = SupabaseAdminClient.getStorageBucketName();
    const relativePath = job.storage_path.startsWith(`${bucket}/`)
      ? job.storage_path.slice(bucket.length + 1)
      : job.storage_path;
    const { data, error } = await client.storage.from(bucket).download(relativePath);
    if (error || !data) throw new Error(error?.message || 'Cloud document download failed');

    const buffer = Buffer.from(await data.arrayBuffer());
    const verified = verifyDocumentBuffer(buffer, job.file_size, job.file_hash);
    if (!verified.ok) throw new Error(verified.reason || 'FILE_VERIFICATION_FAILED');

    const targetDir = path.join(PATHS.TEMP_DIR, 'supabase', job.job_id);
    await fs.mkdir(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, path.basename(job.file_name));
    await fs.writeFile(targetPath, buffer);
    return targetPath;
  }

  public static async uploadLocalStatus(jobId: string, status: string, fields: Record<string, unknown> = {}): Promise<boolean> {
    const client = SupabaseAdminClient.getClient();
    const identity = InstallationIdentityRepository.get();
    if (!client || !identity) return false;
    const { error } = await client.from('print_jobs').update({ status, ...fields })
      .eq('job_id', jobId)
      .eq('merchant_id', identity.merchant_id);
    return !error;
  }

  public static async syncPendingJobs(): Promise<CloudJobNotification[]> {
    const client = SupabaseAdminClient.getClient();
    const identity = InstallationIdentityRepository.get();
    if (!client || !identity) return [];
    const { data, error } = await client.from('print_jobs')
      .select('*')
      .eq('merchant_id', identity.merchant_id)
      .in('status', ['READY_TO_PRINT', 'DOWNLOADING', 'FILE_READY', 'QUEUED'])
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as CloudJobNotification[];
  }

  public static async retryFailedSync<T>(operation: () => Promise<T>, maxAttempts = 5): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const result = await operation();
        this.retryAttempt = 0;
        return result;
      } catch (error) {
        lastError = error;
        this.retryAttempt = Math.min(this.retryAttempt + 1, 8);
        const delay = Math.min(30_000, 500 * (2 ** this.retryAttempt));
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Cloud synchronization failed');
  }

  public static async syncMerchantProfile(): Promise<boolean> {
    const client = SupabaseAdminClient.getClient();
    const identity = InstallationIdentityRepository.get();
    if (!client || !identity) return false;

    const merchant = MerchantRepository.getPrimaryMerchant();
    const profile = MerchantRepository.getPublicShopProfile();
    if (!merchant || !profile) return false;

    try {
      const { error } = await client.from('merchants').upsert({
        merchant_id: identity.merchant_id,
        name: profile.owner,
        store_name: profile.name,
        phone: merchant.phone || null,
        email: merchant.email || null,
        address: profile.address || null,
        status: profile.isOnline ? 'ACTIVE' : 'INACTIVE',
        rates: profile.rates,
        payment_config: profile.upiDetails,
        selected_printer: profile.selectedPrinter || null,
        branch: profile.branch || null,
        kiosk_number: profile.kioskNumber || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id' });
      return !error;
    } catch {
      return false;
    }
  }
}

