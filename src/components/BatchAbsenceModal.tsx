import React, { useState } from 'react';
import { X, CalendarDays, Palmtree, Coffee, Check, Trash2 } from 'lucide-react';
import { Worker } from '../types/schedule';
import { formatDateKey, getDaysInMonth } from '../utils/calendar';

interface BatchAbsenceModalProps {
  isOpen: boolean;
  currentDate: Date;
  workers: Worker[];
  onApplyBatch: (workerName: string, days: number[], status: 'U' | '*' | '') => void;
  onClose: () => void;
}

export const BatchAbsenceModal: React.FC<BatchAbsenceModalProps> = ({
  isOpen,
  currentDate,
  workers,
  onApplyBatch,
  onClose,
}) => {
  const [selectedWorker, setSelectedWorker] = useState<string>(workers[0]?.name || '');
  const [startDay, setStartDay] = useState<number>(1);
  const [endDay, setEndDay] = useState<number>(7);
  const [absenceType, setAbsenceType] = useState<'U' | '*' | ''>('U');

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;

    const from = Math.min(startDay, endDay);
    const to = Math.max(startDay, endDay);
    const days: number[] = [];
    for (let d = from; d <= to; d++) {
      days.push(d);
    }

    onApplyBatch(selectedWorker, days, absenceType);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Seryjne wprowadzanie nieobecności</h3>
              <p className="text-xs text-slate-500">Urlop wypoczynkowy lub dni wolne dla pracownika</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700">Wybierz pracownika:</label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              {workers.map((w) => (
                <option key={w.name} value={w.name}>
                  {w.name} {w.isPodjazd ? '(Podjazd)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Rodzaj wpisu:</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAbsenceType('U')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-bold transition-all ${
                  absenceType === 'U'
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Palmtree className="h-3.5 w-3.5" />
                <span>Urlop (U)</span>
              </button>

              <button
                type="button"
                onClick={() => setAbsenceType('*')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-bold transition-all ${
                  absenceType === '*'
                    ? 'border-amber-600 bg-amber-500 text-slate-950'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Coffee className="h-3.5 w-3.5" />
                <span>Wolne (*)</span>
              </button>

              <button
                type="button"
                onClick={() => setAbsenceType('')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-bold transition-all ${
                  absenceType === ''
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Wyczyść</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700">Dzień początkowy:</label>
              <select
                value={startDay}
                onChange={(e) => setStartDay(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-800"
              >
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Dzień {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Dzień końcowy:</label>
              <select
                value={endDay}
                onChange={(e) => setEndDay(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-800"
              >
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Dzień {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Anuluj
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Zastosuj w grafiku</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
