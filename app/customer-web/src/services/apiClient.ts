/**
 * AutoPrint Customer Web API Client
 * Connects the customer kiosk frontend to the persistent AutoPrint backend service.
 */

import { PrintSpecifications } from '../types';

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
    status: 'CREATED' | 'QUEUED' | 'PRINTING' | 'PRINTED' | 'READY_FOR_HANDOVER' | 'COMPLETED' | 'FAILED';
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
  };
}

export class CustomerApiClient {
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
    traceId?: string;
  }): Promise<BackendJobResponse['data']> {
    const traceId = params.traceId || CustomerApiClient.generateTraceId();
    const formData = new FormData();

    if (params.file) {
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
   * Retrieves live job status from the backend.
   */
  public static async getJobById(id: string): Promise<BackendJobResponse['data'] | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${id}`);
      if (!response.ok) return null;
      const json = await response.json();
      return json.ok ? json.data : null;
    } catch {
      return null;
    }
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
