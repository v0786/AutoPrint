/**
 * Step 4: Admin Account Creation with Secure Username, Password Strength & Verification
 */
import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, Shield, Check, X, KeyRound } from 'lucide-react';
import { AdminAccount } from '../../types/onboarding';

interface StepAdminAccountProps {
  adminAccount: AdminAccount | null;
  onSetAccount: (account: AdminAccount) => void;
  errors: Record<string, string>;
  password?: string;
  confirmPassword?: string;
  onPasswordChange?: (password: string, confirmPassword: string) => void;
}

export const StepAdminAccount: React.FC<StepAdminAccountProps> = ({
  adminAccount,
  onSetAccount,
  errors,
  password: externalPassword,
  confirmPassword: externalConfirmPassword,
  onPasswordChange,
}) => {
  const [username, setUsername] = useState(adminAccount?.username || 'admin');
  const [internalPassword, setInternalPassword] = useState('');
  const [internalConfirmPassword, setInternalConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState(
    adminAccount?.securityQuestion || 'What was the name of your first store?'
  );
  const [securityAnswer, setSecurityAnswer] = useState(adminAccount?.securityAnswer || '');

  const password = externalPassword !== undefined ? externalPassword : internalPassword;
  const confirmPassword =
    externalConfirmPassword !== undefined ? externalConfirmPassword : internalConfirmPassword;

  const updatePassword = (newPass: string) => {
    if (onPasswordChange) {
      onPasswordChange(newPass, confirmPassword);
    } else {
      setInternalPassword(newPass);
    }
    handleUpdate(username, newPass, securityAnswer, securityQuestion);
  };

  const updateConfirmPassword = (newConf: string) => {
    if (onPasswordChange) {
      onPasswordChange(password, newConf);
    } else {
      setInternalConfirmPassword(newConf);
    }
  };

  // Password requirements calculation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const matchesConfirm = password.length > 0 && password === confirmPassword;

  const strengthScore = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

  const handleUpdate = (newUsername: string, newPass: string, newAns: string, newQ: string) => {
    onSetAccount({
      username: newUsername,
      passwordHash: `sha256_mock_${newPass.split('').reverse().join('')}`,
      createdAt: new Date().toISOString(),
      securityQuestion: newQ,
      securityAnswer: newAns,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Create Master Admin Account
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          The master administrator has unrestricted rights to configure printer ports, manage operators, and audit spooler logs.
        </p>
      </div>

      <div className="space-y-4">
        {/* Username */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Admin Username <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="input-admin-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                handleUpdate(e.target.value, password, securityAnswer, securityQuestion);
              }}
              placeholder="e.g. admin"
              className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                errors.username ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
              }`}
            />
          </div>
          {errors.username && (
            <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.username}</p>
          )}
        </div>

        {/* Password & Confirm Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Admin Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => updatePassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full pl-9 pr-10 py-2.5 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  errors.password ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="input-admin-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => updateConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  errors.confirmPassword ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] text-red-600 font-semibold mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        {/* Password Strength Meter */}
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Password Strength
            </span>
            <span className="font-bold text-slate-800">
              {strengthScore === 4
                ? 'Strong'
                : strengthScore >= 2
                ? 'Moderate'
                : password
                ? 'Weak'
                : 'Not entered'}
            </span>
          </div>

          {/* Strength Bar */}
          <div className="grid grid-cols-4 gap-1.5 h-1.5">
            <div
              className={`rounded-full transition-all ${
                strengthScore >= 1 ? 'bg-red-500' : 'bg-slate-100'
              }`}
            />
            <div
              className={`rounded-full transition-all ${
                strengthScore >= 2 ? 'bg-amber-500' : 'bg-slate-100'
              }`}
            />
            <div
              className={`rounded-full transition-all ${
                strengthScore >= 3 ? 'bg-emerald-500' : 'bg-slate-100'
              }`}
            />
            <div
              className={`rounded-full transition-all ${
                strengthScore >= 4 ? 'bg-emerald-600' : 'bg-slate-100'
              }`}
            />
          </div>

          {/* Requirement Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <span
              className={`flex items-center gap-1 font-medium ${
                hasMinLength ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {hasMinLength ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-red-500" />}
              8+ Characters
            </span>
            <span
              className={`flex items-center gap-1 font-medium ${
                hasUppercase ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {hasUppercase ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-red-500" />}
              Uppercase Letter
            </span>
            <span
              className={`flex items-center gap-1 font-medium ${
                hasNumber ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {hasNumber ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-red-500" />}
              Number (0-9)
            </span>
            <span
              className={`flex items-center gap-1 font-medium ${
                matchesConfirm ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              {matchesConfirm ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <X className="w-3 h-3 text-slate-300" />
              )}
              Matching Passwords
            </span>
          </div>
        </div>

        {/* Local Recovery Question */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Local Security Recovery Question <span className="text-[10px] text-slate-400 font-normal">(Offline Reset)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={securityQuestion}
              onChange={(e) => {
                setSecurityQuestion(e.target.value);
                handleUpdate(username, password, securityAnswer, e.target.value);
              }}
              className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="What was the name of your first store?">What was the name of your first store?</option>
              <option value="What is the city of your primary business registration?">What is the city of your business?</option>
              <option value="What is your favorite coffee blend?">What is your favorite coffee blend?</option>
            </select>

            <input
              type="text"
              value={securityAnswer}
              onChange={(e) => {
                setSecurityAnswer(e.target.value);
                handleUpdate(username, password, e.target.value, securityQuestion);
              }}
              placeholder="Recovery Answer"
              className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
