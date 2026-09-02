'use client';

import React from 'react';
import { Printer, Phone, Clock, ShieldCheck } from 'lucide-react';
import { Badge } from './Badge';
import type { MerchantSettings } from '@/types';

interface HeaderProps {
  merchantSettings: MerchantSettings;
  activeStationId?: string;
  onStationChange?: (stationId: string) => void;
  stationOptions?: { value: string; label: string }[];
}

const DEFAULT_STATIONS = [
  { value: 'STATION-01 (Front Counter)', label: 'Counter #1 (Express Pickup)' },
  { value: 'STATION-02 (Self-Serve Kiosk)', label: 'Kiosk #2 (Color Lab)' },
  { value: 'STATION-03 (Bulk Print Dept)', label: 'Station #3 (Heavy Binder)' },
];

export const Header: React.FC<HeaderProps> = ({
  merchantSettings,
  activeStationId,
  onStationChange,
  stationOptions = DEFAULT_STATIONS,
}) => {
  return (
    <header className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/50 relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Direct Self-Service Print Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {merchantSettings.storeName}
          </h1>
          {merchantSettings.storeTagline && (
            <p className="text-sm text-indigo-200 font-medium">
              {merchantSettings.storeTagline}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" aria-hidden="true" />
              <span>{merchantSettings.operatingHours}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" aria-hidden="true" />
              <a
                href={`tel:${merchantSettings.supportPhone}`}
                className="hover:text-white hover:underline underline-offset-2 transition-colors"
              >
                {merchantSettings.supportPhone}
              </a>
            </span>
          </div>
        </div>

        {activeStationId && onStationChange && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 shrink-0 w-full sm:w-auto">
            <label
              htmlFor="header-select-station"
              className="block text-[10px] uppercase font-bold text-indigo-200 tracking-wider mb-1.5"
            >
              Active Station Counter
            </label>
            <select
              id="header-select-station"
              value={activeStationId}
              onChange={(e) => onStationChange(e.target.value)}
              aria-label="Select active station counter"
              className="w-full sm:w-56 bg-slate-900 text-white text-xs font-bold rounded-lg px-3 py-2 border border-indigo-400/40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {stationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-indigo-900/60 mt-5">
        <div className="flex items-center gap-2.5 text-indigo-200">
          <Badge variant="indigo" size="sm">1</Badge>
          <span className="text-sm font-medium truncate">Upload Documents</span>
        </div>
        <div className="flex items-center gap-2.5 text-indigo-200">
          <Badge variant="indigo" size="sm">2</Badge>
          <span className="text-sm font-medium truncate">Configure Print Options</span>
        </div>
        <div className="flex items-center gap-2.5 text-indigo-200">
          <Badge variant="indigo" size="sm">3</Badge>
          <span className="text-sm font-medium truncate">Secure Pay &amp; Print</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
        <span className="text-xs font-semibold text-emerald-300">
          100% Zero-Cloud Storage • Direct Transfer to Store PC • Automatic Secure Shredding
        </span>
      </div>
    </header>
  );
};
