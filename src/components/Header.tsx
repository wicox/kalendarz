import React from 'react';
import { Calendar, Users, BarChart3, AlertCircle, Printer, Download, Sparkles } from 'lucide-react';
import { POLISH_MONTHS } from '../utils/calendar';

interface HeaderProps {
  currentDate: Date;
  workNormHours: number;
  totalConfiguredShifts: number;
  totalRequiredShifts: number;
  activeTab: 'schedule' | 'stats' | 'audit' | 'workers';
  onTabChange: (tab: 'schedule' | 'stats' | 'audit' | 'workers') => void;
  conflictCount: number;
  onOpenAutoFill: () => void;
  onPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  workNormHours,
  totalConfiguredShifts,
  totalRequiredShifts,
  activeTab,
  onTabChange,
  conflictCount,
  onOpenAutoFill,
  onPrint,
}) => {
  const monthName = POLISH_MONTHS[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  const shiftsMatch = totalConfiguredShifts === totalRequiredShifts;

  return (
    <header className="border-b border-slate-200 bg-white shadow-xs">
      {/* Top Identity & Action Bar */}
      <div className="mx-auto flex max-w-(--breakpoint-2xl) items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 items-center justify-center rounded-lg bg-red-600 px-3.5 shadow-xs">
            <span className="font-sans text-xl font-black tracking-wider text-white">ORLEN</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                Grafik Pracy 24/7
              </h1>
              <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 sm:inline-block">
                Stacja Paliw
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-red-600 uppercase tracking-wide">
                {monthName} {year}
              </span>
              <span>·</span>
              <span>Obsada ciągła 4×12h</span>
            </div>
          </div>
        </div>

        {/* Legal & Shift Norm Indicators */}
        <div className="hidden lg:flex items-center gap-4 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
            <span className="text-slate-500">Norma KP: </span>
            <span className="font-mono font-bold text-slate-900">{workNormHours}h</span>
            <span className="text-slate-400"> (art. 130)</span>
          </div>
          <div
            className={`rounded-lg border px-3 py-1.5 transition-colors ${
              shiftsMatch
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <span className="text-slate-500">Suma zmian zespołu: </span>
            <span className="font-mono font-bold">{totalConfiguredShifts}</span>
            <span className="text-slate-500"> / wymagane: </span>
            <span className="font-mono font-bold">{totalRequiredShifts}</span>
            {!shiftsMatch && (
              <span className="ml-1 text-xs font-bold text-amber-600">
                ({totalConfiguredShifts - totalRequiredShifts > 0 ? '+' : ''}
                {totalConfiguredShifts - totalRequiredShifts})
              </span>
            )}
          </div>
        </div>

        {/* Quick Primary Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAutoFill}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-xs hover:bg-amber-400 active:bg-amber-600 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Auto-wypełnienie</span>
            <span className="sm:hidden">Auto</span>
          </button>

          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            title="Drukuj grafik (A4 poziomo)"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Drukuj</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="mx-auto flex max-w-(--breakpoint-2xl) items-center gap-1 px-4 sm:px-6">
        <button
          onClick={() => onTabChange('schedule')}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'schedule'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Grafik Główny</span>
        </button>

        <button
          onClick={() => onTabChange('workers')}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'workers'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Zespół i Normy</span>
        </button>

        <button
          onClick={() => onTabChange('stats')}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'stats'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Statystyki i Godziny</span>
        </button>

        <button
          onClick={() => onTabChange('audit')}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'audit'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Audyt Zgodności</span>
          {conflictCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {conflictCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
