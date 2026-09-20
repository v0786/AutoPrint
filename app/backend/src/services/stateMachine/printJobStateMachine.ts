/**
 * AutoPrint Print Job State Machine
 * Enforces strict, non-arbitrary lifecycle transitions across Supabase PostgreSQL and Local SQLite.
 */

export type CloudJobStatus =
  | 'UPLOADED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'READY_TO_TRANSMIT'
  | 'TRANSMITTING'
  | 'RECEIVED'
  | 'DOWNLOADING'
  | 'FILE_READY'
  | 'QUEUED'
  | 'READY_TO_PRINT'
  | 'PRINTING'
  | 'PRINTED'
  | 'READY_FOR_COLLECTION'
  | 'COLLECTED'
  | 'PAYMENT_FAILED'
  | 'TRANSMISSION_FAILED'
  | 'RECEIVE_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'FILE_VERIFICATION_FAILED'
  | 'PRINT_FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export class InvalidStateTransitionError extends Error {
  public readonly fromStatus: CloudJobStatus;
  public readonly toStatus: CloudJobStatus;

  constructor(fromStatus: CloudJobStatus, toStatus: CloudJobStatus, reason?: string) {
    super(`Invalid print job state transition from "${fromStatus}" to "${toStatus}"${reason ? `: ${reason}` : ''}`);
    this.name = 'InvalidStateTransitionError';
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

/**
 * Permitted forward and failure transitions
 */
const ALLOWED_TRANSITIONS: Record<CloudJobStatus, Set<CloudJobStatus>> = {
  UPLOADED: new Set(['PAYMENT_PENDING', 'CANCELLED', 'EXPIRED']),
  PAYMENT_PENDING: new Set(['PAID', 'PAYMENT_FAILED', 'CANCELLED', 'EXPIRED']),
  PAID: new Set(['READY_TO_TRANSMIT', 'TRANSMITTING', 'READY_TO_PRINT', 'QUEUED', 'CANCELLED']),
  READY_TO_TRANSMIT: new Set(['TRANSMITTING', 'TRANSMISSION_FAILED', 'RECEIVED', 'CANCELLED']),
  TRANSMITTING: new Set(['RECEIVED', 'TRANSMISSION_FAILED', 'RECEIVE_FAILED', 'CANCELLED']),
  TRANSMISSION_FAILED: new Set(['READY_TO_TRANSMIT', 'TRANSMITTING', 'CANCELLED']),
  RECEIVED: new Set(['DOWNLOADING', 'FILE_READY', 'QUEUED', 'READY_TO_PRINT', 'RECEIVE_FAILED', 'PRINTING', 'CANCELLED']),
  RECEIVE_FAILED: new Set(['READY_TO_TRANSMIT', 'TRANSMITTING', 'CANCELLED']),
  DOWNLOADING: new Set(['FILE_READY', 'DOWNLOAD_FAILED', 'FILE_VERIFICATION_FAILED', 'QUEUED', 'CANCELLED']),
  DOWNLOAD_FAILED: new Set(['DOWNLOADING', 'CANCELLED']),
  FILE_VERIFICATION_FAILED: new Set(['DOWNLOADING', 'CANCELLED']),
  FILE_READY: new Set(['QUEUED', 'READY_TO_PRINT', 'PRINTING', 'CANCELLED']),
  // A queued job may be revalidated after a restart before it is dispatched.
  QUEUED: new Set(['DOWNLOADING', 'PRINTING', 'CANCELLED', 'EXPIRED']),
  READY_TO_PRINT: new Set(['PRINTING', 'CANCELLED', 'EXPIRED']),
  PRINTING: new Set(['PRINTED', 'PRINT_FAILED', 'CANCELLED']),
  PRINTED: new Set(['READY_FOR_COLLECTION', 'COLLECTED']),
  READY_FOR_COLLECTION: new Set(['COLLECTED']),
  COLLECTED: new Set([]), // Terminal state
  PAYMENT_FAILED: new Set(['PAYMENT_PENDING', 'CANCELLED', 'EXPIRED']),
  PRINT_FAILED: new Set(['QUEUED', 'READY_TO_PRINT', 'CANCELLED']),
  CANCELLED: new Set([]), // Terminal state
  EXPIRED: new Set([]), // Terminal state
};

export class PrintJobStateMachine {
  /**
   * Validates if a transition from `from` to `to` is legally permitted.
   */
  public static isValidTransition(from: CloudJobStatus, to: CloudJobStatus): boolean {
    if (from === to) return true; // Idempotent no-op
    const allowed = ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.has(to) : false;
  }

  /** Backwards-compatible name used by the queue and architecture contracts. */
  public static canTransition(from: CloudJobStatus, to: CloudJobStatus): boolean {
    return this.isValidTransition(from, to);
  }

  /**
   * Asserts that a transition is valid, throwing an InvalidStateTransitionError if illegal.
   */
  public static assertValidTransition(from: CloudJobStatus, to: CloudJobStatus, context?: string): void {
    if (!this.isValidTransition(from, to)) {
      throw new InvalidStateTransitionError(from, to, context);
    }
  }

  /**
   * Returns true if status is an end-of-lifecycle state.
   */
  public static isTerminal(status: CloudJobStatus): boolean {
    return status === 'COLLECTED' || status === 'CANCELLED' || status === 'EXPIRED';
  }

  /**
   * Returns true if job is active and eligible to be printed.
   */
  public static isPrintable(status: CloudJobStatus): boolean {
    return status === 'READY_TO_PRINT';
  }
}
