import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { ScheduleGrid } from './components/ScheduleGrid';
import { ShiftModal } from './components/ShiftModal';
import { AutoFillModal } from './components/AutoFillModal';
import { WorkerManagerModal } from './components/WorkerManagerModal';
import { BatchAbsenceModal } from './components/BatchAbsenceModal';
import { PrintSettingsModal } from './components/PrintSettingsModal';
import { StatsPanel } from './components/StatsPanel';
import { AuditPanel } from './components/AuditPanel';

import { Worker, AutoFillOptions, AutoFillResult, PrintSettings } from './types/schedule';
import {
  calculateWorkNorm,
  getDaysInMonth,
  getDefaultTradingSundays,
  formatDateKey,
  POLISH_MONTHS,
} from './utils/calendar';
import { solveSchedule, calculateBalancedTargets } from './utils/autoFillSolver';
import { auditSchedule } from './utils/audit';
import {
  exportScheduleToJson,
  exportScheduleToExcel,
  exportScheduleToHtml,
} from './utils/exportUtils';

const DEFAULT_WORKERS: Worker[] = [
  { id: 'w-1', firstName: 'Anna', lastName: 'J.', name: 'Anna J.', contractType: 'uop', oldVacation: 5, newVacation: 26, nightPref: 50, experience: 8, maxShifts: 15, isPodjazd: false },
  { id: 'w-2', firstName: 'Barbara', lastName: 'H.', name: 'Barbara H.', contractType: 'uop', oldVacation: 0, newVacation: 26, nightPref: 100, experience: 3, maxShifts: 15, isPodjazd: false },
  { id: 'w-3', firstName: 'Celina', lastName: 'K.', name: 'Celina K.', contractType: 'uop', oldVacation: 2, newVacation: 26, nightPref: 20, experience: 9, maxShifts: 15, isPodjazd: false },
  { id: 'w-4', firstName: 'Dariusz', lastName: 'M.', name: 'Dariusz M.', contractType: 'uop', oldVacation: 0, newVacation: 26, nightPref: 50, experience: 2, maxShifts: 15, isPodjazd: false },
  { id: 'w-5', firstName: 'Ewa', lastName: 'N.', name: 'Ewa N.', contractType: 'uop', oldVacation: 10, newVacation: 26, nightPref: 80, experience: 7, maxShifts: 15, isPodjazd: false },
  { id: 'w-6', firstName: 'Filip', lastName: 'P.', name: 'Filip P.', contractType: 'uop', oldVacation: 0, newVacation: 26, nightPref: 10, experience: 4, maxShifts: 15, isPodjazd: false },
  { id: 'w-7', firstName: 'Grzegorz', lastName: 'R.', name: 'Grzegorz R.', contractType: 'uop', oldVacation: 4, newVacation: 26, nightPref: 50, experience: 6, maxShifts: 15, isPodjazd: false },
  { id: 'w-8', firstName: 'Hanna', lastName: 'S.', name: 'Hanna S.', contractType: 'uop', oldVacation: 1, newVacation: 26, nightPref: 90, experience: 3, maxShifts: 15, isPodjazd: false },
  { id: 'w-9', firstName: 'Igor', lastName: 'T.', name: 'Igor T.', contractType: 'uz', oldVacation: 0, newVacation: 0, nightPref: 30, experience: 5, maxShifts: 0, isPodjazd: false },
  { id: 'w-10', firstName: 'Janina', lastName: 'W.', name: 'Janina W.', contractType: 'uz', oldVacation: 0, newVacation: 0, nightPref: 50, experience: 4, maxShifts: 0, isPodjazd: false },
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

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  showLastName: true,
  showExperience: true,
  showContractType: true,
  showVacation: true,
  showDayHours: true,
  showNightHours: true,
  showTotalHours: true,
  showShiftsCount: true,
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
          // Jeśli w localStorage były stare przykładowe dane z pełnymi nazwiskami typu "Jan Kowalski", przełączamy na żądane inicjały
          const hasOldDemoSurnames = parsed.some(
            (w: any) => w.name === 'Jan Kowalski' || w.name === 'Piotr Wiśniewski'
          );
          if (hasOldDemoSurnames) {
            return DEFAULT_WORKERS;
          }

          return parsed.map((w, idx) => {
            const rawName = typeof w === 'string' ? w : w.name || `Pracownik ${idx + 1}`;
            const parts = rawName.split(' ');
            const fName = w.firstName !== undefined ? w.firstName : parts[0] || '';
            const lName = w.lastName !== undefined ? w.lastName : parts.slice(1).join(' ');

            return {
              id: w.id || `w-${idx + 1}`,
              name: rawName,
              firstName: fName,
              lastName: lName,
              contractType: w.contractType === 'uz' ? 'uz' : 'uop',
              oldVacation: Number(w.oldVacation) || 0,
              newVacation: w.newVacation !== undefined ? Number(w.newVacation) : 26,
              nightPref: w.nightPref !== undefined ? Number(w.nightPref) : 50,
              experience: w.experience !== undefined ? Number(w.experience) : 5,
              maxShifts: w.maxShifts !== undefined ? Number(w.maxShifts) : 15,
              isPodjazd: Boolean(w.isPodjazd),
            };
          });
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

  // Print Settings
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => {
    try {
      const saved = localStorage.getItem('printSettings');
      return saved ? JSON.parse(saved) : DEFAULT_PRINT_SETTINGS;
    } catch {
      return DEFAULT_PRINT_SETTINGS;
    }
  });

  // Modals & UI Controls
  const [isAutoFillOpen, setIsAutoFillOpen] = useState(false);
  const [isWorkersOpen, setIsWorkersOpen] = useState(false);
  const [isBatchAbsenceOpen, setIsBatchAbsenceOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
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

  useEffect(() => {
    localStorage.setItem('printSettings', JSON.stringify(printSettings));
  }, [printSettings]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const norm = calculateWorkNorm(year, month);

  // Zliczanie zaplanowanych godzin i zmian ze stacji
  const stationWorkers = workers.filter((w) => !w.isPodjazd);
  const totalConfiguredShifts = stationWorkers.reduce((acc, w) => acc + (w.maxShifts || 0), 0);
  const totalConfiguredHours = totalConfiguredShifts * 12;

  // Real-time schedule audit
  const conflicts = useMemo(() => {
    return auditSchedule(workers, year, month, scheduleData);
  }, [workers, year, month, scheduleData]);

  const handleChangeMonth = (delta: number) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleSaveShift = (workerName: string, dateStr: string, value: string) => {
    setScheduleData((prev) => {
      const next = { ...prev };
      const key = `${workerName}_${dateStr}`;
      if (value && value.trim()) {
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
    if (
      window.confirm(
        `Czy na pewno chcesz wyczyścić wszystkie wpisy grafiku dla miesiąca ${POLISH_MONTHS[month]} ${year}?`
      )
    ) {
      setScheduleData((prev) => {
        const next: Record<string, string> = {};
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        for (const k in prev) {
          if (!k.includes(`_${prefix}-`)) {
            next[k] = prev[k];
          }
        }
        return next;
      });
      showToast('Wyczyszczono wpisy dla bieżącego miesiąca', 'warning');
    }
  };

  const handleApplyNormToAll = (targetNormShifts: number) => {
    setWorkers((prev) =>
      prev.map((w) => (w.isPodjazd ? w : { ...w, maxShifts: targetNormShifts }))
    );
    showToast(`Ustawiono ${targetNormShifts} zmian wszystkim pracownikom stacji`, 'success');
  };

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
    showToast(`Wyrównano cele zmian do idealnych ${norm.totalStationHours} godzin!`, 'success');
  };

  const handleBatchAbsence = (
    workerName: string,
    days: number[],
    status: 'U' | '*' | ''
  ) => {
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

  const handleRunAutoFill = () => {
    if (totalConfiguredShifts !== norm.totalStationShifts) {
      if (
        window.confirm(
          `Suma zmian pracowników wynosi ${totalConfiguredShifts} (${totalConfiguredHours}h), ` +
          `podczas gdy obsada stacji wymaga dokładnie ${norm.totalStationShifts} zmian (${norm.totalStationHours}h).\n\n` +
          `Czy chcesz, aby system automatycznie wyrównał normę i wygenerował optymalny grafik?`
        )
      ) {
        handleBalanceNorms();
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
            imported.workers.map((w: any, idx: number) => {
              const rawName = typeof w === 'string' ? w : w.name || `Pracownik ${idx + 1}`;
              const parts = rawName.split(' ');
              const fName = w.firstName !== undefined ? w.firstName : parts[0] || '';
              const lName = w.lastName !== undefined ? w.lastName : parts.slice(1).join(' ');

              return {
                id: w.id || `w-${idx + 1}`,
                name: rawName,
                firstName: fName,
                lastName: lName,
                contractType: w.contractType === 'uz' ? 'uz' : 'uop',
                oldVacation: Number(w.oldVacation) || 0,
                newVacation: w.newVacation !== undefined ? Number(w.newVacation) : 26,
                nightPref: w.nightPref !== undefined ? Number(w.nightPref) : 50,
                experience: w.experience !== undefined ? Number(w.experience) : 5,
                maxShifts: w.maxShifts !== undefined ? Number(w.maxShifts) : norm.requiredShiftsCeil,
                isPodjazd: Boolean(w.isPodjazd),
              };
            })
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
        workNormHours={norm.hours}
        shiftsRaw={norm.shiftsRaw}
        requiredShiftsCeil={norm.requiredShiftsCeil}
        overtimeHours={norm.overtimeHours}
        totalStationHours={norm.totalStationHours}
        totalStationShifts={norm.totalStationShifts}
        totalConfiguredHours={totalConfiguredHours}
        totalConfiguredShifts={totalConfiguredShifts}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        conflictCount={conflicts.filter((c) => c.severity === 'error').length}
        onOpenAutoFill={() => setIsAutoFillOpen(true)}
        onPrint={() => setIsPrintModalOpen(true)}
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
          onExportExcel={() => exportScheduleToExcel(workers, scheduleData, year, month, tradingSundays)}
          onExportHtml={() => exportScheduleToHtml(workers, scheduleData, year, month, tradingSundays)}
          onOpenWorkers={() => setIsWorkersOpen(true)}
          onOpenPrintModal={() => setIsPrintModalOpen(true)}
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
              printSettings={printSettings}
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
                    Skład Zespołu, Rodzaje Umów i Normy
                  </h2>
                  <p className="text-xs text-slate-500">
                    Miesiąc {POLISH_MONTHS[month]} {year}: Norma etatu {norm.hours}h ({norm.requiredShiftsCeil} zmian z zaokrąglenia, +{norm.overtimeHours}h nadgodzin) | Suma stacji: {norm.totalStationHours}h ({norm.totalStationShifts} zmian)
                  </p>
                </div>
                <button
                  onClick={() => setIsWorkersOpen(true)}
                  className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
                      <div className="flex items-center gap-1">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            w.contractType === 'uop'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {w.contractType === 'uop' ? 'Umowa o pracę' : 'Zlecenie (UZ)'}
                        </span>
                        {w.isPodjazd && (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Podjazd
                          </span>
                        )}
                      </div>
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
                        <span className="text-slate-500">Docelowo zmian: </span>
                        <span className="font-bold font-mono text-blue-900">
                          {w.maxShifts} ({ (w.maxShifts || 0) * (w.isPodjazd ? 8 : 12) }h)
                        </span>
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

      <PrintSettingsModal
        isOpen={isPrintModalOpen}
        settings={printSettings}
        onSettingsChange={setPrintSettings}
        onPrint={handlePrint}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
}
