import { supportRepository, SupportTicketRow, SupportTicketHistoryRow } from '../database/repositories/supportRepository';
import { verificationRepository } from '../database/repositories/verificationRepository';
import { DiagnosticCollector, SafeDiagnosticSummary } from '../utils/diagnosticCollector';
import { LogRedactor } from '../utils/logRedactor';
import { AppError } from '../types';

export class SupportService {
  /**
   * Submits a customer-facing support ticket.
   */
  public static createCustomerTicket(params: {
    customerName?: string;
    customerEmail?: string;
    verificationCode?: string;
    category: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
  }): SupportTicketRow {
    if (!params.description || params.description.trim().length < 10) {
      throw new AppError('Please provide a detailed description of the issue (at least 10 characters).', 400);
    }

    let jobId: string | undefined;
    let customerName = params.customerName;

    if (params.verificationCode) {
      const sanitized = params.verificationCode.replace(/[\s\-_]/g, '').trim();
      const record = verificationRepository.getByCode(sanitized);
      if (record) {
        jobId = record.jobId;
        customerName = customerName || record.customerName;
      }
    }

    return supportRepository.createTicket({
      source: 'CUSTOMER',
      customerName: customerName || 'Valued Customer',
      customerEmail: params.customerEmail,
      verificationCode: params.verificationCode,
      jobId,
      category: params.category,
      priority: params.priority || 'MEDIUM',
      description: LogRedactor.redactText(params.description),
    });
  }

  /**
   * Submits a merchant shop-owner support ticket with optional safe diagnostics.
   */
  public static async createMerchantTicket(params: {
    merchantId?: string;
    category: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    stepsTried?: string;
    affectedJobId?: string;
    affectedVerificationCode?: string;
    includeDiagnostics?: boolean;
  }): Promise<SupportTicketRow> {
    if (!params.description || params.description.trim().length < 10) {
      throw new AppError('Please provide a detailed description of the issue (at least 10 characters).', 400);
    }

    let diagnosticsJson: string | undefined;
    if (params.includeDiagnostics) {
      const diag = await DiagnosticCollector.collectSafeDiagnostics();
      diagnosticsJson = JSON.stringify(diag);
    }

    return supportRepository.createTicket({
      source: 'MERCHANT',
      merchantId: params.merchantId || 'MERCHANT-01',
      category: params.category,
      priority: params.priority || 'HIGH',
      description: LogRedactor.redactText(params.description),
      expectedBehavior: params.expectedBehavior ? LogRedactor.redactText(params.expectedBehavior) : undefined,
      actualBehavior: params.actualBehavior ? LogRedactor.redactText(params.actualBehavior) : undefined,
      stepsTried: params.stepsTried ? LogRedactor.redactText(params.stepsTried) : undefined,
      jobId: params.affectedJobId,
      verificationCode: params.affectedVerificationCode,
      diagnosticsJson,
    });
  }

  public static getTicketById(id: string): SupportTicketRow | null {
    return supportRepository.getTicketById(id);
  }

  public static getTicketByNo(ticketNo: string): SupportTicketRow | null {
    return supportRepository.getTicketByNo(ticketNo);
  }

  public static getAllTickets(filters?: { source?: string; status?: string; category?: string }): SupportTicketRow[] {
    return supportRepository.getAllTickets(filters);
  }

  public static updateTicketStatus(
    id: string,
    status: SupportTicketRow['status'],
    actor: string = 'SUPPORT_STAFF',
    notes?: string
  ): SupportTicketRow | null {
    return supportRepository.updateTicketStatus(id, status, actor, notes);
  }

  public static getTicketHistory(ticketId: string): SupportTicketHistoryRow[] {
    return supportRepository.getTicketHistory(ticketId);
  }

  public static async previewSafeDiagnostics(): Promise<SafeDiagnosticSummary> {
    return await DiagnosticCollector.collectSafeDiagnostics();
  }

  public static getSyncStatus(): { pending: number; failed: number; success: number } {
    return supportRepository.getSyncQueueSummary();
  }
}
