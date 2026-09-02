/**
 * Step 1: User Details Collection (Name, Email, Shop Name, Shop Owner Name)
 */
import React from 'react';
import { Store, User, Mail, UserCheck, MapPin, Phone, Building2 } from 'lucide-react';
import { ShopUserDetails } from '../../types/onboarding';

interface StepUserDetailsProps {
  details: ShopUserDetails;
  onChange: (details: Partial<ShopUserDetails>) => void;
  errors: Record<string, string>;
}

export const StepUserDetails: React.FC<StepUserDetailsProps> = ({ details, onChange, errors }) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Shop & Merchant Identity
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Provide your business and store information. These details will be printed on receipt headers, invoices, and the customer mobile portal.
        </p>
      </div>

      <div className="space-y-4">
        {/* Store Name & Owner Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Shop / Business Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Store className="w-4 h-4" />
              </div>
              <input
                id="input-shop-name"
                type="text"
                value={details.shopName}
                onChange={(e) => onChange({ shopName: e.target.value })}
                placeholder="e.g. Apex Print & Parcel Hub"
                className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  errors.shopName ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.shopName && (
              <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.shopName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Shop Owner Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserCheck className="w-4 h-4" />
              </div>
              <input
                id="input-shop-owner"
                type="text"
                value={details.shopOwnerName}
                onChange={(e) => onChange({ shopOwnerName: e.target.value })}
                placeholder="e.g. Eleanor Vance"
                className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  errors.shopOwnerName ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.shopOwnerName && (
              <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.shopOwnerName}</p>
            )}
          </div>
        </div>

        {/* Primary Contact Person & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Station Operator / Manager Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="input-full-name"
                type="text"
                value={details.fullName}
                onChange={(e) => onChange({ fullName: e.target.value })}
                placeholder="e.g. David Miller"
                className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  errors.fullName ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Contact / Admin Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="input-email"
                type="email"
                value={details.email}
                onChange={(e) => onChange({ email: e.target.value })}
                placeholder="e.g. contact@apexprint.local"
                className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  errors.email ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-red-600 font-semibold mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        {/* Optional Phone & Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Store Phone Number <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="input-phone"
                type="text"
                value={details.phone || ''}
                onChange={(e) => onChange({ phone: e.target.value })}
                placeholder="e.g. (555) 234-5678"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Physical Store Address <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                id="input-address"
                type="text"
                value={details.address || ''}
                onChange={(e) => onChange({ address: e.target.value })}
                placeholder="e.g. 104 Market St, Suite A"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
