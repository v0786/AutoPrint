/**
 * AutoPrint Customer Web API Client
 * Connects the customer kiosk frontend to the persistent AutoPrint backend service.
 */

import { PrintSpecifications } from '../types';
import { isSupabaseConfigured, getSupabaseClient } from './supabaseClient';
import { SupabaseJobService, computeFileSha256 } from './supabaseJobService';


const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || '/api';

export interface BackendJobResponse {
  ok: boolean;
  message?: string;
  error?: string;
  traceId?: string;
  queueVisible?: boolean;
  databasePath?: string;
  data: {
    id: string;
    jobNo: string;
    traceId?: string;
    queueVisible?: boolean;
    databasePath?: string;
    title: string;
    fileName: string;
    customerName: string;
    printerName: string;
    status: 'CREATED' | 'UPLOADED' | 'PAYMENT_PENDING' | 'PAID' | 'READY_TO_PRINT' | 'QUEUED' | 'PRINTING' | 'PRINTED' | 'READY_FOR_HANDOVER' | 'READY_FOR_PICKUP' | 'READY_FOR_COLLECTION' | 'COLLECTED' | 'COMPLETED' | 'FAILED';
    storagePath?: string;
    storage_path?: string;
    amountTotal: number;
    currency: string;
    verification: {
      verificationCode: string;
      formattedCode: string;
      securityChecksum: string;
      paymentStatus: string;
      handoverStatus: string;
      createdAt: string;
    };
    createdAt: string;
    customerAccessToken?: string;
  };
}

export class CustomerApiClient {
  public static async createRazorpayOrder(params: { amount: number; currency?: string; receipt?: string }): Promise<{ order_id: string; amount: number; currency: string; key_id: string }> {
    const response = await fetch(`${API_BASE_URL}/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.error || `Unable to create Razorpay order (${response.status})`);
    return json.data;
  }

  public static async verifyRazorpayPayment(params: { verificationCode: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/payment/verify-razorpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.error || `Unable to verify Razorpay payment (${response.status})`);
    return json.data;
  }

  /**
   * Helper to generate standardized trace ID
   */
  public static generateTraceId(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TRACE-${dateStr}-${rand}`;
  }

  /**
   * Submits a print job to the backend with optional multipart document file.
   */
  public static async submitPrintJob(params: {
    file?: File | null;
    fileName: string;
    customerName?: string;
    customerPhone?: string;
    specs: PrintSpecifications;
    paymentMethod: 'UPI' | 'CASH';
    amountMinorUnits: number;
    currency?: string;
    printerName?: string;
    merchantId?: string;
    traceId?: string;
    onUploadProgress?: (percent: number) => void;
  }): Promise<BackendJobResponse['data']> {
    const traceId = params.traceId || CustomerApiClient.generateTraceId();
    const formData = new FormData();

    let storagePath: string | undefined;
    if (isSupabaseConfigured() && params.file) {
      try {
        // The hosted customer app is scoped by /store/:merchantId or query param. Never use
        // a shared fallback or a build-time merchant identity for uploads.
        const urlParams = new URLSearchParams(window.location.search);
        const routeMerchantId = window.location.pathname.match(/^\/store\/([^/]+)/)?.[1]
          || urlParams.get('merchantId')
          || urlParams.get('store');
        const merchantId = params.merchantId || (routeMerchantId ? decodeURIComponent(routeMerchantId) : '');
        if (!merchantId) {
          throw new Error('No merchant store is selected for this print job.');
        }
        const clientJobId = `AP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        const uploadResult = await SupabaseJobService.uploadDocumentToStorage(
          merchantId,
          clientJobId,
          params.file,
          params.onUploadProgress
        );
        storagePath = uploadResult.storagePath;

        let fileHash: string | undefined;
        try {
          fileHash = await computeFileSha256(params.file);
        } catch (hErr) {
          console.warn('[API_CLIENT] Could not compute SHA-256 hash:', hErr);
        }

        const verificationCode = Math.floor(10000000 + Math.random() * 90000000).toString();

        await SupabaseJobService.createPrintJobRecord(
          {
            merchantId,
            jobId: clientJobId,
            file: params.file,
            fileHash,
            customerName: params.customerName || 'Walk-In Customer',
            customerPhone: params.customerPhone,
            specs: params.specs,
            amountMinorUnits: params.amountMinorUnits,
            currency: params.currency,
            paymentMethod: params.paymentMethod,
            verificationCode,
          },
          storagePath
        );

        return {
          id: clientJobId,
          jobNo: `#${clientJobId.slice(-4)}`,
          title: params.fileName,
          fileName: params.fileName,
          customerName: params.customerName || 'Walk-In Customer',
          printerName: params.printerName || 'AutoPrint Spooler',
          status: 'UPLOADED',
          storagePath,
          amountTotal: +(params.amountMinorUnits / 100).toFixed(2),
          currency: params.currency || 'INR',
          verification: {
            verificationCode,
            formattedCode: `${verificationCode.slice(0, 4)} ${verificationCode.slice(4)}`,
            securityChecksum: '',
            paymentStatus: params.paymentMethod === 'CASH' ? 'AWAITING_CASH_CONFIRMATION' : 'PENDING',
            handoverStatus: 'PENDING_PRINT',
            createdAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          traceId,
          queueVisible: true,
        };
      } catch (sbErr) {
        console.warn('[API_CLIENT] Supabase direct storage upload failed, falling back to local multipart upload:', sbErr);
        storagePath = undefined;
      }
    }


    if (storagePath) {
      formData.append('storagePath', storagePath);
    } else if (params.file) {
      formData.append('file', params.file, params.fileName);
    }

    formData.append('fileName', params.fileName);
    formData.append('customerName', params.customerName || 'Walk-In Customer');
    if (params.customerPhone) {
      formData.append('customerPhone', params.customerPhone);
    }
    formData.append('traceId', traceId);
    formData.append('colorMode', params.specs.colorMode);
    formData.append('copies', String(params.specs.copies));
    formData.append('pageRange', params.specs.customPageRange || 'all');
    formData.append('paperSize', params.specs.paperSize);

    const pSize = (params.specs.paperSize || 'a4').toLowerCase();
    let format = 'A4';
    if (pSize === 'a3') format = 'A3';
    else if (pSize === 'letter') format = 'Letter';
    else if (pSize === 'legal') format = 'Legal';
    else if (pSize === '80mm' || pSize === 'receipt_80mm') format = '80mm';

    const printSettings = {
      paperFormat: format,
      orientation: params.specs.orientation || 'portrait',
      colorMode: params.specs.colorMode === 'color' ? 'color' : 'black_and_white',
      copies: Number(params.specs.copies) || 1,
      duplex: params.specs.duplex === 'double',
      pageRange: params.specs.customPageRange || 'all',
    };

    formData.append('paperFormat', format);
    formData.append('printSettings', JSON.stringify(printSettings));
    formData.append('duplex', params.specs.duplex);
    formData.append('finishing', params.specs.finishing);
    formData.append('paymentMethod', params.paymentMethod);
    formData.append('amountMinorUnits', String(params.amountMinorUnits));
    formData.append('currency', params.currency || 'INR');
    if (params.printerName) {
      formData.append('printerName', params.printerName);
    }

    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'x-trace-id': traceId,
      },
      body: formData,
    });

    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || `Failed to submit job (${response.status})`);
    }

    if (json.data) {
      json.data.traceId = json.data.traceId || json.traceId || traceId;
      json.data.queueVisible = json.data.queueVisible !== undefined ? json.data.queueVisible : json.queueVisible;
      json.data.databasePath = json.data.databasePath || json.databasePath;
    }

    return json.data;
  }

  /**
   * Records a digital UPI payment attempt on the backend.
   */
  public static async recordDigitalAttempt(params: {
    verificationCode: string;
    status: 'SUCCESS' | 'FAILED' | 'TIMED_OUT';
    vpa?: string;
    gatewayRef?: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/payment/digital-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || `Failed to record payment (${response.status})`);
    }

    return json.data;
  }

  /**
   * Retrieves live job status from the backend or Supabase Realtime/Postgres.
   */
  public static async getJobById(id: string, accessToken?: string): Promise<BackendJobResponse['data'] | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${id}`, {
        headers: accessToken ? { 'x-job-access-token': accessToken } : undefined,
      });
      if (response.ok) {
        const json = await response.json();
        if (json.ok && json.data) return json.data;
      }
    } catch {
      // Local backend unreachable (e.g. on central Vercel customer website)
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data, error } = await supabase
            .from('print_jobs')
            .select('*')
            .eq('job_id', id)
            .maybeSingle();

          if (data && !error) {
            const code = data.verification_code || '';
            return {
              id: data.job_id,
              jobNo: data.job_no || `#${data.job_id.slice(-4)}`,
              title: data.file_name,
              fileName: data.file_name,
              customerName: data.customer_id || 'Walk-In Customer',
              printerName: data.printer_id || 'AutoPrint Spooler',
              status: data.status,
              storagePath: data.storage_path,
              amountTotal: Number(data.amount || 0),
              currency: data.currency || 'INR',
              verification: {
                verificationCode: code,
                formattedCode: code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code,
                securityChecksum: '',
                paymentStatus: data.payment_status || 'PENDING',
                handoverStatus: data.status === 'COLLECTED' ? 'HANDED_OVER' : 'PENDING_PRINT',
                createdAt: data.created_at,
              },
              createdAt: data.created_at,
            };
          }
        }
      } catch {
        return null;
      }
    }

    return null;
  }


  /**
   * Checks if an 8-digit verification code is eligible for feedback.
   */
  public static async checkFeedbackEligibility(code: string): Promise<{
    eligible: boolean;
    jobId?: string;
    jobNo?: string;
    customerName?: string;
    message?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/feedback/eligibility/${encodeURIComponent(code)}`);
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || 'Failed to verify feedback eligibility.');
    }
    return json.data;
  }

  /**
   * Submits customer rating and feedback.
   */
  public static async submitFeedback(params: {
    verificationCode: string;
    ratingOverall: number;
    ratingQuality: number;
    ratingService: number;
    ratingEase: number;
    category?: string;
    comment?: string;
    improvementSuggestion?: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || 'Failed to submit feedback.');
    }
    return json.data;
  }

  /**
   * Submits a customer support ticket.
   */
  public static async submitCustomerTicket(params: {
    customerName?: string;
    customerEmail?: string;
    verificationCode?: string;
    category: string;
    priority?: string;
    description: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/support/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || 'Failed to create support ticket.');
    }
    return json.data;
  }

}
