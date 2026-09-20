/**
 * Print Job State Machine Comprehensive Test Suite
 * Validates state transition integrity, invalid transition rejection,
 * terminal state handling, and payment flow validation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PrintJobStateMachine,
  InvalidStateTransitionError,
  CloudJobStatus,
} from '../services/stateMachine/printJobStateMachine';

describe('PrintJobStateMachine Tests', () => {
  it('should validate the standard happy path lifecycle', () => {
    let current: CloudJobStatus = 'UPLOADED';

    const happyPath: CloudJobStatus[] = [
      'PAYMENT_PENDING',
      'PAID',
      'READY_TO_PRINT',
      'PRINTING',
      'PRINTED',
      'READY_FOR_COLLECTION',
      'COLLECTED',
    ];

    for (const nextState of happyPath) {
      assert.equal(PrintJobStateMachine.isValidTransition(current, nextState), true);
      PrintJobStateMachine.assertValidTransition(current, nextState);
      current = nextState;
    }

    assert.equal(current, 'COLLECTED');
    assert.equal(PrintJobStateMachine.isTerminal(current), true);
  });

  it('should reject invalid transition: UPLOADED -> PRINTING directly', () => {
    assert.equal(PrintJobStateMachine.isValidTransition('UPLOADED', 'PRINTING'), false);
    assert.throws(
      () => PrintJobStateMachine.assertValidTransition('UPLOADED', 'PRINTING'),
      (err: any) => {
        assert.ok(err instanceof InvalidStateTransitionError);
        assert.equal(err.fromStatus, 'UPLOADED');
        assert.equal(err.toStatus, 'PRINTING');
        return true;
      }
    );
  });

  it('should reject invalid transition: COLLECTED -> PRINTING', () => {
    assert.equal(PrintJobStateMachine.isValidTransition('COLLECTED', 'PRINTING'), false);
    assert.throws(
      () => PrintJobStateMachine.assertValidTransition('COLLECTED', 'PRINTING'),
      (err: any) => {
        assert.ok(err instanceof InvalidStateTransitionError);
        assert.equal(err.fromStatus, 'COLLECTED');
        assert.equal(err.toStatus, 'PRINTING');
        return true;
      }
    );
  });

  it('should reject invalid transition: PRINT_FAILED -> COLLECTED', () => {
    assert.equal(PrintJobStateMachine.isValidTransition('PRINT_FAILED', 'COLLECTED'), false);
    assert.throws(
      () => PrintJobStateMachine.assertValidTransition('PRINT_FAILED', 'COLLECTED'),
      (err: any) => {
        assert.ok(err instanceof InvalidStateTransitionError);
        return true;
      }
    );
  });

  it('should allow retry transition: PRINT_FAILED -> READY_TO_PRINT', () => {
    assert.equal(PrintJobStateMachine.isValidTransition('PRINT_FAILED', 'READY_TO_PRINT'), true);
    assert.doesNotThrow(() => PrintJobStateMachine.assertValidTransition('PRINT_FAILED', 'READY_TO_PRINT'));
  });

  it('should allow cancellation and expiration from active pending states', () => {
    assert.equal(PrintJobStateMachine.isValidTransition('UPLOADED', 'EXPIRED'), true);
    assert.equal(PrintJobStateMachine.isValidTransition('PAYMENT_PENDING', 'EXPIRED'), true);
    assert.equal(PrintJobStateMachine.isValidTransition('PAYMENT_PENDING', 'CANCELLED'), true);
    assert.equal(PrintJobStateMachine.isValidTransition('PAYMENT_PENDING', 'PAYMENT_FAILED'), true);
    assert.equal(PrintJobStateMachine.isValidTransition('PAID', 'CANCELLED'), true);
  });

  it('should identify terminal states correctly', () => {
    assert.equal(PrintJobStateMachine.isTerminal('COLLECTED'), true);
    assert.equal(PrintJobStateMachine.isTerminal('CANCELLED'), true);
    assert.equal(PrintJobStateMachine.isTerminal('EXPIRED'), true);
    assert.equal(PrintJobStateMachine.isTerminal('PRINTING'), false);
    assert.equal(PrintJobStateMachine.isTerminal('UPLOADED'), false);
    assert.equal(PrintJobStateMachine.isTerminal('READY_TO_PRINT'), false);
  });

  it('should identify printable state correctly', () => {
    assert.equal(PrintJobStateMachine.isPrintable('READY_TO_PRINT'), true);
    assert.equal(PrintJobStateMachine.isPrintable('UPLOADED'), false);
    assert.equal(PrintJobStateMachine.isPrintable('PAID'), false);
    assert.equal(PrintJobStateMachine.isPrintable('PRINTING'), false);
  });
});
