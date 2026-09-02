/**
 * Types for Onboarding Wizard & Local Merchant System Configuration
 */
import { PrinterDevice } from './printer';

export interface ShopUserDetails {
  fullName: string;
  email: string;
  shopName: string;
  shopOwnerName: string;
  phone?: string;
  address?: string;
}

export interface AdminAccount {
  username: string;
  passwordHash: string;
  createdAt: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

export type UserRole = 'manager' | 'cashier' | 'operator' | 'viewer';

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  pinCode?: string;
  isActive: boolean;
  createdAt: string;
}

export interface TermsAcknowledgment {
  accepted: boolean;
  acceptedAt: string;
  acceptedBy: string;
  version: string;
  agreedToLocalDataNotice: boolean;
  agreedToHardwareTelemetry: boolean;
}

export interface MerchantPaymentConfigState {
  paymentMethod: 'QR' | 'UPI' | 'BOTH';
  upiId?: string;
  qrImageUrl?: string;
  qrFileName?: string;
}

export interface OnboardingState {
  isCompleted: boolean;
  currentStep: number;
  userDetails: ShopUserDetails;
  paymentConfig: MerchantPaymentConfigState;
  adminAccount: AdminAccount | null;
  selectedPrinterId: string | null;
  printers: PrinterDevice[];
  terms: TermsAcknowledgment;
  additionalUsers: SystemUser[];
  completedAt?: string;
}

export type OnboardingStepId =
  | 'splash'
  | 'user_details'
  | 'payment_setup'
  | 'printers'
  | 'terms'
  | 'admin_account';

