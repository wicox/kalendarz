import React from 'react';
import {
  BarChart3,
  Clock,
  Moon,
  Sun,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Worker } from '../types/schedule';
import {
  getDaysInMonth,
  formatDateKey,
  getPolishHolidays,
  calculateWorkNorm,
  POLISH_MONTHS,
} from '../utils/calendar';
import { parseShift, isShiftEntry } from '../utils/shiftParser';

interface StatsPanelProps {
  currentDate: Date;
  workers: Worker[];
  scheduleData: Record<string, string>;
  tradingSundays: Record<string, boolean>;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  currentDate,
  workers,
  scheduleData,
  tradingSundays,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const holidays = getPolishHolidays(year);
  const normInfo = calculateWorkNorm(year, month);

  // Analiza każdego pracownika
  const workerStats = workers.map((w) => {
    let dayHours = 0;
    let nightHours = 0;
    let weekendHours = 0;
    let holidayHours = 0;
    let shiftsCount = 0;
    let saturdaysCount = 0;
    let sundaysCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateKey(year, month, day);
      const val = scheduleData[`${w.name}_${dateStr}`] || '';
      const parsed = parseShift(val);

      if (isShiftEntry(val)) {
        shiftsCount++;
        const dObj = new Date(year, month, day);
        const dow = dObj.getDay();
        const isHoliday = Boolean(holidays[dateStr]);

        if (parsed.code.startsWith('D')) {
          dayHours += parsed.hours;
        } else if (parsed.code.startsWith('N')) {
          nightHours += parsed.hours;
        }

        if (dow === 6) saturdaysCount++;
        if (dow === 0) sundaysCount++;

        if (dow === 0 || dow === 6) {
          weekendHours += parsed.hours;
        }
        if (isHoliday) {
          holidayHours += parsed.hours;
        }
      }
    }

    const totalHours = dayHours + nightHours;
    const isUoP = w.contractType === 'uop';
    const hoursDelta = totalHours - normInfo.hours;
    const nightRatio =
      shiftsCount > 0 ? Math.round((nightHours / (dayHours + nightHours)) * 100) : 0;

    return {
      worker: w,
      isUoP,
      dayHours,
      nightHours,
      totalHours,
      shiftsCount,
      weekendHours,
      holidayHours,
      saturdaysCount,
      sundaysCount,
      hoursDelta,
      nightRatio,
      targetNights: w.nightPref ?? 50,
    };
  });

  // Stacja - godziny główne bez podjazdu
  const mainStats = workerStats.filter((s) => !s.worker.isPodjazd);
  const stationMainHours = mainStats.reduce((acc, s) => acc + s.totalHours, 0);
  const stationMainShifts = mainStats.reduce((acc, s) => acc + s.shiftsCount, 0);

  const podjazdStats = workerStats.filter((s) => s.worker.isPodjazd);
  const podjazdTotalHours = podjazdStats.reduce((acc, s) => acc + s.totalHours, 0);

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) p-4 sm:p-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Clock className="h-4 w-4 text-blue-600" />
            <span>Norma Miesięczna (Kodeks Pracy)</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black text-slate-900">{normInfo.hours}h</span>
            <span className="text-xs text-slate-500">
              ({normInfo.workingDays} dni roboczych)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {normInfo.shiftsRaw} zmian 12h &rarr; zaokrąglenie do <strong>{normInfo.requiredShiftsCeil} zmian</strong> (+{normInfo.overtimeHours}h nadgodzin)
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            <span>Godziny Stacji (Obsada 24/7)</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black text-slate-900">{stationMainHours}h</span>
            <span className="text-xs text-slate-500">/ {normInfo.totalStationHours}h wymagane</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {stationMainShifts} zmian na kasie (bez podjazdu: +{podjazdTotalHours}h)
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Moon className="h-4 w-4 text-indigo-600" />
            <span>Godziny Nocne Stacji</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black text-indigo-900">
              {mainStats.reduce((acc, s) => acc + s.nightHours, 0)}h
            </span>
            <span className="text-xs text-slate-500">
              ({Math.round((mainStats.reduce((acc, s) => acc + s.nightHours, 0) / Math.max(1, stationMainHours)) * 100)}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Zgodnie z art. 151[8] k.p. +20% stawki
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Calendar className="h-4 w-4 text-amber-600" />
            <span>Godziny Weekendowe i Święta</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black text-amber-900">
              {mainStats.reduce((acc, s) => acc + s.weekendHours, 0)}h
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Soboty, niedziele i dni świąteczne
          </div>
        </div>
      </div>

      {/* Detailed Employee Table */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">
            Zestawienie Indywidualne Czasu Pracy - {POLISH_MONTHS[month]} {year}
          </h3>
          <p className="text-xs text-slate-500">
            Szczegółowy bilans godzin, dodatków nocnych, umów i odchyleń od normy kodeksowej
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
              <tr>
                <th className="px-4 py-2.5">Pracownik</th>
                <th className="px-2 py-2.5 text-center">Umowa</th>
                <th className="px-2 py-2.5 text-center">Rola</th>
                <th className="px-3 py-2.5 text-right font-mono">Zmiany</th>
                <th className="px-3 py-2.5 text-right font-mono">D (h)</th>
                <th className="px-3 py-2.5 text-right font-mono">N (h)</th>
                <th className="px-3 py-2.5 text-right font-mono font-black">Suma (h)</th>
                <th className="px-3 py-2.5 text-right font-mono">Bilans normy</th>
                <th className="px-3 py-2.5 text-center">Noc faktyczna / cel</th>
                <th className="px-3 py-2.5 text-center">Weekend (Sob/Nd)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workerStats.map((item) => (
                <tr key={item.worker.name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2 font-bold text-slate-900">{item.worker.name}</td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.isUoP
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.isUoP ? 'Umowa o pracę' : 'Zlecenie (UZ)'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {item.worker.isPodjazd ? (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        Podjazd
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Kasa / Sklep</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{item.shiftsCount}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-600">{item.dayHours}h</td>
                  <td className="px-3 py-2 text-right font-mono text-indigo-700 font-semibold">
                    {item.nightHours}h
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 bg-slate-50">
                    {item.totalHours}h
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {!item.isUoP ? (
                      <span className="text-slate-400">brak normy (UZ)</span>
                    ) : item.totalHours === normInfo.hours ? (
                      <span className="font-bold text-emerald-600">Dokładnie norma (0h)</span>
                    ) : item.totalHours === normInfo.requiredShiftsCeil * 12 ? (
                      <span className="font-bold text-blue-700">+{normInfo.overtimeHours}h (pełne zmiany)</span>
                    ) : item.hoursDelta > 0 ? (
                      <span className="font-bold text-amber-700">+{item.hoursDelta}h</span>
                    ) : (
                      <span className="font-bold text-red-600">{item.hoursDelta}h</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center font-mono">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        Math.abs(item.nightRatio - item.targetNights) <= 15
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {item.nightRatio}% / {item.targetNights}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-slate-600">
                    {item.saturdaysCount} sob / {item.sundaysCount} nd
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
