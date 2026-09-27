import React, { useState } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Image as ImageIcon,
  FileCode,
  Loader2,
  Check,
} from 'lucide-react';
import { PrintSettings } from '../types/schedule';

export type ExportActionType = 'print' | 'jpg' | 'excel' | 'html';

interface PrintSettingsModalProps {
  isOpen: boolean;
  settings: PrintSettings;
  onSettingsChange: (settings: PrintSettings) => void;
  defaultAction?: ExportActionType;
  onPrint?: () => void;
  onConfirmPrint?: () => void;
  onExportJpg?: (settings: PrintSettings) => Promise<void> | void;
  onExportExcel?: (settings: PrintSettings) => void;
  onExportHtml?: (settings: PrintSettings) => void;
  onClose: () => void;
}

export const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({
  isOpen,
  settings,
  onSettingsChange,
  defaultAction = 'print',
  onPrint,
  onConfirmPrint,
  onExportJpg,
  onExportExcel,
  onExportHtml,
  onClose,
}) => {
  const [selectedAction, setSelectedAction] = useState<ExportActionType>(defaultAction);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync defaultAction when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedAction(defaultAction);
      setIsProcessing(false);
    }
  }, [isOpen, defaultAction]);

  if (!isOpen) return null;

  const handleChange = (key: keyof PrintSettings, value: boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const handleExecute = async (action: ExportActionType) => {
    setIsProcessing(true);
    try {
      if (action === 'print') {
        onClose();
        setTimeout(() => {
          if (onConfirmPrint) onConfirmPrint();
          else if (onPrint) onPrint();
        }, 120);
      } else if (action === 'jpg') {
        if (onExportJpg) {
          await onExportJpg(settings);
        }
        onClose();
      } else if (action === 'excel') {
        if (onExportExcel) onExportExcel(settings);
        onClose();
      } else if (action === 'html') {
        if (onExportHtml) onExportHtml(settings);
        onClose();
      }
    } catch (err) {
      console.error('Błąd podczas eksportu:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs no-print">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              {selectedAction === 'print' && <Printer className="h-5 w-5" />}
              {selectedAction === 'jpg' && <ImageIcon className="h-5 w-5 text-amber-400" />}
              {selectedAction === 'excel' && <FileSpreadsheet className="h-5 w-5 text-emerald-400" />}
              {selectedAction === 'html' && <FileCode className="h-5 w-5 text-purple-400" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Opcje Wydruku i Eksportu Grafiku
              </h3>
              <p className="text-xs text-slate-500">
                Wybierz kolumny i format zapisu grafiku
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

        {/* Action Type Tabs */}
        <div className="mt-3.5 mb-3 grid grid-cols-4 gap-1.5 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSelectedAction('print')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all cursor-pointer ${
              selectedAction === 'print'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="h-3.5 w-3.5 text-red-600" />
            <span>Drukuj</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAction('jpg')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all cursor-pointer ${
              selectedAction === 'jpg'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5 text-amber-600" />
            <span>Obraz JPG</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAction('excel')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all cursor-pointer ${
              selectedAction === 'excel'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAction('html')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all cursor-pointer ${
              selectedAction === 'html'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="h-3.5 w-3.5 text-purple-600" />
            <span>HTML</span>
          </button>
        </div>

        {/* Checkbox Options list */}
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs font-semibold text-slate-800">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Dane pracownika:
          </div>

          <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
            <span>Nazwisko / Inicjał pracownika (odznacz, aby zostawić tylko Imię)</span>
            <input
              type="checkbox"
              checked={settings.showLastName}
              onChange={(e) => handleChange('showLastName', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
            <span>Doświadczenie i Nocki (np. dośw. 5 · noc 50%)</span>
            <input
              type="checkbox"
              checked={settings.showExperience}
              onChange={(e) => handleChange('showExperience', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
            <span>Typ Umowy (np. UoP / UZ / Podjazd)</span>
            <input
              type="checkbox"
              checked={settings.showContractType}
              onChange={(e) => handleChange('showContractType', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
            />
          </label>

          <div className="border-t border-slate-200 pt-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Widoczność kolumn zestawień:
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
              <span>Kolumna Urlop</span>
              <input
                type="checkbox"
                checked={settings.showVacation}
                onChange={(e) => handleChange('showVacation', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
              <span>Kolumna D (h)</span>
              <input
                type="checkbox"
                checked={settings.showDayHours}
                onChange={(e) => handleChange('showDayHours', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
              <span>Kolumna N (h)</span>
              <input
                type="checkbox"
                checked={settings.showNightHours}
                onChange={(e) => handleChange('showNightHours', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors">
              <span>Kolumna Suma h</span>
              <input
                type="checkbox"
                checked={settings.showTotalHours}
                onChange={(e) => handleChange('showTotalHours', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-1 rounded-md hover:bg-white transition-colors col-span-2">
              <span>Kolumna Zmiany (liczba zmian w miesiącu)</span>
              <input
                type="checkbox"
                checked={settings.showShiftsCount}
                onChange={(e) => handleChange('showShiftsCount', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Anuluj
          </button>

          <div className="flex items-center gap-2">
            {selectedAction === 'print' && (
              <button
                type="button"
                onClick={() => handleExecute('print')}
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 active:bg-red-800 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                <span>Drukuj grafik (A4 Poziomo)</span>
              </button>
            )}

            {selectedAction === 'jpg' && (
              <button
                type="button"
                onClick={() => handleExecute('jpg')}
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 active:bg-amber-600 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generowanie JPG...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4" />
                    <span>Pobierz grafik jako JPG</span>
                  </>
                )}
              </button>
            )}

            {selectedAction === 'excel' && (
              <button
                type="button"
                onClick={() => handleExecute('excel')}
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Pobierz plik Excel (.xls)</span>
              </button>
            )}

            {selectedAction === 'html' && (
              <button
                type="button"
                onClick={() => handleExecute('html')}
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 active:bg-purple-800 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileCode className="h-4 w-4" />
                <span>Pobierz stronę HTML</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
