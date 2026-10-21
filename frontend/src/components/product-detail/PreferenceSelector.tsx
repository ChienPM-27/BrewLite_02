'use client';

import { useState } from 'react';

interface PreferenceSelectorProps {
  disabled?: boolean;
}

const SWEETNESS_OPTIONS = [
  { value: '100%', label: '100%' },
  { value: '70%', label: '70%' },
  { value: '50%', label: '50%' },
  { value: '30%', label: '30%' },
  { value: '0%', label: '0%' },
];

const ICE_OPTIONS = [
  { value: '100%', label: '100%' },
  { value: '70%', label: '70%' },
  { value: '50%', label: '50%' },
  { value: 'less', label: 'Ít đá' },
  { value: 'none', label: 'Không đá' },
];

export default function PreferenceSelector({ disabled = false }: PreferenceSelectorProps) {
  const [sweetness, setSweetness] = useState('100%');
  const [ice, setIce] = useState('100%');

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Độ ngọt */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border-warm bg-surface-milk p-3.5 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-navy flex items-center gap-1">
            <span>Độ ngọt</span>
          </span>
          <span className="text-[11px] font-semibold text-content-secondary">
            {sweetness === '100%' ? '100% (Định mức)' : sweetness}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1 rounded-xl bg-surface-sand p-1">
          {SWEETNESS_OPTIONS.map((opt) => {
            const active = sweetness === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => setSweetness(opt.value)}
                className={`rounded-lg py-1 text-center text-xs font-bold transition-all ${
                  active
                    ? 'bg-primary text-white shadow-card'
                    : 'text-content-roast hover:bg-surface-milk/60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lượng đá */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border-warm bg-surface-milk p-3.5 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-navy flex items-center gap-1">
            <span>Lượng đá</span>
          </span>
          <span className="text-[11px] font-semibold text-content-secondary">
            {ice === '100%' ? '100% (Định lượng)' : ice === 'less' ? 'Ít đá' : ice === 'none' ? 'Không đá' : ice}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1 rounded-xl bg-surface-sand p-1">
          {ICE_OPTIONS.map((opt) => {
            const active = ice === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => setIce(opt.value)}
                className={`rounded-lg py-1 text-center text-xs font-bold transition-all ${
                  active
                    ? 'bg-primary text-white shadow-card'
                    : 'text-content-roast hover:bg-surface-milk/60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
