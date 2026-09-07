import React, { useState } from 'react';
import {
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Laptop,
  Check,
} from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface FirstRunOnboardingProps {
  onSetupComplete: (token: string, merchant: any) => void;
  onGoToLogin?: () => void;
}

type OnboardingStep = 'welcome' | 'createUser' | 'rememberPc' | 'complete';

export const FirstRunOnboarding: React.FC<FirstRunOnboardingProps> = ({
  onSetupComplete,
  onGoToLogin,
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Completed User & Token cache before opening dashboard
  const [createdSession, setCreatedSession] = useState<{
    token: string;
    merchant: any;
  } | null>(null);

  // Step 2 Form Validation
  const validateStep2 = (): boolean => {
    setErrorMessage(null);
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Full Name is required (at least 2 characters).');
      return false;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleStep2Continue = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep2()) {
      setErrorMessage(null);
      setCurrentStep('rememberPc');
    }
  };

  // Step 3: Finalize and call backend API
  const handleFinalizeSetup = async () => {
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await apiFetch('/api/setup/create-first-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          username: username.trim() ? username.trim().toLowerCase() : email.trim().split('@')[0],
          password,
          confirmPassword,
          rememberMe,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (res.status === 403 || json.error?.includes('already been completed')) {
          setErrorMessage('AutoPrint setup has already been completed. Please proceed to sign in.');
          return;
        }
        throw new Error(json.error || 'Failed to create merchant account. Please try again.');
      }

      setCreatedSession({
        token: json.data.token,
        merchant: json.data.merchant,
      });
      setCurrentStep('complete');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDashboard = () => {
    if (createdSession) {
      onSetupComplete(createdSession.token, createdSession.merchant);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col justify-center items-center p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-blue-600/10 via-indigo-600/15 to-purple-600/10 blur-[130px] pointer-events-none -z-0" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/5 blur-[120px] pointer-events-none -z-0" />

      {/* Wizard Progress Indicator (Steps 1 to 3) */}
      {currentStep !== 'complete' && (
        <div className="w-full max-w-md mb-8 flex items-center justify-between relative px-4">
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-white/10 -z-0" />
          <div
            className="absolute left-6 top-1/2 -translate-y-1/2 h-[2px] bg-blue-500 transition-all duration-500 -z-0"
            style={{
              width:
                currentStep === 'welcome'
                  ? '0%'
                  : currentStep === 'createUser'
                  ? '50%'
                  : '100%',
            }}
          />

          {/* Step 1 Node */}
          <div className="flex flex-col items-center gap-1.5 relative z-10">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs border transition-all duration-300 ${
                currentStep === 'welcome'
                  ? 'bg-blue-600 border-blue-400 text-white ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/30'
                  : 'bg-emerald-600 border-emerald-400 text-white'
              }`}
            >
              {currentStep === 'welcome' ? '1' : <Check className="w-4 h-4" />}
            </div>
            <span className="text-[11px] font-medium tracking-wide text-zinc-400">Welcome</span>
          </div>

          {/* Step 2 Node */}
          <div className="flex flex-col items-center gap-1.5 relative z-10">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs border transition-all duration-300 ${
                currentStep === 'createUser'
                  ? 'bg-blue-600 border-blue-400 text-white ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/30'
                  : currentStep === 'rememberPc'
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-[#161821] border-white/10 text-zinc-400'
              }`}
            >
              {currentStep === 'rememberPc' ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <span className="text-[11px] font-medium tracking-wide text-zinc-400">Account</span>
          </div>

          {/* Step 3 Node */}
          <div className="flex flex-col items-center gap-1.5 relative z-10">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs border transition-all duration-300 ${
                currentStep === 'rememberPc'
                  ? 'bg-blue-600 border-blue-400 text-white ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/30'
                  : 'bg-[#161821] border-white/10 text-zinc-400'
              }`}
            >
              3
            </div>
            <span className="text-[11px] font-medium tracking-wide text-zinc-400">Session</span>
          </div>
        </div>
      )}

      {/* Main Card Container */}
      <div className="w-full max-w-lg bg-[#14161f]/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-8 sm:p-10 relative z-10 transition-all duration-300">
        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{errorMessage}</p>
              {errorMessage.includes('already been completed') && onGoToLogin && (
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="mt-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Go to Sign In
                </button>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SCREEN 1: WELCOME PAGE                                              */}
        {/* ==================================================================== */}
        {currentStep === 'welcome' && (
          <div className="text-center py-4 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            {/* Logo Badge */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-xl shadow-blue-500/20 mb-6 flex items-center justify-center">
              <div className="w-full h-full bg-[#14161f] rounded-[14px] flex items-center justify-center">
                <Printer className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              First-Time Initialization
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
              AUTOPRINT
            </h1>
            <p className="text-lg font-medium text-zinc-300 mb-4">
              Welcome to your Print Shop System
            </p>

            <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed mb-8">
              Let&apos;s set up your merchant account before you start managing print jobs,
              configuring printers, and receiving customer requests.
            </p>

            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setCurrentStep('createUser');
              }}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] transition-all duration-150 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SCREEN 2: CREATE FIRST USER                                         */}
        {/* ==================================================================== */}
        {currentStep === 'createUser' && (
          <form
            onSubmit={handleStep2Continue}
            className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300"
          >
            <div className="text-left mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Create Your Merchant Account
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                You will be the primary administrator and owner of this AutoPrint system.
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0e1017] border border-white/10 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Email & Username Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="merchant@shop.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0e1017] border border-white/10 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Username <span className="text-zinc-500 text-[10px] lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <span className="text-xs font-mono font-bold">@</span>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={email ? email.split('@')[0] : 'admin'}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0e1017] border border-white/10 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0e1017] border border-white/10 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0e1017] border border-white/10 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setCurrentStep('welcome');
                }}
                className="py-3 px-4 rounded-xl font-medium text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ==================================================================== */}
        {/* SCREEN 3: REMEMBER THIS PC                                          */}
        {/* ==================================================================== */}
        {currentStep === 'rememberPc' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-left mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                <Laptop className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Remember This PC
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Configure your sign-in preference for this workstation.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <label
                onClick={() => setRememberMe(!rememberMe)}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                  rememberMe
                    ? 'bg-blue-600/10 border-blue-500/40 text-white'
                    : 'bg-[#0e1017] border-white/10 text-zinc-400 hover:border-white/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => {}} // handled by parent label onClick
                  className="mt-1 w-4 h-4 rounded border-zinc-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-[#0d0e12]"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Remember this PC</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Keep your Merchant Desk signed in on this computer. Future launches will
                    automatically open the operational dashboard without prompting for your password.
                  </p>
                </div>
              </label>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3 text-xs text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Your password is never stored in plaintext and remains cryptographically protected.</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setErrorMessage(null);
                  setCurrentStep('createUser');
                }}
                className="py-3 px-4 rounded-xl font-medium text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleFinalizeSetup}
                className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Complete Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SCREEN 4: SETUP COMPLETE                                            */}
        {/* ==================================================================== */}
        {currentStep === 'complete' && (
          <div className="text-center py-4 flex flex-col items-center animate-in fade-in zoom-in-95 duration-400">
            {/* Success Ring */}
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>

            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
              ALL SET! 🎉
            </h2>
            <p className="text-base font-medium text-zinc-300 mb-6">
              Your AutoPrint Merchant Desk is ready to use.
            </p>

            {/* Account Confirmation Card */}
            <div className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left mb-8 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Owner Account:</span>
                <span className="font-semibold text-white">{createdSession?.merchant?.ownerName || fullName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Email:</span>
                <span className="font-mono text-zinc-200">{createdSession?.merchant?.email || email}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Workstation Session:</span>
                <span className="text-emerald-400 font-medium">
                  {rememberMe ? 'Remembered on this PC' : 'Standard Session'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenDashboard}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] transition-all duration-150 shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 group"
            >
              <span>Open Merchant Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
