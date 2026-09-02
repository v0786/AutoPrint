/**
 * Local Persistence Service for AutoPrint
 * Manages pure local client-side persistence (localStorage / IndexedDB) without any external API calls.
 */
import { OnboardingState, ShopUserDetails, AdminAccount, SystemUser, TermsAcknowledgment } from '../types/onboarding';

const ONBOARDING_STORAGE_KEY = 'autoprint_onboarding_state_v1';
const SHOP_CONFIG_STORAGE_KEY = 'autoprint_shop_config_v1';
const SYSTEM_USERS_STORAGE_KEY = 'autoprint_system_users_v1';

export const DEFAULT_TERMS_VERSION = 'v2.4.0-LOCAL-EULA';

export const DEFAULT_INITIAL_ONBOARDING_STATE: OnboardingState = {
  isCompleted: false,
  currentStep: 0,
  userDetails: {
    fullName: '',
    email: '',
    shopName: '',
    shopOwnerName: '',
    phone: '',
    address: '',
  },
  paymentConfig: {
    paymentMethod: 'BOTH',
    upiId: 'autoprint@upi',
    qrImageUrl: '',
    qrFileName: '',
  },
  adminAccount: null,
  selectedPrinterId: null,
  printers: [],
  terms: {
    accepted: false,
    acceptedAt: '',
    acceptedBy: '',
    version: DEFAULT_TERMS_VERSION,
    agreedToLocalDataNotice: false,
    agreedToHardwareTelemetry: false,
  },
  additionalUsers: [],
};

class LocalStorageService {
  /**
   * Loads onboarding state from localStorage
   */
  public getOnboardingState(): OnboardingState {
    try {
      const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to read onboarding state from localStorage', e);
    }
    return { ...DEFAULT_INITIAL_ONBOARDING_STATE };
  }

  /**
   * Persists onboarding state
   */
  public saveOnboardingState(state: OnboardingState): void {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save onboarding state to localStorage', e);
    }
  }

  /**
   * Checks if initial setup has been completed
   */
  public isOnboardingCompleted(): boolean {
    const state = this.getOnboardingState();
    return Boolean(state.isCompleted);
  }

  /**
   * Reset onboarding for re-run / testing
   */
  public resetOnboarding(): void {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      localStorage.removeItem(SHOP_CONFIG_STORAGE_KEY);
      localStorage.removeItem(SYSTEM_USERS_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear onboarding state', e);
    }
  }

  /**
   * Save standalone system users list
   */
  public saveUsers(users: SystemUser[]): void {
    try {
      localStorage.setItem(SYSTEM_USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users', e);
    }
  }

  /**
   * Retrieve standalone system users list
   */
  public getUsers(): SystemUser[] {
    try {
      const raw = localStorage.getItem(SYSTEM_USERS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to get users', e);
    }
    return [];
  }
}

export const localPersistenceService = new LocalStorageService();
