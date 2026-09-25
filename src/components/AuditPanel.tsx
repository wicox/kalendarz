import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { ScheduleConflict } from '../types/schedule';

interface AuditPanelProps {
  conflicts: ScheduleConflict[];
  onSelectConflictDay?: (day: number) => void;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({
  conflicts,
  onSelectConflictDay,
}) => {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>('all');

  const errors = conflicts.filter((c) => c.severity === 'error');
  const warnings = conflicts.filter((c) => c.severity === 'warning');

  const filteredConflicts = conflicts.filter((c) => {
    if (filter === 'error') return c.severity === 'error';
    if (filter === 'warning') return c.severity === 'warning';
    return true;
  });

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) p-4 sm:p-6">
      {/* Top Health Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Centrum Audytu i Zgodności Grafiku (Kodeks Pracy)
            </h2>
            {errors.length === 0 ? (
              <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                <CheckCircle className="h-3.5 w-3.5" /> Brak błędów krytycznych
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                <AlertCircle className="h-3.5 w-3.5" /> {errors.length} błędów krytycznych
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Weryfikacja art. 132 k.p. (odpoczynek dobowy 11h), ciągłości obsady stacji oraz par doświadczenia
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Wszystkie ({conflicts.length})
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === 'error'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-red-700 hover:text-red-900'
            }`}
          >
            Błędy ({errors.length})
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === 'warning'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-amber-800 hover:text-amber-950'
            }`}
          >
            Ostrzeżenia ({warnings.length})
          </button>
        </div>
      </div>

      {/* List of items */}
      <div className="mt-5 space-y-3">
        {filteredConflicts.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-emerald-950">
              Wspaniale! Grafik jest w 100% zgodny z przepisami
            </h3>
            <p className="mt-1 text-xs text-emerald-800">
              Brak naruszeń odpoczynku dobowego, wszystkie zmiany są w pełni obsadzone (48h/dobę),
              a zespoły są właściwie zbalansowane pod kątem doświadczenia.
            </p>
          </div>
        ) : (
          filteredConflicts.map((c) => (
            <div
              key={c.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 shadow-xs transition-colors ${
                c.severity === 'error'
                  ? 'border-red-200 bg-red-50/60 hover:bg-red-50'
                  : 'border-amber-200 bg-amber-50/60 hover:bg-amber-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    c.severity === 'error'
                      ? 'bg-red-600 text-white'
                      : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {c.severity === 'error' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{c.title}</span>
                    <span className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 border border-slate-200">
                      Dzień {c.day} ({c.dateStr})
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700">{c.description}</p>
                </div>
              </div>

              {onSelectConflictDay && (
                <button
                  type="button"
                  onClick={() => onSelectConflictDay(c.day)}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span>Pokaż dzień {c.day}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
