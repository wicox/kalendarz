import React from 'react';
import { Clock, Info, Check, AlertTriangle } from 'lucide-react';
import { Worker } from '../types/schedule';
import {
  formatDateKey,
  getDaysInMonth,
  getPolishHolidays,
  POLISH_DAYS_SHORT,
} from '../utils/calendar';
import {
  parseShift,
  calculateExactHours,
  isShiftEntry,
  getVacationBalance,
} from '../utils/shiftParser';

interface ScheduleGridProps {
  currentDate: Date;
  workers: Worker[];
  scheduleData: Record<string, string>;
  tradingSundays: Record<string, boolean>;
  onSaveShift: (workerName: string, dateStr: string, value: string) => void;
  onOpenTimeModal: (workerName: string, dateStr: string) => void;
  onToggleTradingSunday: (dateStr: string) => void;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  currentDate,
  workers,
  scheduleData,
  tradingSundays,
  onSaveShift,
  onOpenTimeModal,
  onToggleTradingSunday,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const holidays = getPolishHolidays(year);

  // Zliczanie łącznych zmian
  let grandTotalShifts = 0;
  let podjazdTotalShifts = 0;

  // Helper do znajdowania partnera na tej samej zmianie w danym dniu
  const getPartnersOnShift = (dateStr: string, currentWorker: string, shiftCode: string) => {
    if (!shiftCode || shiftCode === 'U' || shiftCode === '*') return [];
    return workers
      .filter((w) => w.name !== currentWorker)
      .filter((w) => {
        const val = (scheduleData[`${w.name}_${dateStr}`] || '').trim().toUpperCase();
        return val.startsWith(shiftCode[0]);
      })
      .map((w) => w.name);
  };

  return (
    <div className="w-full overflow-x-auto bg-white shadow-xs">
      <table className="w-full border-collapse text-center text-xs tabular-nums font-mono select-none">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-slate-300 bg-slate-800 text-white">
            <th className="sticky left-0 z-30 w-36 min-w-36 bg-slate-800 px-2 py-2 text-left font-sans text-xs font-bold tracking-tight">
              Pracownik
            </th>
            <th
              className="sticky left-36 z-30 w-16 min-w-16 bg-slate-700 px-1 py-2 font-sans text-[11px] font-semibold text-slate-200"
              title="Dostępny urlop: Dni pozostałe (Zaległy / Bieżący)"
            >
              Urlop
            </th>

            {/* Day Columns */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const d = new Date(year, month, day);
              const dayOfWeek = d.getDay();
              const dateStr = formatDateKey(year, month, day);

              const isSunday = dayOfWeek === 0;
              const isSaturday = dayOfWeek === 6;
              const holidayName = holidays[dateStr];
              const isHoliday = Boolean(holidayName);
              const isTradingSunday = isSunday && Boolean(tradingSundays[dateStr]);

              let headerBg = 'bg-slate-800 text-white';
              if (isHoliday) {
                headerBg = 'bg-red-700 text-white font-bold';
              } else if (isTradingSunday) {
                headerBg = 'bg-purple-800 text-white font-bold';
              } else if (isSunday) {
                headerBg = 'bg-amber-600 text-white';
              } else if (isSaturday) {
                headerBg = 'bg-amber-700 text-white';
              }

              return (
                <th
                  key={day}
                  className={`w-9 min-w-9 border-r border-slate-700/50 px-0.5 py-1 text-center font-sans ${headerBg}`}
                  title={holidayName ? `Święto: ${holidayName}` : undefined}
                >
                  <div className="text-[11px] font-bold leading-tight">{day}</div>
                  <div className="text-[9px] font-medium opacity-90">
                    {POLISH_DAYS_SHORT[dayOfWeek]}
                  </div>

                  {isSunday && (
                    <div className="mt-0.5 flex justify-center no-print">
                      <input
                        type="checkbox"
                        checked={isTradingSunday}
                        onChange={() => onToggleTradingSunday(dateStr)}
                        className="h-3 w-3 cursor-pointer rounded border-slate-300 text-purple-600 accent-purple-600"
                        title={
                          isTradingSunday
                            ? 'Niedziela handlowa (kliknij aby odznaczyć)'
                            : 'Zaznacz jeśli jest to niedziela handlowa'
                        }
                      />
                    </div>
                  )}
                </th>
              );
            })}

            {/* Summary Columns */}
            <th className="w-10 min-w-10 bg-slate-700 px-1 py-1 font-sans text-[10px] font-semibold text-slate-200">
              D (h)
            </th>
            <th className="w-10 min-w-10 bg-slate-700 px-1 py-1 font-sans text-[10px] font-semibold text-slate-200">
              N (h)
            </th>
            <th className="w-12 min-w-12 bg-slate-700 px-1 py-1 font-sans text-[10px] font-semibold text-slate-200">
              Suma
            </th>
            <th
              className="w-10 min-w-10 bg-slate-900 px-1 py-1 font-sans text-[10px] font-bold text-amber-400"
              title="Liczba wykonanych zmian w miesiącu"
            >
              Zmiany
            </th>
          </tr>
        </thead>

        {/* Table Body (Workers rows) */}
        <tbody>
          {workers.map((worker) => {
            const vacBal = getVacationBalance(worker, scheduleData, year);
            let dayHours = 0;
            let nightHours = 0;
            let shiftCount = 0;

            return (
              <tr
                key={worker.name}
                className="border-b border-slate-200 hover:bg-slate-50/80 transition-colors"
              >
                {/* Worker Identity */}
                <td className="sticky left-0 z-20 border-r border-slate-200 bg-white px-2 py-1 text-left font-sans font-medium text-slate-900 shadow-xs">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="truncate text-xs font-bold text-slate-800"
                      title={`${worker.name} (Dośw: ${worker.experience}/10, Noc: ${worker.nightPref}%)`}
                    >
                      {worker.name}
                    </span>
                    {worker.isPodjazd && (
                      <span className="shrink-0 rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-800">
                        Podjazd
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span>dośw. {worker.experience}</span>
                    <span>·</span>
                    <span>noc {worker.nightPref}%</span>
                  </div>
                </td>

                {/* Vacation Balance */}
                <td
                  className="sticky left-36 z-20 border-r border-slate-200 bg-slate-50 px-1 py-1 text-center font-sans text-[10px] font-bold text-slate-700"
                  title={`Pozostało łącznie: ${vacBal.total} dni urlopu (${vacBal.oldVac} zaległego + ${vacBal.newVac} bieżącego)`}
                >
                  <div className="text-slate-800">{vacBal.total}d</div>
                  <div className="text-[8px] font-normal text-slate-400">
                    ({vacBal.oldVac}/{vacBal.newVac})
                  </div>
                </td>

                {/* Day Cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = formatDateKey(year, month, day);
                  const d = new Date(year, month, day);
                  const dayOfWeek = d.getDay();
                  const isSunday = dayOfWeek === 0;
                  const isSaturday = dayOfWeek === 6;
                  const isHoliday = Boolean(holidays[dateStr]);
                  const isTradingSunday = isSunday && Boolean(tradingSundays[dateStr]);

                  const val = scheduleData[`${worker.name}_${dateStr}`] || '';
                  const parsed = parseShift(val);

                  if (isShiftEntry(val)) {
                    shiftCount++;
                    if (parsed.code.startsWith('D')) dayHours += parsed.hours;
                    else if (parsed.code.startsWith('N')) nightHours += parsed.hours;
                  }

                  // Tło komórki wg dnia
                  let cellBg = 'bg-white';
                  if (isHoliday) {
                    cellBg = 'bg-red-50/60';
                  } else if (isTradingSunday) {
                    cellBg = 'bg-purple-50/70';
                  } else if (isSunday || isSaturday) {
                    cellBg = 'bg-amber-50/40';
                  }

                  // Styl odznaki zmiany
                  let badgeStyle = 'text-slate-700 font-bold';
                  let containerBg = '';
                  if (parsed.code === 'D') {
                    containerBg = 'bg-blue-50 text-blue-900 border border-blue-200';
                  } else if (parsed.code === 'N') {
                    containerBg = 'bg-slate-800 text-amber-300 border border-slate-900';
                  } else if (parsed.code === 'P') {
                    containerBg = 'bg-emerald-50 text-emerald-900 border border-emerald-200';
                  } else if (parsed.code === 'U') {
                    containerBg = 'bg-emerald-500 text-white font-black';
                  } else if (parsed.code === '*') {
                    containerBg = 'bg-amber-100 text-amber-900 border border-amber-300';
                  }

                  const partners = getPartnersOnShift(dateStr, worker.name, parsed.code);

                  return (
                    <td
                      key={day}
                      className={`relative border-r border-b border-slate-200 p-0 text-center transition-colors group ${cellBg}`}
                      title={
                        parsed.code
                          ? `${worker.name} - ${day}.${month + 1}: ${parsed.code} (${parsed.hours}h)${
                              partners.length > 0 ? ` | Partner: ${partners.join(', ')}` : ''
                            }`
                          : undefined
                      }
                    >
                      <div className="relative flex h-9.5 w-full items-center justify-center p-0.5">
                        <textarea
                          rows={2}
                          value={val}
                          onChange={(e) => onSaveShift(worker.name, dateStr, e.target.value)}
                          className={`h-full w-full resize-none rounded border-none bg-transparent p-0 text-center font-mono text-[10px] leading-tight focus:bg-white focus:outline-2 focus:outline-blue-500 ${badgeStyle} ${
                            containerBg ? `p-0.5 shadow-2xs ${containerBg}` : ''
                          }`}
                          spellCheck={false}
                        />

                        {/* Quick Clock Trigger Button */}
                        <button
                          type="button"
                          onClick={() => onOpenTimeModal(worker.name, dateStr)}
                          className="no-print absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded bg-white/90 text-slate-400 opacity-0 shadow-2xs hover:text-blue-600 group-hover:opacity-100 transition-opacity"
                          title="Zmień status / godziny zmiany"
                        >
                          <Clock className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </td>
                  );
                })}

                {/* Calculate Shift Counters */}
                {(() => {
                  if (worker.isPodjazd) {
                    podjazdTotalShifts += shiftCount;
                  } else {
                    grandTotalShifts += shiftCount;
                  }
                  const targetMatch = worker.maxShifts === shiftCount;

                  return (
                    <>
                      <td className="border-r border-slate-200 bg-slate-50/70 px-1 py-1 font-mono text-[11px] font-semibold text-slate-700">
                        {dayHours}h
                      </td>
                      <td className="border-r border-slate-200 bg-slate-50/70 px-1 py-1 font-mono text-[11px] font-semibold text-slate-700">
                        {nightHours}h
                      </td>
                      <td className="border-r border-slate-200 bg-slate-100 px-1 py-1 font-mono text-[11px] font-bold text-slate-900">
                        {dayHours + nightHours}h
                      </td>
                      <td
                        className={`border-r border-slate-200 px-1 py-1 font-mono text-[11px] font-bold ${
                          targetMatch
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-900'
                        }`}
                        title={`Wykonano: ${shiftCount} / Cel: ${worker.maxShifts}`}
                      >
                        {shiftCount}
                        {worker.maxShifts !== undefined && (
                          <span className="block text-[8px] font-normal text-slate-400">
                            /{worker.maxShifts}
                          </span>
                        )}
                      </td>
                    </>
                  );
                })()}
              </tr>
            );
          })}
        </tbody>

        {/* Footer Status Row (Daily station coverage) */}
        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-100 font-sans text-xs font-bold text-slate-900">
            <td className="sticky left-0 z-20 border-r border-slate-200 bg-slate-200 px-2 py-2 text-left font-bold text-slate-800">
              Suma stacji (D / N)
            </td>
            <td className="sticky left-36 z-20 border-r border-slate-200 bg-slate-200"></td>

            {/* Daily Total Hours & Status */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDateKey(year, month, day);

              let dayHoursTotal = 0;
              let nightHoursTotal = 0;

              workers.forEach((w) => {
                const val = scheduleData[`${w.name}_${dateStr}`] || '';
                const p = parseShift(val);
                if (p.code.startsWith('D')) dayHoursTotal += p.hours;
                if (p.code.startsWith('N')) nightHoursTotal += p.hours;
              });

              // Wymagane: dokładnie 24h D i 24h N (po 2 pracowników po 12h)
              const isDayComplete = dayHoursTotal === 24;
              const isNightComplete = nightHoursTotal === 24;
              const isComplete = isDayComplete && isNightComplete;

              const statusColor = isComplete
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-red-100 text-red-900 border-red-300 font-black';

              return (
                <td
                  key={day}
                  className={`border-r border-slate-300 px-0.5 py-1 text-center font-mono text-[9px] leading-tight ${statusColor}`}
                  title={`Dzień ${day}: ${dayHoursTotal}h D (wym. 24h), ${nightHoursTotal}h N (wym. 24h)`}
                >
                  <div className={!isDayComplete ? 'text-red-700 font-extrabold' : ''}>
                    {dayHoursTotal}h D
                  </div>
                  <div className={!isNightComplete ? 'text-red-700 font-extrabold' : ''}>
                    {nightHoursTotal}h N
                  </div>
                </td>
              );
            })}

            <td colSpan={3} className="border-r border-slate-200 bg-slate-200 px-2 py-2 text-right">
              Łącznie zmian:
            </td>
            <td
              className="bg-slate-300 px-1 py-2 font-mono text-xs font-black text-slate-900"
              title={`Główne zmiany stacji: ${grandTotalShifts} | Zmiany podjazdowe: ${podjazdTotalShifts}`}
            >
              {grandTotalShifts}
              {podjazdTotalShifts > 0 && (
                <span className="block text-[8px] font-normal text-slate-500">
                  +{podjazdTotalShifts} P
                </span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Legend & Help Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-slate-800">Oznaczenia:</span>
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono font-bold text-blue-900 border border-blue-200">
              D
            </span>
            <span>Zmiana dzienna (06:00 - 18:00, 12h)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono font-bold text-amber-300">
              N
            </span>
            <span>Zmiana nocna (18:00 - 06:00, 12h)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono font-bold text-emerald-900 border border-emerald-200">
              P
            </span>
            <span>Podjazd (08:00 - 16:00, 8h)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-mono font-bold text-white">
              U
            </span>
            <span>Urlop wypoczynkowy</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono font-bold text-amber-900 border border-amber-300">
              *
            </span>
            <span>Dzień wolny</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-600" />
            <span>Święto państwowe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-purple-700" />
            <span>Niedziela handlowa</span>
          </div>
        </div>
      </div>
    </div>
  );
};
