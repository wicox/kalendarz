import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { ScheduleGrid } from './components/ScheduleGrid';
import { ShiftModal } from './components/ShiftModal';
import { AutoFillModal } from './components/AutoFillModal';
import { WorkerManagerModal } from './components/WorkerManagerModal';
import { BatchAbsenceModal } from './components/BatchAbsenceModal';
import { StatsPanel } from './components/StatsPanel';
import { AuditPanel } from './components/AuditPanel';

import { Worker, AutoFillOptions, AutoFillResult } from './types/schedule';
import {
  calculateWorkNorm,
  getDaysInMonth,
  getDefaultTradingSundays,
  formatDateKey,
  POLISH_MONTHS,
} from './utils/calendar';
import { solveSchedule, calculateBalancedTargets } from './utils/autoFillSolver';
import { auditSchedule } from './utils/audit';
import { exportScheduleToJson, exportScheduleToCsv } from './utils/exportUtils';

const DEFAULT_WORKERS: Worker[] = [
  { id: 'w-1', name: 'Jan Kowalski', oldVacation: 5, newVacation: 26, nightPref: 50, experience: 8, maxShifts: 12, isPodjazd: false },
  { id: 'w-2', name: 'Anna Nowak', oldVacation: 0, newVacation: 26, nightPref: 100, experience: 3, maxShifts: 12, isPodjazd: false },
  { id: 'w-3', name: 'Piotr Wiśniewski', oldVacation: 2, newVacation: 26, nightPref: 20, experience: 9, maxShifts: 12, isPodjazd: false },
  { id: 'w-4', name: 'Maria Wójcik', oldVacation: 0, newVacation: 26, nightPref: 50, experience: 2, maxShifts: 12, isPodjazd: false },
  { id: 'w-5', name: 'Krzysztof Kowalczyk', oldVacation: 10, newVacation: 26, nightPref: 80, experience: 7, maxShifts: 12, isPodjazd: false },
  { id: 'w-6', name: 'Agnieszka Kamińska', oldVacation: 0, newVacation: 26, nightPref: 10, experience: 4, maxShifts: 12, isPodjazd: false },
  { id: 'w-7', name: 'Tomasz Lewandowski', oldVacation: 4, newVacation: 26, nightPref: 50, experience: 6, maxShifts: 12, isPodjazd: false },
  { id: 'w-8', name: 'Ewa Zielińska', oldVacation: 1, newVacation: 26, nightPref: 90, experience: 3, maxShifts: 12, isPodjazd: false },
  { id: 'w-9', name: 'Michał Szymański', oldVacation: 0, newVacation: 26, nightPref: 30, experience: 5, maxShifts: 12, isPodjazd: false },
  { id: 'w-10', name: 'Magdalena Woźniak', oldVacation: 3, newVacation: 26, nightPref: 50, experience: 4, maxShifts: 12, isPodjazd: false },
];

const DEFAULT_OPTIONS: AutoFillOptions = {
  maxConsecutiveDays: 3,
  maxShiftsPerWeek: 3,
  enforceExperiencePairing: true,
  enforceRestPeriod: true,
  enforceNightPref: true,
  balanceWeekends: true,
  evenSpacing: true,
  preserveExisting: true,
  ensureFreeSunday: true,
};

export default function App() {
  // Current view date (Defaults to 2026-09-01)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 8, 1));
  const [activeTab, setActiveTab] = useState<'schedule' | 'stats' | 'audit' | 'workers'>('schedule');

  // Core Workers State
  const [workers, setWorkers] = useState<Worker[]>(() => {
    try {
      const saved = localStorage.getItem('workers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((w, idx) => ({
            id: w.id || `w-${idx + 1}`,
            name: typeof w === 'string' ? w : w.name,
            oldVacation: Number(w.oldVacation) || 0,
            newVacation: w.newVacation !== undefined ? Number(w.newVacation) : 26,
            nightPref: w.nightPref !== undefined ? Number(w.nightPref) : 50,
            experience: w.experience !== undefined ? Number(w.experience) : 5,
            maxShifts: w.maxShifts !== undefined ? Number(w.maxShifts) : 12,
            isPodjazd: Boolean(w.isPodjazd),
          }));
        }
      }
    } catch (e) {
      console.error('Error loading workers from localStorage', e);
    }
    return DEFAULT_WORKERS;
  });

  // Schedule Entries: Record<workerName_YYYY-MM-DD, rawShiftString>
  const [scheduleData, setScheduleData] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('scheduleData');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Trading Sundays: Record<YYYY-MM-DD, boolean>
  const [tradingSundays, setTradingSundays] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('tradingSundays');
      if (saved) return JSON.parse(saved);
    } catch {}
    return getDefaultTradingSundays(2026);
  });

  // Solver Options
  const [autoFillOptions, setAutoFillOptions] = useState<AutoFillOptions>(() => {
    try {
      const saved = localStorage.getItem('autoFillOptions');
      return saved ? JSON.parse(saved) : DEFAULT_OPTIONS;
    } catch {
      return DEFAULT_OPTIONS;
    }
  });

  // Modals & UI Controls
  const [isAutoFillOpen, setIsAutoFillOpen] = useState(false);
  const [isWorkersOpen, setIsWorkersOpen] = useState(false);
  const [isBatchAbsenceOpen, setIsBatchAbsenceOpen] = useState(false);
  const [lastAutoFillResult, setLastAutoFillResult] = useState<AutoFillResult | null>(null);

  const [shiftModal, setShiftModal] = useState<{
    isOpen: boolean;
    workerName: string;
    dateStr: string;
    currentValue: string;
  }>({
    isOpen: false,
    workerName: '',
    dateStr: '',
    currentValue: '',
  });

  // Notifications
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('workers', JSON.stringify(workers));
  }, [workers]);

  useEffect(() => {
    localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
  }, [scheduleData]);

  useEffect(() => {
    localStorage.setItem('tradingSundays', JSON.stringify(tradingSundays));
  }, [tradingSundays]);

  useEffect(() => {
    localStorage.setItem('autoFillOptions', JSON.stringify(autoFillOptions));
  }, [autoFillOptions]);

  // Derived Calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const totalRequiredShifts = daysInMonth * 4;
  const workNorm = calculateWorkNorm(year, month);

  const mainWorkers = useMemo(() => workers.filter((w) => !w.isPodjazd), [workers]);

  const totalConfiguredShifts = useMemo(() => {
    return mainWorkers.reduce((acc, w) => acc + (w.maxShifts !== undefined ? w.maxShifts : 15), 0);
  }, [mainWorkers]);

  // Run Real-Time Audit
  const conflicts = useMemo(() => {
    return auditSchedule(workers, year, month, scheduleData);
  }, [workers, year, month, scheduleData]);

  // Handlers
  const handleChangeMonth = (delta: number) => {
    const nextDate = new Date(year, month + delta, 1);
    setCurrentDate(nextDate);
  };

  const handleSaveShift = (workerName: string, dateStr: string, value: string) => {
    setScheduleData((prev) => {
      const next = { ...prev };
      const key = `${workerName}_${dateStr}`;
      if (value.trim()) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const handleToggleTradingSunday = (dateStr: string) => {
    setTradingSundays((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  const handleClearMonth = () => {
    if (window.confirm(`Czy na pewno chcesz wyczyścić cały grafik na ${POLISH_MONTHS[month]} ${year}?`)) {
      setScheduleData((prev) => {
        const next = { ...prev };
        workers.forEach((w) => {
          for (let day = 1; day <= daysInMonth; day++) {
            delete next[`${w.name}_${formatDateKey(year, month, day)}`];
          }
        });
        return next;
      });
      showToast(`Wyczyszczono grafik na miesiąc ${POLISH_MONTHS[month]} ${year}`, 'warning');
    }
  };

  /**
   * Automatyczne wyrównanie i podzielenie normy zmian między pracowników,
   * tak aby suma wynosiła dokładnie dniMiesiąca * 4.
   */
  const handleBalanceNorms = () => {
    const balanced = calculateBalancedTargets(workers, daysInMonth);
    const targetMap = new Map(balanced.map((b) => [b.workerId, b.targetShifts]));

    setWorkers((prev) =>
      prev.map((w) => {
        if (targetMap.has(w.id)) {
          return { ...w, maxShifts: targetMap.get(w.id)! };
        }
        return w;
      })
    );
    showToast(
      `Pomyślnie dopasowano normę: ${totalRequiredShifts} zmian podzielono równomiernie między ${mainWorkers.length} pracowników głównych.`,
      'success'
    );
  };

  const handleApplyNormToAll = (norm: number) => {
    setWorkers((prev) =>
      prev.map((w) => (!w.isPodjazd ? { ...w, maxShifts: norm } : w))
    );
    showToast(`Ustawiono ${norm} zmian wszystkim pracownikom głównym`, 'success');
  };

  const handleBatchAbsence = (workerName: string, days: number[], status: 'U' | '*' | '') => {
    setScheduleData((prev) => {
      const next = { ...prev };
      days.forEach((day) => {
        const key = `${workerName}_${formatDateKey(year, month, day)}`;
        if (status) {
          next[key] = status;
        } else {
          delete next[key];
        }
      });
      return next;
    });
    showToast(`Zaktualizowano dni dla ${workerName}`, 'success');
  };

  /**
   * Uruchomienie zaawansowanego algorytmu auto-wypełniania
   */
  const handleRunAutoFill = () => {
    // Sprawdzenie czy cele się zgadzają
    if (totalConfiguredShifts !== totalRequiredShifts) {
      if (
        window.confirm(
          `Suma zmian pracowników (${totalConfiguredShifts}) różni się od wymogu kalendarza (${totalRequiredShifts} zmian).\n\n` +
          `Czy chcesz, aby system automatycznie wyrównał normę i wygenerował optymalny grafik?`
        )
      ) {
        handleBalanceNorms();
        // Pobierz natychmiast zaktualizowanych pracowników
        const balanced = calculateBalancedTargets(workers, daysInMonth);
        const targetMap = new Map(balanced.map((b) => [b.workerId, b.targetShifts]));
        const updatedWorkers = workers.map((w) =>
          targetMap.has(w.id) ? { ...w, maxShifts: targetMap.get(w.id)! } : w
        );

        const solverOutput = solveSchedule(
          updatedWorkers,
          year,
          month,
          scheduleData,
          autoFillOptions
        );
        setScheduleData(solverOutput.newSchedule);
        setLastAutoFillResult(solverOutput.result);

        if (solverOutput.result.success) {
          showToast('Grafik został wygenerowany pomyślnie i bez konfliktów!', 'success');
        } else {
          showToast(solverOutput.result.message, 'warning');
        }
        return;
      }
    }

    const solverOutput = solveSchedule(workers, year, month, scheduleData, autoFillOptions);
    setScheduleData(solverOutput.newSchedule);
    setLastAutoFillResult(solverOutput.result);

    if (solverOutput.result.success) {
      showToast('Grafik został wygenerowany pomyślnie!', 'success');
    } else {
      showToast(solverOutput.result.message, 'warning');
    }
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.workers && imported.scheduleData) {
          setWorkers(
            imported.workers.map((w: any, idx: number) => ({
              id: w.id || `w-${idx + 1}`,
              name: typeof w === 'string' ? w : w.name,
              oldVacation: Number(w.oldVacation) || 0,
              newVacation: w.newVacation !== undefined ? Number(w.newVacation) : 26,
              nightPref: w.nightPref !== undefined ? Number(w.nightPref) : 50,
              experience: w.experience !== undefined ? Number(w.experience) : 5,
              maxShifts: w.maxShifts !== undefined ? Number(w.maxShifts) : 12,
              isPodjazd: Boolean(w.isPodjazd),
            }))
          );
          setScheduleData(imported.scheduleData);
          if (imported.tradingSundays) setTradingSundays(imported.tradingSundays);
          if (imported.year && imported.month) {
            setCurrentDate(new Date(imported.year, imported.month - 1, 1));
          }
          showToast('Pomyślnie wczytano plik grafiku z kopii!', 'success');
        } else {
          showToast('Nieprawidłowy format pliku JSON.', 'error');
        }
      } catch (err) {
        showToast('Błąd parsowania pliku JSON.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="no-print fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl border border-slate-700 transition-all animate-bounce">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              toastMessage.type === 'success'
                ? 'bg-emerald-400'
                : toastMessage.type === 'warning'
                ? 'bg-amber-400'
                : 'bg-red-400'
            }`}
          />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main App Header */}
      <Header
        currentDate={currentDate}
        workNormHours={workNorm.hours}
        totalConfiguredShifts={totalConfiguredShifts}
        totalRequiredShifts={totalRequiredShifts}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        conflictCount={conflicts.filter((c) => c.severity === 'error').length}
        onOpenAutoFill={() => setIsAutoFillOpen(true)}
        onPrint={handlePrint}
      />

      {/* Action Toolbar */}
      <div className="no-print">
        <Toolbar
          currentDate={currentDate}
          onChangeMonth={handleChangeMonth}
          onSetCurrentDate={setCurrentDate}
          onOpenAutoFill={() => setIsAutoFillOpen(true)}
          onOpenBatchAbsence={() => setIsBatchAbsenceOpen(true)}
          onBalanceNorms={handleBalanceNorms}
          onClearMonth={handleClearMonth}
          onExportJson={() =>
            exportScheduleToJson(workers, scheduleData, tradingSundays, year, month)
          }
          onImportJson={handleImportJson}
          onExportCsv={() => exportScheduleToCsv(workers, scheduleData, year, month)}
          onOpenWorkers={() => setIsWorkersOpen(true)}
        />
      </div>

      {/* Content Area according to active tab */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === 'schedule' && (
          <div className="p-2 sm:p-4">
            <ScheduleGrid
              currentDate={currentDate}
              workers={workers}
              scheduleData={scheduleData}
              tradingSundays={tradingSundays}
              onSaveShift={handleSaveShift}
              onOpenTimeModal={(workerName, dateStr) => {
                setShiftModal({
                  isOpen: true,
                  workerName,
                  dateStr,
                  currentValue: scheduleData[`${workerName}_${dateStr}`] || '',
                });
              }}
              onToggleTradingSunday={handleToggleTradingSunday}
            />
          </div>
        )}

        {activeTab === 'stats' && (
          <StatsPanel
            currentDate={currentDate}
            workers={workers}
            scheduleData={scheduleData}
            tradingSundays={tradingSundays}
          />
        )}

        {activeTab === 'audit' && (
          <AuditPanel
            conflicts={conflicts}
            onSelectConflictDay={(day) => {
              setActiveTab('schedule');
            }}
          />
        )}

        {activeTab === 'workers' && (
          <div className="mx-auto max-w-(--breakpoint-2xl) p-4 sm:p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Skład Zespołu i Profile Pracowników
                  </h2>
                  <p className="text-xs text-slate-500">
                    Definiuj poziomy doświadczenia (1-10), preferencje nocek oraz limity zmian
                  </p>
                </div>
                <button
                  onClick={() => setIsWorkersOpen(true)}
                  className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                >
                  Edytuj lub dodaj pracowników
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workers.map((w, index) => (
                  <div
                    key={w.id || index}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{w.name}</span>
                      {w.isPodjazd ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Podjazd
                        </span>
                      ) : (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                          Główny
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Doświadczenie: </span>
                        <span className="font-bold font-mono text-slate-800">{w.experience}/10</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Nocki cel: </span>
                        <span className="font-bold font-mono text-slate-800">{w.nightPref}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Urlop (zal./bież.): </span>
                        <span className="font-bold font-mono text-slate-800">
                          {w.oldVacation}d / {w.newVacation}d
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Docelowe zmiany: </span>
                        <span className="font-bold font-mono text-amber-700">{w.maxShifts}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ShiftModal
        isOpen={shiftModal.isOpen}
        workerName={shiftModal.workerName}
        dateStr={shiftModal.dateStr}
        currentValue={shiftModal.currentValue}
        onSave={handleSaveShift}
        onClose={() => setShiftModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <AutoFillModal
        isOpen={isAutoFillOpen}
        currentDate={currentDate}
        workers={workers}
        options={autoFillOptions}
        onOptionsChange={setAutoFillOptions}
        onRunAutoFill={handleRunAutoFill}
        onBalanceNorms={handleBalanceNorms}
        onClose={() => setIsAutoFillOpen(false)}
        lastResult={lastAutoFillResult}
      />

      <WorkerManagerModal
        isOpen={isWorkersOpen}
        workers={workers}
        currentDate={currentDate}
        onUpdateWorker={(index, updated) => {
          setWorkers((prev) => {
            const next = [...prev];
            next[index] = updated;
            return next;
          });
        }}
        onAddWorker={(newW) => setWorkers((prev) => [...prev, newW])}
        onRemoveWorker={(index) => {
          if (window.confirm(`Czy usunąć pracownika ${workers[index].name}?`)) {
            setWorkers((prev) => prev.filter((_, i) => i !== index));
          }
        }}
        onMoveWorker={(index, dir) => {
          const nextIndex = index + dir;
          if (nextIndex < 0 || nextIndex >= workers.length) return;
          setWorkers((prev) => {
            const next = [...prev];
            const temp = next[index];
            next[index] = next[nextIndex];
            next[nextIndex] = temp;
            return next;
          });
        }}
        onApplyNormToAll={handleApplyNormToAll}
        onBalanceNorms={handleBalanceNorms}
        onClose={() => setIsWorkersOpen(false)}
      />

      <BatchAbsenceModal
        isOpen={isBatchAbsenceOpen}
        currentDate={currentDate}
        workers={workers}
        onApplyBatch={handleBatchAbsence}
        onClose={() => setIsBatchAbsenceOpen(false)}
      />
    </div>
  );
}
