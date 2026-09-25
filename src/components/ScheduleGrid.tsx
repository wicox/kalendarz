import React from 'react';
import { Clock, CheckCircle2, Palmtree, Coffee } from 'lucide-react';
import { Worker, PrintSettings } from '../types/schedule';
import {
  formatDateKey,
  getDaysInMonth,
  getPolishHolidays,
  POLISH_DAYS_SHORT,
  calculateWorkNorm,
} from '../utils/calendar';
import {
  parseShift,
  isShiftEntry,
  getVacationBalance,
} from '../utils/shiftParser';

interface ScheduleGridProps {
  currentDate: Date;
  workers: Worker[];
  scheduleData: Record<string, string>;
  tradingSundays: Record<string, boolean>;
  printSettings?: PrintSettings;
  onSaveShift: (workerName: string, dateStr: string, value: string) => void;
  onOpenTimeModal: (workerName: string, dateStr: string) => void;
  onToggleTradingSunday: (dateStr: string) => void;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  currentDate,
  workers,
  scheduleData,
  tradingSundays,
  printSettings,
  onSaveShift,
  onOpenTimeModal,
  onToggleTradingSunday,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const holidays = getPolishHolidays(year);
  const norm = calculateWorkNorm(year, month);

  // Zliczanie łącznych zmian i godzin
  let grandTotalShifts = 0;
  let grandTotalHours = 0;
  let podjazdTotalShifts = 0;
  let podjazdTotalHours = 0;

  // Pracownicy stacji (bez podjazdu)
  const stationWorkers = workers.filter((w) => !w.isPodjazd);

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
            <th className="sticky left-0 z-30 w-44 min-w-44 bg-slate-800 px-2 py-2 text-left font-sans text-xs font-bold tracking-tight">
              Imię i Nazwisko
            </th>
            <th
              className={`sticky left-44 z-30 w-16 min-w-16 bg-slate-700 px-1 py-2 font-sans text-[11px] font-semibold text-slate-200 ${
                printSettings?.showVacation !== false ? '' : 'print:hidden'
              }`}
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
            <th
              className={`w-10 min-w-10 bg-slate-700 px-1 py-1 font-sans text-[10px] font-semibold text-slate-200 ${
                printSettings?.showDayHours !== false ? '' : 'print:hidden'
              }`}
            >
              D (h)
            </th>
            <th
              className={`w-10 min-w-10 bg-slate-700 px-1 py-1 font-sans text-[10px] font-semibold text-slate-200 ${
                printSettings?.showNightHours !== false ? '' : 'print:hidden'
              }`}
            >
              N (h)
            </th>
            <th
              className={`w-14 min-w-14 bg-slate-700 px-1 py-1 font-sans text-[10px] font-bold text-slate-100 ${
                printSettings?.showTotalHours !== false ? '' : 'print:hidden'
              }`}
            >
              Suma h
            </th>
            <th
              className={`w-11 min-w-11 bg-slate-900 px-1 py-1 font-sans text-[10px] font-bold text-amber-400 ${
                printSettings?.showShiftsCount !== false ? '' : 'print:hidden'
              }`}
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

            const isUoP = worker.contractType === 'uop';
            const fName = worker.firstName !== undefined ? worker.firstName : (worker.name ? worker.name.split(' ')[0] : '');
            const lName = worker.lastName !== undefined ? worker.lastName : (worker.name ? worker.name.split(' ').slice(1).join(' ') : '');

            return (
              <tr
                key={worker.id || worker.name}
                className="border-b border-slate-200 hover:bg-slate-50/80 transition-colors"
              >
                {/* Worker Identity & Contract Tag */}
                <td className="sticky left-0 z-20 border-r border-slate-200 bg-white px-2 py-1.5 text-left font-sans font-medium text-slate-900 shadow-xs">
                  <div className="flex flex-col">
                    {/* Imię i Nazwisko (z możliwością ukrycia nazwiska w opcjach wydruku) */}
                    <div
                      className="truncate text-xs font-bold text-slate-800"
                      title={`${worker.name} (Dośw: ${worker.experience}/10, Noc: ${worker.nightPref}%)`}
                    >
                      <span>{fName}</span>
                      <span className={printSettings?.showLastName !== false ? '' : 'print:hidden'}>
                        {lName ? ` ${lName}` : ''}
                      </span>
                    </div>

                    {/* Doświadczenie i nocki (z możliwością ukrycia w wydruku) */}
                    <div
                      className={`flex items-center gap-1.5 text-[10px] text-slate-400 ${
                        printSettings?.showExperience !== false ? '' : 'print:hidden'
                      }`}
                    >
                      <span>dośw. {worker.experience}</span>
                      <span>·</span>
                      <span>noc {worker.nightPref}%</span>
                    </div>

                    {/* Skrót typu umowy pod spodem pod dośw. i nocki */}
                    <div
                      className={`mt-0.5 flex items-center gap-1 ${
                        printSettings?.showContractType !== false ? '' : 'print:hidden'
                      }`}
                    >
                      {worker.isPodjazd ? (
                        <span className="rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-800">
                          Podjazd
                        </span>
                      ) : (
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                            isUoP
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isUoP ? 'UoP' : 'UZ'}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Vacation Balance */}
                <td
                  className={`sticky left-44 z-20 border-r border-slate-200 bg-slate-50 px-1 py-1 text-center font-sans text-[10px] font-bold text-slate-700 ${
                    printSettings?.showVacation !== false ? '' : 'print:hidden'
                  }`}
                  title={`Pozostało łącznie: ${vacBal.total} dni urlopu (${vacBal.oldVac} zaległego + ${vacBal.newVac} bieżącego)`}
                >
                  <div className="text-slate-800">{vacBal.total}d</div>
                  <div className="text-[8px] font-normal text-slate-400">
                    ({vacBal.oldVac}/{vacBal.newVac})
                  </div>
                </td>

                {/* Day Cells (Wydłużone komórki w pionie - min-h-[58px] - bez obcinania godzin!) */}
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

                  const partners = getPartnersOnShift(dateStr, worker.name, parsed.code);

                  return (
                    <td
                      key={day}
                      onClick={() => onOpenTimeModal(worker.name, dateStr)}
                      className={`shift-cell relative border-r border-b border-slate-200 p-0 text-center transition-colors group cursor-pointer hover:ring-2 hover:ring-blue-400 hover:z-10 ${cellBg}`}
                      title={
                        parsed.code
                          ? `${worker.name} - ${day}.${month + 1}: ${parsed.code} (${parsed.hours}h)${
                              partners.length > 0 ? ` | Partner: ${partners.join(', ')}` : ''
                            }`
                          : 'Kliknij, aby wybrać zmianę'
                      }
                    >
                      <div className="relative flex h-[58px] min-h-[58px] w-full flex-col items-center justify-center p-0.5 select-none">
                        {/* URLOP - Ikonka palmy */}
                        {parsed.code === 'U' && (
                          <div className="flex h-full w-full flex-col items-center justify-center rounded bg-emerald-500 text-white shadow-2xs">
                            <Palmtree className="h-4 w-4 text-emerald-100" />
                            <span className="text-[10px] font-black tracking-wider leading-none mt-0.5">U</span>
                            <span className="text-[7.5px] font-bold text-emerald-100 opacity-90 leading-none">URLOP</span>
                          </div>
                        )}

                        {/* DZIEŃ WOLNY - Ikonka filiżanki */}
                        {parsed.code === '*' && (
                          <div className="flex h-full w-full flex-col items-center justify-center rounded border border-amber-300 bg-amber-100 text-amber-950 shadow-2xs">
                            <Coffee className="h-4 w-4 text-amber-800" />
                            <span className="text-[9px] font-black text-amber-900 leading-none mt-0.5">*</span>
                            <span className="text-[7.5px] font-bold text-amber-800 opacity-90 leading-none">WOLNE</span>
                          </div>
                        )}

                        {/* ZMIANA DZIENNA (D) */}
                        {parsed.code === 'D' && (
                          <div className="flex h-full w-full flex-col items-center justify-center rounded border border-blue-200 bg-blue-50 text-blue-900 shadow-2xs py-0.5">
                            <span className="text-xs font-black text-blue-800 leading-none">D</span>
                            <span className="font-mono text-[9px] font-bold text-blue-600 leading-tight mt-0.5">
                              {parsed.startTime || '06:00'}
                            </span>
                            <span className="font-mono text-[9px] font-bold text-blue-600 leading-tight">
                              {parsed.endTime || '18:00'}
                            </span>
                          </div>
                        )}

                        {/* ZMIANA NOCNA (N) */}
                        {parsed.code === 'N' && (
                          <div className="flex h-full w-full flex-col items-center justify-center rounded border border-slate-900 bg-slate-800 text-amber-300 shadow-2xs py-0.5">
                            <span className="text-xs font-black text-amber-400 leading-none">N</span>
                            <span className="font-mono text-[9px] font-bold text-amber-200/90 leading-tight mt-0.5">
                              {parsed.startTime || '18:00'}
                            </span>
                            <span className="font-mono text-[9px] font-bold text-amber-200/90 leading-tight">
                              {parsed.endTime || '06:00'}
                            </span>
                          </div>
                        )}

                        {/* PODJAZD (P) */}
                        {parsed.code === 'P' && (
                          <div className="flex h-full w-full flex-col items-center justify-center rounded border border-emerald-200 bg-emerald-50 text-emerald-900 shadow-2xs py-0.5">
                            <span className="text-xs font-black text-emerald-800 leading-none">P</span>
                            <span className="font-mono text-[9px] font-bold text-emerald-600 leading-tight mt-0.5">
                              {parsed.startTime || '08:00'}
                            </span>
                            <span className="font-mono text-[9px] font-bold text-emerald-600 leading-tight">
                              {parsed.endTime || '16:00'}
                            </span>
                          </div>
                        )}

                        {/* INNA ZMIANA NIESTANDARDOWA */}
                        {parsed.code && !['U', '*', 'D', 'N', 'P'].includes(parsed.code) && (
                          <div className="flex h-full w-full flex-col items-center justify-center rounded border border-slate-300 bg-slate-100 text-slate-800 shadow-2xs py-0.5">
                            <span className="text-xs font-black leading-none">{parsed.code}</span>
                            {parsed.startTime && (
                              <span className="font-mono text-[9px] font-bold text-slate-600 leading-tight mt-0.5">
                                {parsed.startTime}
                              </span>
                            )}
                            {parsed.endTime && (
                              <span className="font-mono text-[9px] font-bold text-slate-600 leading-tight">
                                {parsed.endTime}
                              </span>
                            )}
                          </div>
                        )}

                        {/* PUSTA KOMÓRKA */}
                        {!parsed.code && (
                          <div className="flex h-full w-full items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">
                            <span className="opacity-0 group-hover:opacity-100 text-xs font-bold">+</span>
                          </div>
                        )}

                        {/* Quick Trigger Button */}
                        <div className="no-print absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded bg-white/90 text-slate-400 opacity-0 shadow-2xs group-hover:opacity-100 transition-opacity">
                          <Clock className="h-2.5 w-2.5" />
                        </div>
                      </div>
                    </td>
                  );
                })}

                {/* Calculate Shift Counters and Hours coloring */}
                {(() => {
                  const totalWorkerHours = dayHours + nightHours;

                  if (worker.isPodjazd) {
                    podjazdTotalShifts += shiftCount;
                    podjazdTotalHours += totalWorkerHours;
                  } else {
                    grandTotalShifts += shiftCount;
                    grandTotalHours += totalWorkerHours;
                  }

                  const targetMatch = worker.maxShifts === shiftCount;

                  // REGUŁY KOLOROWANIA DLA SUMY GODZIN:
                  // Jeśli Umowa o pracę (UoP):
                  // - dokładnie norma miesięczna (np. 176h) -> ZIELONY
                  // - pełne zaokrąglone zmiany (np. 15 x 12h = 180h) -> NIEBIESKI
                  // - mniej godzin niż norma miesięczna (< 176h) -> CZERWONY PASTELOWY
                  // - inne wartości powyżej normy -> niebieski/indygo
                  // Jeśli Umowa zlecenie (UZ) lub Podjazd: brak kolorów normy (neutralny)
                  let sumHoursBgClass = 'bg-slate-100 text-slate-900';
                  let sumHoursTitle = `Suma godzin: ${totalWorkerHours}h`;

                  if (isUoP && !worker.isPodjazd) {
                    const roundedTargetHours = norm.requiredShiftsCeil * 12; // np. 15 * 12 = 180h
                    const exactNormHours = norm.hours; // np. 176h

                    if (totalWorkerHours === exactNormHours) {
                      // Dokładnie norma miesięczna (np. po odjęciu 4h)
                      sumHoursBgClass = 'bg-emerald-500 text-white font-black shadow-xs';
                      sumHoursTitle = `Dokładna norma miesięczna: ${totalWorkerHours}h / ${exactNormHours}h (IDEALNIE)`;
                    } else if (totalWorkerHours === roundedTargetHours) {
                      // Wyliczone 15 zmian = 180h (z nadgodzinami z zaokrąglenia)
                      sumHoursBgClass = 'bg-blue-600 text-white font-black shadow-xs';
                      sumHoursTitle = `Wyliczone pełne zmiany: ${totalWorkerHours}h (${norm.requiredShiftsCeil} zmian po 12h, w tym +${norm.overtimeHours}h nadgodzin)`;
                    } else if (totalWorkerHours < exactNormHours) {
                      // Za mało godzin
                      sumHoursBgClass = 'bg-red-200 text-red-950 font-bold';
                      sumHoursTitle = `Za mało godzin: ${totalWorkerHours}h (brakuje ${exactNormHours - totalWorkerHours}h do normy ${exactNormHours}h)`;
                    } else {
                      // Inne nadgodziny
                      sumHoursBgClass = 'bg-blue-100 text-blue-950 font-bold';
                      sumHoursTitle = `Nadgodziny: ${totalWorkerHours}h (+${totalWorkerHours - exactNormHours}h ponad normę)`;
                    }
                  }

                  return (
                    <>
                      <td
                        className={`border-r border-slate-200 bg-slate-50/70 px-1 py-1 font-mono text-[11px] font-semibold text-slate-700 ${
                          printSettings?.showDayHours !== false ? '' : 'print:hidden'
                        }`}
                      >
                        {dayHours}h
                      </td>
                      <td
                        className={`border-r border-slate-200 bg-slate-50/70 px-1 py-1 font-mono text-[11px] font-semibold text-slate-700 ${
                          printSettings?.showNightHours !== false ? '' : 'print:hidden'
                        }`}
                      >
                        {nightHours}h
                      </td>
                      <td
                        className={`border-r border-slate-200 px-1 py-1 font-mono text-[11px] transition-colors ${sumHoursBgClass} ${
                          printSettings?.showTotalHours !== false ? '' : 'print:hidden'
                        }`}
                        title={sumHoursTitle}
                      >
                        {totalWorkerHours}h
                      </td>
                      <td
                        className={`border-r border-slate-200 px-1 py-1 font-mono text-[11px] font-bold ${
                          targetMatch
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-900'
                        } ${printSettings?.showShiftsCount !== false ? '' : 'print:hidden'}`}
                        title={`Wykonano: ${shiftCount} / Cel w ustawieniach: ${worker.maxShifts}`}
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

        {/* Footer Status Row (Daily station coverage - STRICTLY EXCLUDES PODJAZD) */}
        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-100 font-sans text-xs font-bold text-slate-900">
            <td className="sticky left-0 z-20 border-r border-slate-200 bg-slate-200 px-2 py-2 text-left font-bold text-slate-800">
              Suma stacji (D / N)
              <span className="block text-[9px] font-normal text-slate-500">
                (bez pracowników podjazdowych)
              </span>
            </td>
            <td
              className={`sticky left-44 z-20 border-r border-slate-200 bg-slate-200 ${
                printSettings?.showVacation !== false ? '' : 'print:hidden'
              }`}
            ></td>

            {/* Daily Total Hours & Status - ONLY STATION WORKERS (NOT PODJAZD) */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDateKey(year, month, day);

              let dayHoursTotal = 0;
              let nightHoursTotal = 0;

              // TYLKO PRACOWNICY GŁÓWNI STACJI (BEZ PODJAZDU)
              stationWorkers.forEach((w) => {
                const val = scheduleData[`${w.name}_${dateStr}`] || '';
                const p = parseShift(val);
                if (p.code.startsWith('D')) dayHoursTotal += p.hours;
                if (p.code.startsWith('N')) nightHoursTotal += p.hours;
              });

              // Wymagane: dokładnie 24h D i 24h N (po 2 pracowników po 12h = 48h/dobę)
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
                  title={`Dzień ${day} (Kasa/Stacja): ${dayHoursTotal}h D (wym. 24h), ${nightHoursTotal}h N (wym. 24h)`}
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

            {/* Sub-totals for Day / Night */}
            <td
              className={`border-r border-slate-200 bg-slate-200 px-1 py-2 font-mono text-[10px] font-bold text-slate-700 ${
                printSettings?.showDayHours !== false ? '' : 'print:hidden'
              }`}
            >
              {Array.from({ length: daysInMonth }).reduce<number>((acc, _, i) => {
                const dateStr = formatDateKey(year, month, i + 1);
                return (
                  acc +
                  stationWorkers.reduce<number>((wAcc, w) => {
                    const p = parseShift(scheduleData[`${w.name}_${dateStr}`] || '');
                    return wAcc + (p.code.startsWith('D') ? p.hours : 0);
                  }, 0)
                );
              }, 0)}
              h
            </td>
            <td
              className={`border-r border-slate-200 bg-slate-200 px-1 py-2 font-mono text-[10px] font-bold text-slate-700 ${
                printSettings?.showNightHours !== false ? '' : 'print:hidden'
              }`}
            >
              {Array.from({ length: daysInMonth }).reduce<number>((acc, _, i) => {
                const dateStr = formatDateKey(year, month, i + 1);
                return (
                  acc +
                  stationWorkers.reduce<number>((wAcc, w) => {
                    const p = parseShift(scheduleData[`${w.name}_${dateStr}`] || '');
                    return wAcc + (p.code.startsWith('N') ? p.hours : 0);
                  }, 0)
                );
              }, 0)}
              h
            </td>

            {/* TOTAL HOURS COLUMN: ZAŚWIECA SIĘ NA ZIELONO GDY DOKŁADNIE 1440h (lub wymóg danego miesiąca) */}
            <td
              className={`border-r border-slate-300 px-1 py-2 font-mono text-xs font-black transition-colors ${
                grandTotalHours === norm.totalStationHours
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                  : 'bg-amber-100 text-amber-950 font-bold'
              } ${printSettings?.showTotalHours !== false ? '' : 'print:hidden'}`}
              title={`Suma godzin obsady stacji: ${grandTotalHours}h / wymagane: ${norm.totalStationHours}h (${daysInMonth} dni x 48h)`}
            >
              {grandTotalHours}h
              {grandTotalHours === norm.totalStationHours && (
                <span className="block text-[8px] font-medium opacity-90">IDEALNIE</span>
              )}
            </td>

            {/* TOTAL SHIFTS COLUMN */}
            <td
              className={`bg-slate-300 px-1 py-2 font-mono text-xs font-black text-slate-900 ${
                printSettings?.showShiftsCount !== false ? '' : 'print:hidden'
              }`}
              title={`Główne zmiany stacji: ${grandTotalShifts} / wymagane: ${norm.totalStationShifts} | Podjazd: ${podjazdTotalShifts} zm.`}
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:px-6 no-print">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-slate-800">Oznaczenia:</span>

          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded bg-emerald-500 px-1.5 py-0.5 font-bold text-white text-[10px]">
              <Palmtree className="h-3 w-3" /> U
            </span>
            <span>Urlop wypoczynkowy</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 font-bold text-amber-950 text-[10px]">
              <Coffee className="h-3 w-3 text-amber-800" /> *
            </span>
            <span>Dzień wolny</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded bg-blue-600 px-1.5 py-0.5 font-mono font-bold text-white text-[10px]">
              180h
            </span>
            <span>Pełne zmiany ({norm.requiredShiftsCeil} zm.)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded bg-emerald-500 px-1.5 py-0.5 font-mono font-bold text-white text-[10px]">
              {norm.hours}h
            </span>
            <span>Dokładna norma Kodeksu Pracy</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded bg-red-200 px-1.5 py-0.5 font-mono font-bold text-red-950 text-[10px]">
              &lt; {norm.hours}h
            </span>
            <span>Niedobór godzin do normy</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-600" />
            <span>Święto</span>
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
