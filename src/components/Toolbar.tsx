import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  CalendarDays,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  Users,
} from 'lucide-react';
import { POLISH_MONTHS } from '../utils/calendar';

interface ToolbarProps {
  currentDate: Date;
  onChangeMonth: (delta: number) => void;
  onSetCurrentDate: (date: Date) => void;
  onOpenAutoFill: () => void;
  onOpenBatchAbsence: () => void;
  onBalanceNorms: () => void;
  onClearMonth: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onExportCsv: () => void;
  onOpenWorkers: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentDate,
  onChangeMonth,
  onSetCurrentDate,
  onOpenAutoFill,
  onOpenBatchAbsence,
  onBalanceNorms,
  onClearMonth,
  onExportJson,
  onImportJson,
  onExportCsv,
  onOpenWorkers,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthIndex = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    onSetCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-wrap items-center justify-between gap-3">
        {/* Month Selector Navigation */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => onChangeMonth(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-700 hover:bg-white hover:shadow-xs active:bg-slate-200 transition-colors"
              title="Poprzedni miesiąc"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="min-w-32 px-2 text-center text-xs font-bold text-slate-800">
              {POLISH_MONTHS[monthIndex]} {year}
            </span>

            <button
              onClick={() => onChangeMonth(1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-700 hover:bg-white hover:shadow-xs active:bg-slate-200 transition-colors"
              title="Następny miesiąc"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleJumpToToday}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            title="Przejdź do bieżącego miesiąca"
          >
            Bieżący
          </button>
        </div>

        {/* Action Controls & Utilities */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onOpenAutoFill}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-xs hover:bg-amber-400 active:bg-amber-600 transition-colors"
            title="Inteligentne automatyczne wypełnianie z zaawansowaną optymalizacją"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Auto-wypełnienie</span>
          </button>

          <button
            onClick={onBalanceNorms}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 active:bg-amber-200 transition-colors"
            title="Wyrównaj sumę zaplanowanych zmian zespołu do dokładnej normy miesiąca"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-amber-700" />
            <span className="hidden md:inline">Dopasuj normę do m-ca</span>
            <span className="md:hidden">Dopasuj</span>
          </button>

          <button
            onClick={onOpenBatchAbsence}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            title="Seryjne wprowadzanie urlopów i dni wolnych dla pracownika"
          >
            <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Zaplanuj Urlop</span>
            <span className="sm:hidden">Urlop</span>
          </button>

          <button
            onClick={onOpenWorkers}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            title="Zarządzaj zespołem, preferencjami i doświadczeniem"
          >
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Pracownicy</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Import / Export Group */}
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            title="Eksportuj do pliku CSV / Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden lg:inline">Excel/CSV</span>
          </button>

          <button
            onClick={onExportJson}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            title="Zapisz kopię zapasową (JSON)"
          >
            <Download className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden lg:inline">Zapisz</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            title="Otwórz plik kopii grafiku (JSON)"
          >
            <Upload className="h-3.5 w-3.5 text-slate-600" />
            <span className="hidden lg:inline">Otwórz</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={onClearMonth}
            className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            title="Wyczyść wszystkie zmiany w tym miesiącu"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Wyczyść</span>
          </button>
        </div>
      </div>
    </div>
  );
};
