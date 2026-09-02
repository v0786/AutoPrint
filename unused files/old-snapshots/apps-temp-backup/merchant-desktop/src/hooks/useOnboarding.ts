/**
 * Custom hook for managing the Onboarding Wizard multi-step flow,
 * state validation, reactive printer updates, and local storage persistence.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  OnboardingState,
  ShopUserDetails,
  AdminAccount,
  SystemUser,
  TermsAcknowledgment,
} from '../types/onboarding';
import { PrinterDevice } from '../types/printer';
import { spoolerService } from '../services/electronBridge';
import {
  localPersistenceService,
  DEFAULT_INITIAL_ONBOARDING_STATE,
  DEFAULT_TERMS_VERSION,
} from '../services/localPersistenceService';

export const TOTAL_STEPS = 5; // 0: Splash, 1: Shop Details, 2: Printers, 3: Terms, 4: Admin Security

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(() => {
    return localPersistenceService.getOnboardingState();
  });

  const [connectedPrinters, setConnectedPrinters] = useState<PrinterDevice[]>([]);
  const [isDetectingPrinters, setIsDetectingPrinters] = useState<boolean>(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Synchronize state with LocalStorage on mutation
  useEffect(() => {
    localPersistenceService.saveOnboardingState(state);
  }, [state]);

  // Reactive printer hardware discovery and status subscription
  const scanPrinters = useCallback(async () => {
    setIsDetectingPrinters(true);
    setDetectionError(null);
    try {
      // Benchmark IPC connection and pull devices
      const list = await spoolerService.getPrinters();
      setConnectedPrinters(list);
      setState((prev) => {
        const defaultDevice = list.find((p) => p.isDefault) || list[0];
        return {
          ...prev,
          printers: list,
          selectedPrinterId: prev.selectedPrinterId || (defaultDevice ? defaultDevice.id : null),
        };
      });
    } catch (err: any) {
      console.error('Failed to discover local printer devices', err);
      setDetectionError('Hardware scan could not communicate with the local spooler driver.');
    } finally {
      setIsDetectingPrinters(false);
    }
  }, []);

  // Subscribe to real-time hardware status changes while on onboarding
  useEffect(() => {
    scanPrinters();

    const unsubPrinter = spoolerService.onPrinterStatusUpdate((updatedPrinter) => {
      setConnectedPrinters((prev) =>
        prev.map((p) => (p.id === updatedPrinter.id ? updatedPrinter : p))
      );
      setState((prev) => ({
        ...prev,
        printers: prev.printers.map((p) => (p.id === updatedPrinter.id ? updatedPrinter : p)),
      }));
    });

    return () => {
      unsubPrinter();
    };
  }, [scanPrinters]);

  // Validation functions
  const validateUserDetails = (details: ShopUserDetails): boolean => {
    const errors: Record<string, string> = {};
    if (!details.fullName.trim()) errors.fullName = 'Full name is required';
    if (!details.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!details.shopName.trim()) errors.shopName = 'Shop name is required';
    if (!details.shopOwnerName.trim()) errors.shopOwnerName = 'Shop owner name is required';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAdminAccount = (account: { username: string; password: string; confirmPassword: string }): boolean => {
    const errors: Record<string, string> = {};
    if (!account.username.trim()) {
      errors.username = 'Username is required';
    } else if (account.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!account.password) {
      errors.password = 'Password is required';
    } else {
      if (account.password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
      } else if (!/[A-Z]/.test(account.password)) {
        errors.password = 'Password must contain at least one uppercase letter';
      } else if (!/[0-9]/.test(account.password)) {
        errors.password = 'Password must contain at least one number';
      }
    }

    if (account.password !== account.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateTerms = (terms: TermsAcknowledgment): boolean => {
    const errors: Record<string, string> = {};
    if (!terms.accepted) {
      errors.accepted = 'You must accept the terms & conditions to proceed';
    }
    if (!terms.agreedToLocalDataNotice) {
      errors.agreedToLocalDataNotice = 'You must acknowledge the offline data storage policy';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step transitions
  const nextStep = () => {
    setValidationErrors({});
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(TOTAL_STEPS - 1, prev.currentStep + 1),
    }));
  };

  const prevStep = () => {
    setValidationErrors({});
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < TOTAL_STEPS) {
      setValidationErrors({});
      setState((prev) => ({ ...prev, currentStep: stepIndex }));
    }
  };

  // State Updaters
  const updateUserDetails = (details: Partial<ShopUserDetails>) => {
    setState((prev) => ({
      ...prev,
      userDetails: { ...prev.userDetails, ...details },
    }));
  };

  const setPrimaryPrinter = (printerId: string) => {
    setState((prev) => ({
      ...prev,
      selectedPrinterId: printerId,
    }));
  };

  const updateTerms = (terms: Partial<TermsAcknowledgment>) => {
    setState((prev) => ({
      ...prev,
      terms: { ...prev.terms, ...terms },
    }));
  };

  const setAdminAccount = (admin: AdminAccount) => {
    setState((prev) => ({
      ...prev,
      adminAccount: admin,
    }));
  };

  const addAdditionalUser = (user: Omit<SystemUser, 'id' | 'createdAt'>): boolean => {
    // Check duplicates
    if (
      state.additionalUsers.some(
        (u) => u.username.toLowerCase() === user.username.toLowerCase()
      ) ||
      (state.adminAccount && state.adminAccount.username.toLowerCase() === user.username.toLowerCase())
    ) {
      setValidationErrors({ newUser: 'Username already exists' });
      return false;
    }

    const newUser: SystemUser = {
      ...user,
      id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };

    setState((prev) => {
      const updated = [...prev.additionalUsers, newUser];
      localPersistenceService.saveUsers(updated);
      return {
        ...prev,
        additionalUsers: updated,
      };
    });
    setValidationErrors({});
    return true;
  };

  const removeAdditionalUser = (userId: string) => {
    setState((prev) => {
      const updated = prev.additionalUsers.filter((u) => u.id !== userId);
      localPersistenceService.saveUsers(updated);
      return {
        ...prev,
        additionalUsers: updated,
      };
    });
  };

  const completeOnboarding = () => {
    const finalState: OnboardingState = {
      ...state,
      isCompleted: true,
      completedAt: new Date().toISOString(),
    };
    setState(finalState);
    localPersistenceService.saveOnboardingState(finalState);
    if (finalState.additionalUsers.length > 0) {
      localPersistenceService.saveUsers(finalState.additionalUsers);
    }
  };

  const resetAll = () => {
    localPersistenceService.resetOnboarding();
    setState({ ...DEFAULT_INITIAL_ONBOARDING_STATE });
    scanPrinters();
  };

  return {
    state,
    connectedPrinters,
    isDetectingPrinters,
    detectionError,
    validationErrors,
    scanPrinters,
    validateUserDetails,
    validateAdminAccount,
    validateTerms,
    nextStep,
    prevStep,
    goToStep,
    updateUserDetails,
    setPrimaryPrinter,
    updateTerms,
    setAdminAccount,
    addAdditionalUser,
    removeAdditionalUser,
    completeOnboarding,
    resetAll,
  };
}
