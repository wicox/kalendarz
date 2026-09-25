import React from 'react';
import { X, Printer, Check } from 'lucide-react';
import { PrintSettings } from '../types/schedule';

interface PrintSettingsModalProps {
  isOpen: boolean;
  settings: PrintSettings;
  onSettingsChange: (settings: PrintSettings) => void;
  onPrint?: () => void;
  onConfirmPrint?: () => void;
  onClose: () => void;
}

export const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({
  isOpen,
  settings,
  onSettingsChange,
  onPrint,
  onConfirmPrint,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof PrintSettings, value: boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const handlePrintTrigger = () => {
    onClose();
    setTimeout(() => {
      if (onConfirmPrint) onConfirmPrint();
      else if (onPrint) onPrint();
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs no-print">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Opcje Wydruku (A4 Poziomo)</h3>
              <p className="text-xs text-slate-500">
                Wybierz elementy i kolumny, które mają pojawić się na wydruku
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

        {/* Options list */}
        <div className="my-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs font-semibold text-slate-800">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Dane osobowe i kolumna pracownika:
          </div>

          <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
            <span>Drukuj Nazwisko / Inicjał pracownika</span>
            <input
              type="checkbox"
              checked={settings.showLastName}
              onChange={(e) => handleChange('showLastName', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
            <span>Drukuj Doświadczenie i Nocki (np. dośw. 5 · noc 50%)</span>
            <input
              type="checkbox"
              checked={settings.showExperience}
              onChange={(e) => handleChange('showExperience', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
            <span>Drukuj Typ Umowy (np. UoP / UZ / Podjazd)</span>
            <input
              type="checkbox"
              checked={settings.showContractType}
              onChange={(e) => handleChange('showContractType', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
          </label>

          <div className="border-t border-slate-200 pt-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Widoczność kolumn podsumowań:
          </div>

          <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
            <span>Drukuj kolumnę Urlop</span>
            <input
              type="checkbox"
              checked={settings.showVacation}
              onChange={(e) => handleChange('showVacation', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
            <span>Drukuj kolumnę D (h)</span>
            <input
              type="checkbox"
              checked={settings.showDayHours}
              onChange={(e) => handleChange('showDayHours', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
            <span>Drukuj kolumnę N (h)</span>
            <input
              type="checkbox"
              checked={settings.showNightHours}
              onChange={(e) => handleChange('showNightHours', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
            <span>Drukuj kolumnę Suma h</span>
            <input
              type="checkbox"
              checked={settings.showTotalHours}
              onChange={(e) => handleChange('showTotalHours', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
            <span>Drukuj kolumnę Zmiany</span>
            <input
              type="checkbox"
              checked={settings.showShiftsCount}
              onChange={(e) => handleChange('showShiftsCount', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Anuluj
          </button>

          <button
            type="button"
            onClick={handlePrintTrigger}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 active:bg-red-800 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Drukuj z tymi ustawieniami</span>
          </button>
        </div>
      </div>
    </div>
  );
};
