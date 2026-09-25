export interface Worker {
  id: string;
  name: string;
  oldVacation: number;      // Zaległy urlop (dni)
  newVacation: number;      // Bieżący urlop (dni, standardowo 26)
  nightPref: number;        // Preferencja nocy: 0% = tylko dzień, 100% = tylko noc, 50% = równe
  experience: number;       // Poziom doświadczenia: 1 (stażysta) do 10 (starszy kierownik zmiany)
  maxShifts: number;        // Docelowa liczba zmian w miesiącu
  isPodjazd: boolean;       // Pracownik podjazdowy (obsługa dystrybutorów, nie wlicza się do głównej obsady kasy)
  contractType?: 'full_time' | 'part_time'; // 1/1 etatu, 1/2 etatu itp.
  targetHours?: number;     // Opcjonalne docelowe godziny
}

export type ShiftCode = 'D' | 'N' | 'P' | 'U' | '*' | '';

export interface ParsedShift {
  raw: string;
  code: ShiftCode | string;
  startTime?: string;
  endTime?: string;
  hours: number;
  isCustom?: boolean;
}

export interface VacationBalance {
  total: number;
  oldVac: number;
  newVac: number;
  usedInYear: number;
}

export interface DayHolidayInfo {
  isHoliday: boolean;
  name?: string;
}

export interface AutoFillOptions {
  maxConsecutiveDays: number;       // Domyślnie 2 lub 3
  maxShiftsPerWeek: number;          // Domyślnie 3 (standard), dopuszczalne 4
  enforceExperiencePairing: boolean; // Zakaz 2x junior na zmianie, balans doświadczenia
  enforceRestPeriod: boolean;        // Bezwzględne min. 11h/12h odpoczynku dobowego
  enforceNightPref: boolean;         // Dążenie do dokładnego % nocy
  balanceWeekends: boolean;          // Sprawiedliwy podział sobót i niedziel
  evenSpacing: boolean;              // Równomierne rozłożenie zmian w miesiącu
  preserveExisting: boolean;         // Zachowaj ręcznie wpisane zmiany i urlopy
  ensureFreeSunday: boolean;         // Co najmniej jedna wolna niedziela w miesiącu
}

export interface AutoFillResult {
  success: boolean;
  message: string;
  unfilledSlots: { day: number; shiftType: 'D' | 'N'; needed: number }[];
  workerShiftCounts: Record<string, { current: number; target: number; nights: number; days: number }>;
  iterations: number;
  warnings: string[];
}

export interface ScheduleConflict {
  id: string;
  day: number;
  dateStr: string;
  severity: 'error' | 'warning';
  title: string;
  description: string;
  workerName?: string;
  shiftType?: 'D' | 'N' | 'P';
}
