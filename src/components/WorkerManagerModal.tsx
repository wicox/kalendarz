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
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Worker, ContractType } from '../types/schedule';
import { getDaysInMonth, calculateWorkNorm } from '../utils/calendar';

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
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newContractType, setNewContractType] = useState<ContractType>('uop');
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
  const norm = calculateWorkNorm(year, month);

  // Pracownicy stacji (bez podjazdu)
  const mainWorkers = workers.filter((w) => !w.isPodjazd);
  const totalAssignedShifts = mainWorkers.reduce((acc, w) => acc + (w.maxShifts || 0), 0);
  const totalAssignedHours = totalAssignedShifts * 12;

  const podjazdShifts = workers
    .filter((w) => w.isPodjazd)
    .reduce((acc, w) => acc + (w.maxShifts || 0), 0);
  const podjazdHours = podjazdShifts * 8; // Podjazd to standardowo 8h

  // Różnica godzin i zmian do obsady stacji (np. 1440h / 120 zmian dla 30 dni)
  const hoursDiff = totalAssignedHours - norm.totalStationHours;
  const shiftsDiff = totalAssignedShifts - norm.totalStationShifts;
  const isPerfectStationMatch = totalAssignedHours === norm.totalStationHours;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const fName = newFirstName.trim();
    const lName = newLastName.trim();
    if (!fName) return;

    const fullName = lName ? `${fName} ${lName}` : fName;

    onAddWorker({
      id: `w-${Date.now()}`,
      name: fullName,
      firstName: fName,
      lastName: lName,
      contractType: newContractType,
      oldVacation: Number(newOldVac) || 0,
      newVacation: Number(newNewVac) || 0,
      nightPref: Number(newNightPref) || 0,
      experience: Math.min(10, Math.max(1, Number(newExp) || 1)),
      maxShifts: Number(newShifts) || 0,
      isPodjazd: newIsPodjazd,
    });

    setNewFirstName('');
    setNewLastName('');
    setNewOldVac(0);
    setNewNewVac(26);
    setNewNightPref(50);
    setNewExp(5);
    setNewShifts(norm.requiredShiftsCeil);
    setNewIsPodjazd(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5 backdrop-blur-2xs">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ustawienia Pracowników i Kalkulator Normy
              </h2>
              <p className="text-xs text-slate-500">
                Zarządzaj zespołem, typem umowy (UoP/UZ), wymiarem zmian i uprawnieniami do podjazdu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Informacje o Normie i Pokryciu */}
        <div className="my-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Box 1: Norma Miesięczna */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3">
            <div className="text-[11px] font-semibold text-blue-800">
              Norma Miesięczna (Kodeks Pracy)
            </div>
            <div className="mt-1 flex items-baseline gap-2 font-mono">
              <span className="text-xl font-black text-blue-950">{norm.hours}h</span>
              <span className="text-xs text-slate-600">÷ 12h = {norm.shiftsRaw} zm.</span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-blue-900">
              Zaokrąglenie do góry: <strong className="font-bold">{norm.requiredShiftsCeil} zmian</strong>{' '}
              ({norm.overtimeHours > 0 ? `+${norm.overtimeHours}h nadgodzin` : '0h'})
            </div>
          </div>

          {/* Box 2: Suma zmian i godzin zespołu - DYNAMICZNIE DLA DANEGO MIESIĄCA */}
          <div
            className={`rounded-xl border p-3 transition-colors ${
              isPerfectStationMatch
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                : 'border-amber-300 bg-amber-50 text-amber-950'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-600">
              Suma zaplanowana (bez podjazdu)
            </div>
            <div className="mt-1 flex items-baseline gap-2 font-mono">
              <span className="text-xl font-black">{totalAssignedHours}h</span>
              <span className="text-xs text-slate-500">/ {norm.totalStationHours}h wymagane</span>
            </div>
            <div className="mt-1 text-[11px] font-bold">
              {isPerfectStationMatch ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pokrycie idealne ({norm.totalStationHours}h / {norm.totalStationShifts} zmian)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" />{' '}
                  {hoursDiff > 0
                    ? `Nadmiar: +${hoursDiff}h (+${shiftsDiff} zmian)`
                    : `Brakuje: ${Math.abs(hoursDiff)}h (${Math.abs(shiftsDiff)} zmian)`}
                </span>
              )}
            </div>
          </div>

          {/* Box 3: Przyciski akcji normy */}
          <div className="flex flex-col justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <button
              type="button"
              onClick={() => onApplyNormToAll(norm.requiredShiftsCeil)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-2xs cursor-pointer"
              title={`Wpisz wyliczone ${norm.requiredShiftsCeil} zmian z normy wszystkim pracownikom`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Wpisz normę ({norm.requiredShiftsCeil} zm.) wszystkim</span>
            </button>

            <button
              type="button"
              onClick={onBalanceNorms}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-200 transition-colors cursor-pointer"
              title={`Wyrównaj sumę zmian do dokładnych ${norm.totalStationHours} godzin`}
            >
              <Scale className="h-3.5 w-3.5 text-amber-800" />
              <span>Wyrównaj sumę do {norm.totalStationHours}h ({norm.totalStationShifts} zm.)</span>
            </button>
          </div>
        </div>

        {/* Workers List Table */}
        <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 font-bold text-slate-700 border-b border-slate-200 z-10">
              <tr>
                <th className="w-14 px-2 py-2 text-center">Poz.</th>
                <th className="px-3 py-2">Imię i Nazwisko</th>
                <th className="w-28 px-2 py-2 text-center" title="Typ umowy">
                  Umowa
                </th>
                <th className="w-14 px-2 py-2 text-center" title="Urlop zaległy (dni)">
                  Zaległy
                </th>
                <th className="w-14 px-2 py-2 text-center" title="Urlop bieżący (dni)">
                  Bieżący
                </th>
                <th className="w-16 px-2 py-2 text-center" title="Preferencja nocy 0-100%">
                  Noc %
                </th>
                <th className="w-14 px-2 py-2 text-center" title="Doświadczenie (1-10)">
                  Dośw.
                </th>
                <th className="w-20 px-2 py-2 text-center" title="Liczba zmian w miesiącu">
                  Zmiany
                </th>
                <th className="w-16 px-2 py-2 text-center font-mono" title="Godziny ze zmian">
                  Godziny
                </th>
                <th className="w-16 px-2 py-2 text-center" title="Pracownik podjazdowy">
                  Podjazd
                </th>
                <th className="w-10 px-2 py-2 text-center">Usuń</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {workers.map((w, index) => {
                const shiftHours = (w.maxShifts || 0) * (w.isPodjazd ? 8 : 12);
                const isUoP = w.contractType === 'uop';

                const fName = w.firstName !== undefined ? w.firstName : (w.name ? w.name.split(' ')[0] : '');
                const lName = w.lastName !== undefined ? w.lastName : (w.name ? w.name.split(' ').slice(1).join(' ') : '');

                return (
                  <tr key={w.id || index} className="hover:bg-slate-50/80 transition-colors">
                    {/* Position reordering */}
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onMoveWorker(index, -1)}
                          disabled={index === 0}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveWorker(index, 1)}
                          disabled={index === workers.length - 1}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </td>

                    {/* Name: Imię i Nazwisko podzielone na dwa osobne pola */}
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="Imię"
                          value={fName}
                          onChange={(e) => {
                            const newF = e.target.value;
                            const full = lName ? `${newF} ${lName}` : newF;
                            onUpdateWorker(index, { ...w, firstName: newF, lastName: lName, name: full });
                          }}
                          className="w-1/2 rounded border border-slate-200 px-2 py-1 font-semibold text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-hidden text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Nazwisko"
                          value={lName}
                          onChange={(e) => {
                            const newL = e.target.value;
                            const full = newL ? `${fName} ${newL}` : fName;
                            onUpdateWorker(index, { ...w, firstName: fName, lastName: newL, name: full });
                          }}
                          className="w-1/2 rounded border border-slate-200 px-2 py-1 font-semibold text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-hidden text-xs"
                        />
                      </div>
                    </td>

                    {/* Contract Type (Umowa o pracę / Umowa zlecenie) */}
                    <td className="px-2 py-1.5 text-center">
                      <select
                        value={w.contractType || 'uop'}
                        onChange={(e) =>
                          onUpdateWorker(index, {
                            ...w,
                            contractType: e.target.value as ContractType,
                          })
                        }
                        className={`rounded px-2 py-1 text-xs font-bold border focus:outline-hidden ${
                          isUoP
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="uop">Umowa o pracę (UoP)</option>
                        <option value="uz">Umowa zlecenie (UZ)</option>
                      </select>
                    </td>

                    {/* Old vacation */}
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={w.oldVacation || 0}
                        onChange={(e) =>
                          onUpdateWorker(index, {
                            ...w,
                            oldVacation: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-12 rounded border border-slate-200 px-1 py-1 text-center font-mono text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
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
                          onUpdateWorker(index, {
                            ...w,
                            newVacation: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-12 rounded border border-slate-200 px-1 py-1 text-center font-mono text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                      />
                    </td>

                    {/* Night Shift Preference */}
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={10}
                          value={w.nightPref}
                          onChange={(e) =>
                            onUpdateWorker(index, {
                              ...w,
                              nightPref: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                            })
                          }
                          className="w-12 rounded border border-slate-200 px-1 py-1 text-center font-mono text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                        />
                        <span className="text-slate-400 text-[10px]">%</span>
                      </div>
                    </td>

                    {/* Experience Level */}
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={w.experience}
                        onChange={(e) =>
                          onUpdateWorker(index, {
                            ...w,
                            experience: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)),
                          })
                        }
                        className="w-12 rounded border border-slate-200 px-1 py-1 text-center font-mono text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-hidden font-bold"
                      />
                    </td>

                    {/* Target shifts count */}
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="number"
                        min={0}
                        max={31}
                        value={w.maxShifts || 0}
                        onChange={(e) =>
                          onUpdateWorker(index, {
                            ...w,
                            maxShifts: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-14 rounded border border-slate-200 px-1 py-1 text-center font-mono text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                      />
                    </td>

                    {/* Calculated hours from shifts */}
                    <td className="px-2 py-1.5 text-center font-mono text-xs font-semibold text-slate-600">
                      {shiftHours}h
                    </td>

                    {/* Is Podjazd */}
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(w.isPodjazd)}
                        onChange={(e) =>
                          onUpdateWorker(index, {
                            ...w,
                            isPodjazd: e.target.checked,
                          })
                        }
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 accent-emerald-600"
                      />
                    </td>

                    {/* Delete Action */}
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveWorker(index)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                        title="Usuń pracownika"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add New Worker Form */}
        <form
          onSubmit={handleAdd}
          className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="mb-2 text-xs font-bold text-slate-800">Dodaj nowego pracownika:</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-9 items-center">
            <div>
              <input
                type="text"
                required
                placeholder="Imię"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Nazwisko"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <select
                value={newContractType}
                onChange={(e) => setNewContractType(e.target.value as ContractType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="uop">UoP (Etatu)</option>
                <option value="uz">UZ (Zlecenie)</option>
              </select>
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
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center font-mono font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                title="Docelowa liczba zmian"
              />
            </div>

            <div className="flex items-center justify-between gap-1">
              <label className="flex items-center gap-1 text-[11px] text-slate-600 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsPodjazd}
                  onChange={(e) => setNewIsPodjazd(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 accent-emerald-600"
                />
                Podjazd
              </label>

              <button
                type="submit"
                className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 active:bg-red-800 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Dodaj
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div>
              Łącznie pracowników: <strong className="text-slate-800">{workers.length}</strong> (stacja:{' '}
              {mainWorkers.length}, podjazd: {workers.length - mainWorkers.length})
            </div>
            <div>
              Godziny zaplanowane:{' '}
              <strong className="text-slate-800">{totalAssignedHours + podjazdHours}h</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
          >
            Gotowe
          </button>
        </div>
      </div>
    </div>
  );
};
