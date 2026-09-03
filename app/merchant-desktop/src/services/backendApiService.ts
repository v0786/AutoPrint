/**
 * Backend API Client for AutoPrint Merchant Desktop Manager
 * Connects desktop staff interface directly to authoritative AutoPrint REST API.
 */

import { CollectionVerificationRecord, VerificationAuditLog } from '../types/verification';
import { PrintJob } from '../types/printer';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000/api';

export class BackendApiService {
  /**
   * Looks up a print job and verification record by 8-digit verification code.
   */
  public static async lookupByCode(
    code: string,
    staffId = 'STAFF-DESK-01'
  ): Promise<CollectionVerificationRecord | null> {
    try {
      const sanitized = code.replace(/[\s\-_]/g, '').trim();
      if (!/^\d{8}$/.test(sanitized)) return null;

      const response = await fetch(`${API_BASE_URL}/verification/lookup/${sanitized}?staffId=${encodeURIComponent(staffId)}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Lookup failed with HTTP ${response.status}`);
      }
      const json = await response.json();
      return json.data || null;
    } catch (err: any) {
      console.warn(`[BACKEND_API] Lookup failed for code ${code}:`, err.message);
      throw err;
    }
  }

  /**
   * Submits staff cash collection to the backend.
   */
  public static async recordCashCollection(
    verificationCode: string,
    tenderedAmount: number,
    staffId = 'STAFF-01',
    staffName = 'Duty Station Cashier'
  ): Promise<CollectionVerificationRecord> {
    const response = await fetch(`${API_BASE_URL}/verification/collect-cash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationCode,
        tenderedAmount,
        staffId,
        staffName,
      }),
    });

    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || `Cash collection failed (HTTP ${response.status})`);
    }

    return json.data;
  }

  /**
   * Confirms physical handover of printed documents on backend.
   */
  public static async confirmDocumentHandover(
    verificationCode: string,
    staffId = 'STAFF-01',
    staffName = 'Duty Station Cashier'
  ): Promise<CollectionVerificationRecord> {
    const response = await fetch(`${API_BASE_URL}/verification/handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationCode,
        staffId,
        staffName,
      }),
    });

    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || `Handover confirmation failed (HTTP ${response.status})`);
    }

    return json.data;
  }

  /**
   * Retrieves persistent audit logs from backend.
   */
  public static async getAuditLogs(verificationCode?: string): Promise<VerificationAuditLog[]> {
    try {
      const url = verificationCode
        ? `${API_BASE_URL}/verification/audit-logs?code=${encodeURIComponent(verificationCode)}`
        : `${API_BASE_URL}/verification/audit-logs`;

      const response = await fetch(url);
      if (!response.ok) return [];
      const json = await response.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Retrieves all active print jobs from backend.
   */
  public static async getAllJobs(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs`);
      if (!response.ok) return [];
      const json = await response.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Retrieves real hardware printers from backend.
   */
  public static async getPrinters(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/printers`);
      if (!response.ok) return [];
      const json = await response.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Updates job status on the backend.
   */
  public static async updateJobStatus(jobId: string, status: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await response.json();
      return json.data;
    } catch {
      return null;
    }
  }

  /**
   * Cancels a job on the backend.
   */
  public static async cancelJob(jobId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        method: 'DELETE',
      });
      const json = await response.json();
      return json.data;
    } catch {
      return null;
    }
  }

  /**
   * Records a digital payment attempt.
   */
  public static async recordDigitalAttempt(params: {
    verificationCode: string;
    status: 'SUCCESS' | 'FAILED' | 'TIMED_OUT';
    vpa?: string;
    gatewayRef?: string;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<{ record: CollectionVerificationRecord; strikeLockoutTriggered: boolean }> {
    const response = await fetch(`${API_BASE_URL}/payment/digital-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || `Payment attempt registration failed (HTTP ${response.status})`);
    }

    return {
      record: json.data,
      strikeLockoutTriggered: Boolean(json.strikeLockoutTriggered),
    };
  }
}
