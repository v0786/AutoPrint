'use client';

import React from 'react';
import {
  ColorMode,
  PaperSize,
  Sidedness,
  PaperFinish,
  BindingOption,
  PrintPreferences,
  PricingSettings,
} from '../../types';
import { Palette, Layers, Scissors, Settings2 } from 'lucide-react';

interface PrintPreferencesFormProps {
  preferences: PrintPreferences;
  onChange: (preferences: PrintPreferences) => void;
  pricingSettings: PricingSettings;
  totalOriginalPages: number;
}

export const PrintPreferencesForm: React.FC<PrintPreferencesFormProps> = ({
  preferences,
  onChange,
  pricingSettings,
  totalOriginalPages,
}) => {
  const updateField = <K extends keyof PrintPreferences>(key: K, value: PrintPreferences[K]) => {
    onChange({
      ...preferences,
      [key]: value,
    });
  };

  return (
    <div className="space-y-5 bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/80">
        <Settings2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Print Configuration & Preferences
        </h3>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Color Mode
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            id="pref-color-bw"
            onClick={() => updateField('colorMode', 'bw')}
            className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
              preferences.colorMode === 'bw'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Black & White</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pricingSettings.currency}{pricingSettings.bwPricePerPage.toFixed(2)} / page
              </p>
            </div>
            <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
              B
            </div>
          </button>

          <button
            type="button"
            id="pref-color-color"
            onClick={() => updateField('colorMode', 'color')}
            className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
              preferences.colorMode === 'color'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Full Color</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pricingSettings.currency}{pricingSettings.colorPricePerPage.toFixed(2)} / page
              </p>
            </div>
            <div className="w-6 h-6 rounded-full bg-linear-to-tr from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center">
              <Palette className="w-3.5 h-3.5 text-white" />
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Paper Size
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['A4', 'A3', 'Letter', 'Legal'] as PaperSize[]).map((size) => (
              <button
                key={size}
                type="button"
                id={`pref-size-${size.toLowerCase()}`}
                onClick={() => updateField('paperSize', size)}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-center ${
                  preferences.paperSize === size
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                {size} {size === 'A3' ? '(2x size)' : ''}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Sidedness</span>
            {pricingSettings.duplexDiscountPercent > 0 && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                Save {pricingSettings.duplexDiscountPercent}% on Duplex
              </span>
            )}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="pref-side-single"
              onClick={() => updateField('sidedness', 'single')}
              className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-all text-center ${
                preferences.sidedness === 'single'
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              Single-sided
            </button>
            <button
              type="button"
              id="pref-side-duplex"
              onClick={() => updateField('sidedness', 'double_long')}
              className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-all text-center ${
                preferences.sidedness.startsWith('double')
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              Double-sided (Duplex)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Number of Copies
          </label>
          <div className="flex items-center">
            <button
              type="button"
              id="copies-decrement"
              onClick={() => updateField('copies', Math.max(1, preferences.copies - 1))}
              className="w-10 h-10 rounded-l-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              -
            </button>
            <input
              type="number"
              id="pref-copies-input"
              min={1}
              max={500}
              value={preferences.copies}
              onChange={(e) => updateField('copies', Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full h-10 text-center font-bold text-sm border-y border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
            />
            <button
              type="button"
              id="copies-increment"
              onClick={() => updateField('copies', Math.min(500, preferences.copies + 1))}
              className="w-10 h-10 rounded-r-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Page Range</span>
            <span className="text-[10px] text-slate-400">Total: {totalOriginalPages} pages</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="pref-page-range"
              value={preferences.pageRange}
              onChange={(e) => updateField('pageRange', e.target.value)}
              placeholder="e.g. All, 1-5, 8"
              className="w-full h-10 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Paper Stock / Finish</span>
          </label>
          <select
            id="pref-paper-finish"
            value={preferences.paperFinish}
            onChange={(e) => updateField('paperFinish', e.target.value as PaperFinish)}
            className="w-full h-10 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-indigo-500"
          >
            <option value="standard_80gsm">Standard Plain (80 gsm) - +{pricingSettings.currency}0.00</option>
            <option value="premium_100gsm">Premium Executive (100 gsm) - +{pricingSettings.currency}{pricingSettings.paperFinishPrices.premium_100gsm.toFixed(2)}/sheet</option>
            <option value="glossy_photo_200gsm">Glossy Photo (200 gsm) - +{pricingSettings.currency}{pricingSettings.paperFinishPrices.glossy_photo_200gsm.toFixed(2)}/sheet</option>
            <option value="cardstock_250gsm">Heavy Cardstock (250 gsm) - +{pricingSettings.currency}{pricingSettings.paperFinishPrices.cardstock_250gsm.toFixed(2)}/sheet</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
            <Scissors className="w-3.5 h-3.5 text-slate-400" />
            <span>Finishing / Binding</span>
          </label>
          <select
            id="pref-binding-option"
            value={preferences.binding}
            onChange={(e) => updateField('binding', e.target.value as BindingOption)}
            className="w-full h-10 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-indigo-500"
          >
            <option value="none">No Binding (Loose Sheets) - +{pricingSettings.currency}0.00</option>
            <option value="staple_top_left">Corner Staple (Top Left) - +{pricingSettings.currency}{pricingSettings.bindingPrices.staple_top_left.toFixed(2)}</option>
            <option value="corner_punch">2-Hole / 3-Hole Punch - +{pricingSettings.currency}{pricingSettings.bindingPrices.corner_punch.toFixed(2)}</option>
            <option value="spiral_bound">Spiral / Coil Bound + Clear Cover - +{pricingSettings.currency}{pricingSettings.bindingPrices.spiral_bound.toFixed(2)}</option>
            <option value="comb_bound">Plastic Comb Bound - +{pricingSettings.currency}{pricingSettings.bindingPrices.comb_bound.toFixed(2)}</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Special Notes for Store Operator (Optional)
        </label>
        <input
          type="text"
          id="pref-custom-notes"
          value={preferences.customNotes || ''}
          onChange={(e) => updateField('customNotes', e.target.value)}
          placeholder="e.g. Please staple landscape orientation, cut along margin"
          className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-indigo-500"
        />
      </div>
    </div>
  );
};
