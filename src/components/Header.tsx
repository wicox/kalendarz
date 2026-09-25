import React from 'react';
import { Calendar, Users, BarChart3, AlertCircle, Printer, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { POLISH_MONTHS } from '../utils/calendar';

interface HeaderProps {
  currentDate: Date;
  workNormHours: number;
  shiftsRaw: number;
  requiredShiftsCeil: number;
  overtimeHours: number;
  totalStationHours: number;
  totalStationShifts: number;
  totalConfiguredHours: number;
  totalConfiguredShifts: number;
  activeTab: 'schedule' | 'stats' | 'audit' | 'workers';
  onTabChange: (tab: 'schedule' | 'stats' | 'audit' | 'workers') => void;
  conflictCount: number;
  onOpenAutoFill: () => void;
  onPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  workNormHours,
  shiftsRaw,
  requiredShiftsCeil,
  overtimeHours,
  totalStationHours,
  totalStationShifts,
  totalConfiguredHours,
  totalConfiguredShifts,
  activeTab,
  onTabChange,
  conflictCount,
  onOpenAutoFill,
  onPrint,
}) => {
  const monthName = POLISH_MONTHS[currentDate.getMonth()];
  const year = currentDate.getFullYear();
  const hoursMatch = totalConfiguredHours === totalStationHours;
  const hoursDiff = totalConfiguredHours - totalStationHours;

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
              <span>Obsada ciągła 4×12h (48h/dobę)</span>
            </div>
          </div>
        </div>

        {/* Legal & Shift Norm Indicators */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          {/* Norma Miesięczna */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5" title="Norma czasu pracy wg art. 130 Kodeksu Pracy">
            <span className="text-slate-500">Norma m-ca: </span>
            <span className="font-mono font-bold text-slate-900">{workNormHours}h</span>
          </div>

          {/* Ilość zmian wynikających z normy */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-blue-950" title={`${workNormHours}h ÷ 12h = ${shiftsRaw} zmian -> zaokrąglenie do ${requiredShiftsCeil} zmian (generuje ${overtimeHours}h nadgodzin)`}>
            <span className="text-blue-700 font-medium">Norma na pracownika: </span>
            <span className="font-mono font-black text-blue-900">{requiredShiftsCeil} zmian</span>
            <span className="text-slate-500 text-[11px] ml-1">
              ({shiftsRaw} zm. {overtimeHours > 0 ? `+${overtimeHours}h nadgodz.` : ''})
            </span>
          </div>

          {/* Łączna ilość godzin stacji */}
          <div
            className={`rounded-lg border px-3 py-1.5 transition-colors ${
              hoursMatch
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                : 'border-amber-300 bg-amber-50 text-amber-950'
            }`}
            title={`Zapotrzebowanie stacji: ${totalStationShifts} zmian (48h/dobę) = ${totalStationHours}h`}
          >
            <span className="text-slate-600">Suma stacji: </span>
            <span className="font-mono font-black">{totalConfiguredHours}h</span>
            <span className="text-slate-500"> / {totalStationHours}h</span>
            {hoursMatch ? (
              <span className="ml-1.5 inline-flex items-center text-emerald-700 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 mr-0.5 inline" /> 100%
              </span>
            ) : (
              <span className="ml-1.5 font-mono font-bold text-amber-800 text-[11px]">
                ({hoursDiff > 0 ? `+${hoursDiff}` : hoursDiff}h)
              </span>
            )}
          </div>
        </div>

        {/* Quick Primary Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAutoFill}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-xs hover:bg-amber-400 active:bg-amber-600 transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Auto-wypełnienie</span>
            <span className="sm:hidden">Auto</span>
          </button>

          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
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
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
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
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
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
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
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
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
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
