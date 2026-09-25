import React, { useState, useEffect } from 'react';
import { X, Clock, Sun, Moon, Fuel, Palmtree, Coffee, Check } from 'lucide-react';
import { parseShift, formatShiftString } from '../utils/shiftParser';

interface ShiftModalProps {
  isOpen: boolean;
  workerName: string;
  dateStr: string;
  currentValue: string;
  onSave: (workerName: string, dateStr: string, newValue: string) => void;
  onClose: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  workerName,
  dateStr,
  currentValue,
  onSave,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<string>('D');
  const [timeFrom, setTimeFrom] = useState<string>('06:00');
  const [timeTo, setTimeTo] = useState<string>('18:00');

  useEffect(() => {
    if (!isOpen) return;
    const parsed = parseShift(currentValue);

    if (parsed.code === 'N') {
      setSelectedType('N');
      setTimeFrom(parsed.startTime || '18:00');
      setTimeTo(parsed.endTime || '06:00');
    } else if (parsed.code === 'P') {
      setSelectedType('P');
      setTimeFrom(parsed.startTime || '08:00');
      setTimeTo(parsed.endTime || '16:00');
    } else if (parsed.code === 'U') {
      setSelectedType('U');
    } else if (parsed.code === '*') {
      setSelectedType('*');
    } else {
      setSelectedType('D');
      setTimeFrom(parsed.startTime || '06:00');
      setTimeTo(parsed.endTime || '18:00');
    }
  }, [isOpen, currentValue]);

  if (!isOpen) return null;

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    if (type === 'D') {
      setTimeFrom('06:00');
      setTimeTo('18:00');
    } else if (type === 'N') {
      setTimeFrom('18:00');
      setTimeTo('06:00');
    } else if (type === 'P') {
      setTimeFrom('08:00');
      setTimeTo('16:00');
    }
  };

  const handleFromChange = (newFrom: string) => {
    setTimeFrom(newFrom);
    if (selectedType === 'P') return;
    const [h, m] = newFrom.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const nextH = (h + 12) % 24;
      setTimeTo(`${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  };

  const handleSave = () => {
    let formatted = '';
    if (selectedType === 'U' || selectedType === '*') {
      formatted = selectedType;
    } else if (selectedType) {
      formatted = `${selectedType}\n${timeFrom}\n${timeTo}`;
    }
    onSave(workerName, dateStr, formatted);
    onClose();
  };

  const handleClear = () => {
    onSave(workerName, dateStr, '');
    onClose();
  };

  // Generate 24h intervals for select
  const timeOptions: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of ['00', '30']) {
      timeOptions.push(`${String(h).padStart(2, '0')}:${m}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-2xs">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Wybór zmiany i godzin</h3>
            <p className="text-xs text-slate-500">
              {workerName} · <span className="font-mono">{dateStr}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shift Presets */}
        <div className="my-4">
          <label className="mb-2 block text-xs font-semibold text-slate-700">
            Szybki wybór rodzaju zmiany:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleTypeSelect('D')}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-bold transition-all ${
                selectedType === 'D'
                  ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sun className="h-4 w-4 text-amber-500" />
              <span>D (Dzień)</span>
              <span className="text-[10px] font-normal text-slate-500">06:00 - 18:00</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeSelect('N')}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-bold transition-all ${
                selectedType === 'N'
                  ? 'border-slate-900 bg-slate-900 text-amber-300 ring-2 ring-slate-900/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Moon className="h-4 w-4 text-indigo-400" />
              <span>N (Noc)</span>
              <span className="text-[10px] font-normal text-slate-400">18:00 - 06:00</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeSelect('P')}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-bold transition-all ${
                selectedType === 'P'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Fuel className="h-4 w-4 text-emerald-600" />
              <span>P (Podjazd)</span>
              <span className="text-[10px] font-normal text-slate-500">08:00 - 16:00</span>
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeSelect('U')}
              className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-xs font-bold transition-all ${
                selectedType === 'U'
                  ? 'border-emerald-600 bg-emerald-600 text-white ring-2 ring-emerald-500/20'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Palmtree className="h-3.5 w-3.5" />
              <span>U (Urlop wypoczynkowy)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeSelect('*')}
              className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-xs font-bold transition-all ${
                selectedType === '*'
                  ? 'border-amber-600 bg-amber-500 text-slate-950 ring-2 ring-amber-500/20'
                  : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <Coffee className="h-3.5 w-3.5" />
              <span>* (Dzień wolny)</span>
            </button>
          </div>
        </div>

        {/* Custom Hours (Only for D, N, P) */}
        {selectedType !== 'U' && selectedType !== '*' && (
          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>Dokładne godziny pracy:</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500">Godzina OD:</label>
                <select
                  value={timeFrom}
                  onChange={(e) => handleFromChange(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500">Godzina DO:</label>
                <select
                  value={timeTo}
                  onChange={(e) => setTimeTo(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            Wyczyść dzień
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Anuluj
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 active:bg-red-800 shadow-xs transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Zapisz zmianę</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
