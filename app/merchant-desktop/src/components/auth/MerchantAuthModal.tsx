import React, { useState, useEffect } from 'react';
import {
  Store,
  Lock,
  User,
  Mail,
  Phone,
  QrCode,
  Printer,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  Key,
} from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface MerchantAuthModalProps {
  isOnboarded: boolean;
  onAuthenticated: (token: string, merchant: any) => void;
}

export const MerchantAuthModal: React.FC<MerchantAuthModalProps> = ({
  isOnboarded,
  onAuthenticated,
}) => {
  const [authTab, setAuthTab] = useState<'login' | 'signup' | 'onboard'>(
    isOnboarded ? 'login' : 'onboard'
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up Form State (Local Operator Registration)
  const [signupUsername, setSignupUsername] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // First-Time Onboarding Form State (Primary Administrator Account)
  const [shopName, setShopName] = useState('AutoPrint Express Store');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [onboardPassword, setOnboardPassword] = useState('');
  const [onboardConfirmPassword, setOnboardConfirmPassword] = useState('');
  const [address, setAddress] = useState('Shop Counter #01, Main Campus');
  const [upiId, setUpiId] = useState('autoprint@upi');
  const [bwPrice, setBwPrice] = useState(2.0);
  const [colorPrice, setColorPrice] = useState(10.0);

  // Real Windows printers list for onboarding dropdown
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('AutoPrint Virtual Spooler');

  useEffect(() => {
    apiFetch('/api/printers')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
          const names = data.data.map((p: any) => p.name);
          setAvailablePrinters(names);
          setSelectedPrinter(names[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await apiFetch('/api/merchant/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: loginIdentifier.trim(),
          password: loginPassword,
          rememberMe,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Authentication failed. Please check credentials.');
      }

      localStorage.setItem('autoprint_merchant_session_token', data.data.token);
      onAuthenticated(data.data.token, data.data.merchant);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await apiFetch('/api/merchant/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signupUsername.trim().toLowerCase(),
          ownerName: signupFullName.trim(),
          email: signupEmail.trim(),
          phone: signupPhone.trim() || undefined,
          password: signupPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Registration failed. Please check your inputs.');
      }

      localStorage.setItem('autoprint_merchant_session_token', data.data.token);
      onAuthenticated(data.data.token, data.data.merchant);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (onboardPassword.length < 6) {
      setErrorMessage('Administrator password must be at least 6 characters long.');
      return;
    }

    if (onboardPassword !== onboardConfirmPassword) {
      setErrorMessage('Administrator passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch('/api/merchant/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: shopName.trim(),
          ownerName: ownerName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password: onboardPassword,
          address: address.trim(),
          upiId: upiId.trim() || undefined,
          selectedPrinter,
          colorPricePerPage: colorPrice,
          bwPricePerPage: bwPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Onboarding failed. Please review the inputs.');
      }

      localStorage.setItem('autoprint_merchant_session_token', data.data.token);
      onAuthenticated(data.data.token, data.data.merchant);
    } catch (err: any) {
      setErrorMessage(err.message || 'Onboarding failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0e]/85 backdrop-blur-lg font-sans">
      <div className="w-full max-w-lg bg-[#141419] rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 flex flex-col max-h-[92vh] overflow-y-auto text-white">
        
        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">
              AutoPrint Merchant Desk
            </h2>
            <p className="text-xs text-zinc-400 font-medium">
              {authTab === 'login'
                ? 'Sign in to access your print queue & verification terminal'
                : authTab === 'signup'
                ? 'Register a local desk operator account'
                : 'Configure your primary store profile to start'}
            </p>
          </div>
        </div>

        {/* Tab Navigation (Login vs Local Sign Up) */}
        {isOnboarded && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-2xl border border-white/10 mb-5">
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setErrorMessage(null);
              }}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                authTab === 'login'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('signup');
                setErrorMessage(null);
              }}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                authTab === 'signup'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up Locally</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* FORM 1: LOGIN TAB */}
        {authTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Username, Email, or Phone</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="admin or user@autoprint.local"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>



            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/20 bg-black text-purple-600 focus:ring-purple-500"
                />
                <span>Remember me on this station</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In to Merchant Desk'}</span>
            </button>
          </form>
        )}

        {/* FORM 2: SIGN UP TAB (Local Staff Registration) */}
        {authTab === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Username *</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. cashier_1 or rahul"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={signupFullName}
                onChange={(e) => setSignupFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="rahul@domain.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Phone</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-black/40 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-[11px] text-zinc-400">
              ℹ️ Local sign-ups are registered with <strong className="text-blue-300 font-bold">Staff Operator</strong> permissions. Only Administrators can add or manage other user accounts.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Creating Account...' : 'Sign Up as Staff Operator'}</span>
            </button>
          </form>
        )}

        {/* FORM 3: ONBOARDING TAB (First Install Only) */}
        {authTab === 'onboard' && (
          <form onSubmit={handleOnboardSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Manager Name *</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Admin Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Admin Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={onboardPassword}
                    onChange={(e) => setOnboardPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Confirm Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="Confirm password"
                    value={onboardConfirmPassword}
                    onChange={(e) => setOnboardConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Target Printer</label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-black/40 text-white text-xs focus:outline-none focus:border-purple-500"
              >
                {availablePrinters.length > 0 ? (
                  availablePrinters.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))
                ) : (
                  <option value="AutoPrint Virtual Spooler">AutoPrint Virtual Spooler</option>
                )}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Initializing...' : 'Complete Onboarding & Enter Dashboard'}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
