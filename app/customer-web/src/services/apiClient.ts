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
  data: {
    id: string;
    jobNo: string;
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
  }): Promise<BackendJobResponse['data']> {
    const formData = new FormData();

    if (params.file) {
      formData.append('file', params.file, params.fileName);
    }

    formData.append('fileName', params.fileName);
    formData.append('customerName', params.customerName || 'Walk-In Customer');
    if (params.customerPhone) {
      formData.append('customerPhone', params.customerPhone);
    }
    formData.append('colorMode', params.specs.colorMode);
    formData.append('copies', String(params.specs.copies));
    formData.append('pageRange', params.specs.customPageRange || 'all');
    formData.append('paperSize', params.specs.paperSize);
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
      body: formData,
    });

    const json = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.error || `Failed to submit job (${response.status})`);
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
  public static async getJobById(jobId: string): Promise<BackendJobResponse['data'] | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
      if (!response.ok) return null;
      const json = await response.json();
      return json.data || null;
    } catch {
      return null;
    }
  }
}
