/**
 * Backend API Client for AutoPrint Merchant Desktop Manager
 * Connects desktop staff interface directly to authoritative AutoPrint REST API.
 */

import { CollectionVerificationRecord, VerificationAuditLog } from '../types/verification';
import { PrintJob } from '../types/printer';
import { getApiBaseUrl } from '../utils/api';

const getBaseUrl = (): string => getApiBaseUrl();

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

      const response = await fetch(`${getBaseUrl()}/verification/lookup/${sanitized}?staffId=${encodeURIComponent(staffId)}`);
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
    const response = await fetch(`${getBaseUrl()}/verification/collect-cash`, {
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
    const response = await fetch(`${getBaseUrl()}/verification/handover`, {
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
        ? `${getBaseUrl()}/verification/audit-logs?code=${encodeURIComponent(verificationCode)}`
        : `${getBaseUrl()}/verification/audit-logs`;

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
  public static async getAllJobs(traceId?: string): Promise<any[]> {
    try {
      const activeTraceId = traceId || `TRACE-QUEUE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const response = await fetch(`${getBaseUrl()}/jobs`, {
        headers: {
          'x-trace-id': activeTraceId,
        },
      });
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
      const response = await fetch(`${getBaseUrl()}/printers`);
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
      const response = await fetch(`${getBaseUrl()}/jobs/${jobId}/status`, {
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
      const response = await fetch(`${getBaseUrl()}/jobs/${jobId}`, {
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
    const response = await fetch(`${getBaseUrl()}/payment/digital-attempt`, {
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

  // ─── Refund Management ───────────────────────────────────────────────────────
  public static async getRefunds(status?: string): Promise<any[]> {
    try {
      const url = status ? `${getBaseUrl()}/refunds?status=${encodeURIComponent(status)}` : `${getBaseUrl()}/refunds`;
      const res = await fetch(url);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  public static async createRefund(params: {
    jobId: string;
    reason: string;
    detailedExplanation: string;
    staffName?: string;
  }): Promise<any> {
    const res = await fetch(`${getBaseUrl()}/refunds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error || 'Failed to submit refund request.');
    }
    return json.data;
  }

  public static async updateRefundStatus(params: {
    id: string;
    status: string;
    staffName?: string;
    reviewNotes?: string;
    gatewayRefundId?: string;
  }): Promise<any> {
    const res = await fetch(`${getBaseUrl()}/refunds/${params.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error || 'Failed to update refund status.');
    }
    return json.data;
  }

  // ─── Help & Support Management ───────────────────────────────────────────────
  public static async getSupportTickets(filters?: { source?: string; status?: string }): Promise<any[]> {
    try {
      let url = `${getBaseUrl()}/support/tickets`;
      if (filters?.source || filters?.status) {
        const query = new URLSearchParams(filters as any).toString();
        url += `?${query}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  public static async getSupportTicketById(id: string): Promise<any> {
    try {
      const res = await fetch(`${getBaseUrl()}/support/tickets/${id}`);
      const json = await res.json();
      return json.data || null;
    } catch {
      return null;
    }
  }

  public static async createMerchantSupportTicket(params: {
    merchantId?: string;
    category: string;
    priority?: string;
    description: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    stepsTried?: string;
    affectedJobId?: string;
    affectedVerificationCode?: string;
    includeDiagnostics?: boolean;
  }): Promise<any> {
    const res = await fetch(`${getBaseUrl()}/support/merchant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error || 'Failed to create support ticket.');
    }
    return json.data;
  }

  public static async updateSupportTicketStatus(id: string, status: string, notes?: string): Promise<any> {
    const res = await fetch(`${getBaseUrl()}/support/tickets/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes, actor: 'STAFF_DESK' }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error || 'Failed to update ticket status.');
    }
    return json.data;
  }

  public static async previewDiagnostics(): Promise<any> {
    try {
      const res = await fetch(`${getBaseUrl()}/support/diagnostics/preview`);
      const json = await res.json();
      return json.data || null;
    } catch {
      return null;
    }
  }

  // ─── Customer Feedback Intelligence ──────────────────────────────────────────
  public static async getFeedbackAnalytics(): Promise<any> {
    try {
      const res = await fetch(`${getBaseUrl()}/feedback/analytics`);
      const json = await res.json();
      return json.data || null;
    } catch {
      return null;
    }
  }

  public static async getAllFeedback(): Promise<any[]> {
    try {
      const res = await fetch(`${getBaseUrl()}/feedback`);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }
}
