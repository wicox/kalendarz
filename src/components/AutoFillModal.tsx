import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Scale,
  ShieldCheck,
  Moon,
  Clock,
  Check,
} from 'lucide-react';
import { Worker, AutoFillOptions, AutoFillResult } from '../types/schedule';
import { getDaysInMonth } from '../utils/calendar';

interface AutoFillModalProps {
  isOpen: boolean;
  currentDate: Date;
  workers: Worker[];
  options: AutoFillOptions;
  onOptionsChange: (newOptions: AutoFillOptions) => void;
  onRunAutoFill: () => void;
  onBalanceNorms: () => void;
  onClose: () => void;
  lastResult: AutoFillResult | null;
}

export const AutoFillModal: React.FC<AutoFillModalProps> = ({
  isOpen,
  currentDate,
  workers,
  options,
  onOptionsChange,
  onRunAutoFill,
  onBalanceNorms,
  onClose,
  lastResult,
}) => {
  const [activePreset, setActivePreset] = useState<'standard' | 'flexible' | 'strict'>('standard');

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const totalRequired = daysInMonth * 4;

  const mainWorkers = workers.filter((w) => !w.isPodjazd);
  const totalConfigured = mainWorkers.reduce((acc, w) => acc + (w.maxShifts || 15), 0);
  const isQuotaMatched = totalConfigured === totalRequired;
  const quotaDifference = totalConfigured - totalRequired;

  const handleApplyPreset = (preset: 'standard' | 'flexible' | 'strict') => {
    setActivePreset(preset);
    if (preset === 'standard') {
      onOptionsChange({
        ...options,
        maxConsecutiveDays: 3,
        maxShiftsPerWeek: 3,
        enforceExperiencePairing: true,
        enforceRestPeriod: true,
        enforceNightPref: true,
        balanceWeekends: true,
        evenSpacing: true,
        preserveExisting: true,
        ensureFreeSunday: true,
      });
    } else if (preset === 'flexible') {
      onOptionsChange({
        ...options,
        maxConsecutiveDays: 3,
        maxShiftsPerWeek: 4,
        enforceExperiencePairing: true,
        enforceRestPeriod: true,
        enforceNightPref: false,
        balanceWeekends: false,
        evenSpacing: true,
        preserveExisting: true,
        ensureFreeSunday: true,
      });
    } else if (preset === 'strict') {
      onOptionsChange({
        ...options,
        maxConsecutiveDays: 2,
        maxShiftsPerWeek: 3,
        enforceExperiencePairing: true,
        enforceRestPeriod: true,
        enforceNightPref: true,
        balanceWeekends: true,
        evenSpacing: true,
        preserveExisting: true,
        ensureFreeSunday: true,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Generator Grafiku i Optymalizacja Zmian
              </h2>
              <p className="text-xs text-slate-500">
                Wielokryterialny algorytm z regułami Kodeksu Pracy i balansem obsady stacji
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quota & Mathematical Validation Box */}
        <div className="my-4 rounded-xl border p-4 transition-colors bg-slate-50 border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500">
                Bilans zapotrzebowania na stacji:
              </div>
              <div className="mt-1 flex items-baseline gap-2 font-mono">
                <span className="text-xl font-black text-slate-900">{totalConfigured}</span>
                <span className="text-xs text-slate-400">/ {totalRequired} zmian wymaganych</span>
                {isQuotaMatched ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> Zgodność 100%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                    <AlertTriangle className="h-3 w-3" /> Różnica:{' '}
                    {quotaDifference > 0 ? `+${quotaDifference}` : quotaDifference} zmian
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {mainWorkers.length} pracowników głównych × 4 zmiany dziennie ({daysInMonth} dni).
              </p>
            </div>

            {!isQuotaMatched && (
              <button
                type="button"
                onClick={onBalanceNorms}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 shadow-xs hover:bg-amber-400 transition-colors"
              >
                <Scale className="h-4 w-4" />
                <span>Wyrównaj normy w zespole</span>
              </button>
            )}
          </div>
        </div>

        {/* Presets Selector */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-bold text-slate-700">
            Wybierz tryb optymalizacji:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset('standard')}
              className={`rounded-xl border p-3 text-left transition-all ${
                activePreset === 'standard'
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold text-slate-900">Zrównoważony</div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                Standard Kodeksu Pracy, max 3 zmiany/tydzień, senior + junior.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('flexible')}
              className={`rounded-xl border p-3 text-left transition-all ${
                activePreset === 'flexible'
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold text-slate-900">Elastyczny</div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                Dopuszcza do 4 zmian w tygodniu, wysoka zdawalność.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('strict')}
              className={`rounded-xl border p-3 text-left transition-all ${
                activePreset === 'strict'
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold text-slate-900">Maks. Odpoczynek</div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                Maksymalnie 2 zmiany 12h pod rząd, rygorystyczne przerwy.
              </div>
            </button>
          </div>
        </div>

        {/* Detailed Options Toggles */}
        <div className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Odpoczynek dobowy (min. 11h)
                </div>
                <div className="text-[10px] text-slate-500">
                  Bezwzględny zakaz brania dniówki rano o 06:00 bezpośrednio po nocy
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={options.enforceRestPeriod}
              onChange={(e) => onOptionsChange({ ...options, enforceRestPeriod: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Balans doświadczenia na stacji (Senior + Junior)
                </div>
                <div className="text-[10px] text-slate-500">
                  Zakaz parowania dwóch stażystów/juniorów bez wsparcia doświadczonego pracownika
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={options.enforceExperiencePairing}
              onChange={(e) =>
                onOptionsChange({ ...options, enforceExperiencePairing: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-indigo-600" />
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Ścisłe preferencje nocy (0-100%)
                </div>
                <div className="text-[10px] text-slate-500">
                  Dążenie do dokładnego odsetka nocek zdefiniowanego w profilu pracownika
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={options.enforceNightPref}
              onChange={(e) =>
                onOptionsChange({ ...options, enforceNightPref: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Maksymalnie dni pracy z rzędu: {options.maxConsecutiveDays} dni
                </div>
                <div className="text-[10px] text-slate-500">
                  Po tylu zmianach 12h nastąpi obowiązkowy dzień wolny
                </div>
              </div>
            </div>
            <select
              value={options.maxConsecutiveDays}
              onChange={(e) =>
                onOptionsChange({ ...options, maxConsecutiveDays: Number(e.target.value) })
              }
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800"
            >
              <option value={2}>2 dni (zalecane)</option>
              <option value={3}>3 dni</option>
              <option value={4}>4 dni</option>
            </select>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Zachowaj ręcznie wprowadzone urlopy i zmiany
              </div>
              <div className="text-[10px] text-slate-500">
                Nie nadpisuj oznaczonych urlopów (U) ani dni wolnych (*)
              </div>
            </div>
            <input
              type="checkbox"
              checked={options.preserveExisting}
              onChange={(e) =>
                onOptionsChange({ ...options, preserveExisting: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600"
            />
          </div>
        </div>

        {/* Last Generation Result Report */}
        {lastResult && (
          <div
            className={`mb-4 rounded-xl border p-3.5 text-xs ${
              lastResult.success
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {lastResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <span>{lastResult.message}</span>
            </div>
            {lastResult.warnings.length > 0 && (
              <ul className="mt-2 list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                {lastResult.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Zamknij
          </button>

          <button
            type="button"
            onClick={onRunAutoFill}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md hover:bg-amber-400 active:bg-amber-600 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generuj Grafik Teraz</span>
          </button>
        </div>
      </div>
    </div>
  );
};
