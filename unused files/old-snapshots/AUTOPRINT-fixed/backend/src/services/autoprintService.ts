import { db } from '../database/db';
import { PrintJobRequest, PrintJobResponse } from '../types';
import { VerificationService } from './verificationService';

export class AutoPrintService {
  /**
   * Submits a print job into the system, generating an 8-digit verification code,
   * embedding it on the final page, and placing it in the spooler queue.
   */
  public static submitJob(request: PrintJobRequest): PrintJobResponse {
    if (!request.fileName || request.amountTotal <= 0) {
      throw new Error('Invalid print job submission payload.');
    }

    const id = `QRT-${Math.floor(1000 + Math.random() * 9000)}`;
    const jobNo = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const title = `${request.fileName} (${request.specs.copies || 1} copies, ${request.specs.colorMode || 'bw'})`;
    const createdAt = new Date().toISOString();

    const verification = VerificationService.createVerificationRecord(id, jobNo, request);

    const job: PrintJobResponse = {
      id,
      jobNo,
      title,
      customerName: request.customerName || 'Walk-In Customer',
      printerName: request.printerName || 'Default AutoPrint Thermal/Laser Printer',
      status: 'queued',
      verification,
      createdAt,
    };

    db.jobs.set(id, job);
    return job;
  }

  /**
   * Retrieves all print jobs.
   */
  public static getAllJobs(): PrintJobResponse[] {
    return Array.from(db.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Retrieves a specific print job by ID.
   */
  public static getJobById(id: string): PrintJobResponse | null {
    return db.jobs.get(id) || null;
  }
}
