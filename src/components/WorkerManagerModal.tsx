import React, { useState } from 'react';
import {
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Sliders,
  Scale,
  Users,
  Check,
} from 'lucide-react';
import { Worker } from '../types/schedule';
import { getDaysInMonth } from '../utils/calendar';

interface WorkerManagerModalProps {
  isOpen: boolean;
  workers: Worker[];
  currentDate: Date;
  onUpdateWorker: (index: number, updated: Worker) => void;
  onAddWorker: (worker: Worker) => void;
  onRemoveWorker: (index: number) => void;
  onMoveWorker: (index: number, direction: -1 | 1) => void;
  onApplyNormToAll: (norm: number) => void;
  onBalanceNorms: () => void;
  onClose: () => void;
}

export const WorkerManagerModal: React.FC<WorkerManagerModalProps> = ({
  isOpen,
  workers,
  currentDate,
  onUpdateWorker,
  onAddWorker,
  onRemoveWorker,
  onMoveWorker,
  onApplyNormToAll,
  onBalanceNorms,
  onClose,
}) => {
  const [newName, setNewName] = useState('');
  const [newOldVac, setNewOldVac] = useState(0);
  const [newNewVac, setNewNewVac] = useState(26);
  const [newNightPref, setNewNightPref] = useState(50);
  const [newExp, setNewExp] = useState(5);
  const [newShifts, setNewShifts] = useState(15);
  const [newIsPodjazd, setNewIsPodjazd] = useState(false);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const totalRequired = daysInMonth * 4;

  const mainWorkers = workers.filter((w) => !w.isPodjazd);
  const totalAssigned = mainWorkers.reduce((acc, w) => acc + (w.maxShifts || 15), 0);
  const podjazdShifts = workers
    .filter((w) => w.isPodjazd)
    .reduce((acc, w) => acc + (w.maxShifts || 0), 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onAddWorker({
      id: `w-${Date.now()}`,
      name: newName.trim(),
      oldVacation: Number(newOldVac) || 0,
      newVacation: Number(newNewVac) || 26,
      nightPref: Number(newNightPref) || 50,
      experience: Number(newExp) || 5,
      maxShifts: Number(newShifts) || 15,
      isPodjazd: newIsPodjazd,
    });

    setNewName('');
    setNewOldVac(0);
    setNewNewVac(26);
    setNewNightPref(50);
    setNewExp(5);
    setNewShifts(15);
    setNewIsPodjazd(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs overflow-y-auto">
      <div className="my-6 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Zarządzanie Zespołem i Parametrami Zmian
              </h2>
              <p className="text-xs text-slate-500">
                Poziomy doświadczenia, urlopy i preferencje nocne pracowników
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

        {/* Global Action Bar */}
        <div className="my-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 border border-slate-200">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Suma zmian (Główni):</span>
            <span className="font-mono text-sm font-bold text-slate-900">{totalAssigned}</span>
            <span className="text-slate-400">/ {totalRequired} wymagane</span>
            {podjazdShifts > 0 && (
              <span className="text-emerald-700 font-medium">· Podjazd: {podjazdShifts} zm.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBalanceNorms}
              className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
              title="Wyrównaj normę automatycznie do kalendarza"
            >
              <Scale className="h-3.5 w-3.5 text-amber-700" />
              <span>Wyrównaj do {totalRequired} zmian</span>
            </button>

            <button
              type="button"
              onClick={() => onApplyNormToAll(15)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              title="Ustawia 15 zmian wszystkim pracownikom"
            >
              <Sliders className="h-3.5 w-3.5 text-slate-500" />
              <span>Wpisz 15 wszystkim</span>
            </button>
          </div>
        </div>

        {/* Workers List Table */}
        <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 font-bold text-slate-700 border-b border-slate-200 z-10">
              <tr>
                <th className="w-16 px-2 py-2 text-center">Poz.</th>
                <th className="px-3 py-2">Imię i Nazwisko</th>
                <th className="w-16 px-2 py-2 text-center" title="Urlop zaległy (dni)">
                  Zaległy
                </th>
                <th className="w-16 px-2 py-2 text-center" title="Urlop bieżący (dni)">
                  Bieżący
                </th>
                <th className="w-20 px-2 py-2 text-center" title="Preferencja nocy 0-100%">
                  Noc %
                </th>
                <th className="w-20 px-2 py-2 text-center" title="Doświadczenie (1-10)">
                  Dośw.
                </th>
                <th className="w-20 px-2 py-2 text-center" title="Liczba zmian w miesiącu">
                  Zmiany
                </th>
                <th className="w-16 px-2 py-2 text-center" title="Pracownik podjazdowy">
                  Podjazd
                </th>
                <th className="w-12 px-2 py-2 text-center">Usuń</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {workers.map((w, index) => (
                <tr key={w.id || index} className="hover:bg-slate-50/80 transition-colors">
                  {/* Position reordering */}
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onMoveWorker(index, -1)}
                        disabled={index === 0}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveWorker(index, 1)}
                        disabled={index === workers.length - 1}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={w.name}
                      onChange={(e) => onUpdateWorker(index, { ...w, name: e.target.value })}
                      className="w-full rounded border border-transparent px-1.5 py-1 font-semibold text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                    />
                  </td>

                  {/* Old vacation */}
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={w.oldVacation || 0}
                      onChange={(e) =>
                        onUpdateWorker(index, { ...w, oldVacation: Number(e.target.value) || 0 })
                      }
                      className="w-14 rounded border border-slate-200 px-1 py-1 text-center font-mono text-xs focus:border-blue-500 focus:outline-hidden"
                    />
                  </td>

                  {/* New vacation */}
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={w.newVacation !== undefined ? w.newVacation : 26}
                      onChange={(e) =>
                        onUpdateWorker(index, { ...w, newVacation: Number(e.target.value) || 0 })
                      }
                      className="w-14 rounded border border-slate-200 px-1 py-1 text-center font-mono text-xs focus:border-blue-500 focus:outline-hidden"
                    />
                  </td>

                  {/* Night Preference */}
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1 font-mono text-xs">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={w.nightPref !== undefined ? w.nightPref : 50}
                        onChange={(e) =>
                          onUpdateWorker(index, {
                            ...w,
                            nightPref: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                          })
                        }
                        className="w-14 rounded border border-slate-200 px-1 py-1 text-center focus:border-blue-500 focus:outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400">%</span>
                    </div>
                  </td>

                  {/* Experience */}
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1 font-mono text-xs">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={w.experience !== undefined ? w.experience : 5}
                        onChange={(e) =>
                          onUpdateWorker(index, {
                            ...w,
                            experience: Math.min(10, Math.max(1, Number(e.target.value) || 5)),
                          })
                        }
                        className="w-12 rounded border border-slate-200 px-1 py-1 text-center font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400">/10</span>
                    </div>
                  </td>

                  {/* Monthly Shift Target */}
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="number"
                      min={0}
                      max={31}
                      value={w.maxShifts !== undefined ? w.maxShifts : 15}
                      onChange={(e) =>
                        onUpdateWorker(index, { ...w, maxShifts: Number(e.target.value) || 0 })
                      }
                      className="w-14 rounded border border-slate-200 bg-slate-50 px-1 py-1 text-center font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    />
                  </td>

                  {/* Podjazd checkbox */}
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(w.isPodjazd)}
                      onChange={(e) => onUpdateWorker(index, { ...w, isPodjazd: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600"
                    />
                  </td>

                  {/* Remove Worker */}
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveWorker(index)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Usuń pracownika"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add New Worker Form */}
        <form
          onSubmit={handleAdd}
          className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="mb-2 text-xs font-bold text-slate-800">Dodaj nowego pracownika:</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-8 items-center">
            <div className="sm:col-span-2">
              <input
                type="text"
                required
                placeholder="Imię i Nazwisko"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <input
                type="number"
                min={0}
                placeholder="Zaległy"
                value={newOldVac}
                onChange={(e) => setNewOldVac(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                title="Dni urlopu zaległego"
              />
            </div>

            <div>
              <input
                type="number"
                min={0}
                placeholder="Bieżący"
                value={newNewVac}
                onChange={(e) => setNewNewVac(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                title="Dni urlopu bieżącego"
              />
            </div>

            <div>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="Noc %"
                value={newNightPref}
                onChange={(e) => setNewNightPref(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                title="Preferencja nocy (0-100%)"
              />
            </div>

            <div>
              <input
                type="number"
                min={1}
                max={10}
                placeholder="Dośw."
                value={newExp}
                onChange={(e) => setNewExp(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                title="Poziom doświadczenia (1-10)"
              />
            </div>

            <div>
              <input
                type="number"
                min={0}
                placeholder="Zmiany"
                value={newShifts}
                onChange={(e) => setNewShifts(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                title="Docelowa liczba zmian"
              />
            </div>

            <div className="flex items-center justify-between gap-1">
              <label className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                <input
                  type="checkbox"
                  checked={newIsPodjazd}
                  onChange={(e) => setNewIsPodjazd(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600"
                />
                <span>Podjazd</span>
              </label>

              <button
                type="submit"
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Dodaj</span>
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Zatwierdź i Zamknij</span>
          </button>
        </div>
      </div>
    </div>
  );
};
