import { DayHolidayInfo } from '../types/schedule';

export const POLISH_DAYS_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sob'];
export const POLISH_DAYS_FULL = [
  'Niedziela',
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
];

export const POLISH_MONTHS = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

/**
 * Algorytm Gaussa / Meeusa do wyznaczania Niedzieli Wielkanocnej
 */
export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/**
 * Zwraca mapę polskich dni ustawowo wolnych od pracy z ich nazwami
 */
export function getPolishHolidays(year: number): Record<string, string> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const holidays: Record<string, string> = {
    [`${year}-01-01`]: 'Nowy Rok',
    [`${year}-01-06`]: 'Święto Trzech Króli',
    [`${year}-05-01`]: 'Święto Pracy',
    [`${year}-05-03`]: 'Święto Konstytucji 3 Maja',
    [`${year}-08-15`]: 'Wniebowzięcie NMP / Święto Wojska Polskiego',
    [`${year}-11-01`]: 'Wszystkich Świętych',
    [`${year}-11-11`]: 'Narodowe Święto Niepodległości',
    [`${year}-12-24`]: 'Wigilia Bożego Narodzenia (zwyczajowo)',
    [`${year}-12-25`]: 'Boże Narodzenie (pierwszy dzień)',
    [`${year}-12-26`]: 'Boże Narodzenie (drugi dzień)',
  };

  const easter = getEasterSunday(year);
  holidays[format(easter)] = 'Wielkanoc';

  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays[format(easterMonday)] = 'Poniedziałek Wielkanocny';

  // Zielone Świątki (49 dni po Wielkanocy, zawsze niedziela)
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  holidays[format(pentecost)] = 'Zielone Świątki';

  // Boże Ciało (60 dni po Wielkanocy, czwartek)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays[format(corpusChristi)] = 'Boże Ciało';

  return holidays;
}

/**
 * Oblicza oficjalną normę czasu pracy w danym miesiącu wg art. 130 Kodeksu Pracy:
 * 1. Mnoży się 40 godzin przez liczbę pełnych tygodni przypadających w okresie rozliczeniowym.
 * 2. Dodaje się do otrzymanej liczby godzin iloczyn 8 godzin i liczby dni pozostałych do końca okresu (od poniedziałku do piątku).
 * 3. Każde święto przypadające w okresie rozliczeniowym w innym dniu niż niedziela obniża wymiar czasu pracy o 8 godzin.
 */
export function calculateWorkNorm(year: number, month: number): {
  hours: number;
  workingDays: number;
  shifts12hEquivalent: number;
  holidaysOnWorkingDaysOrSaturday: number;
} {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const holidays = getPolishHolidays(year);

  let workingDaysCount = 0;
  let holidaysDeductibleCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay(); // 0 = Nd, 6 = Sob
    const dateStr = formatDateKey(year, month, day);

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = Boolean(holidays[dateStr]);

    if (!isWeekend) {
      workingDaysCount++;
      if (isHoliday) {
        holidaysDeductibleCount++;
      }
    } else if (dayOfWeek === 6 && isHoliday) {
      // Święto w sobotę w Polsce obniża wymiar czasu pracy o 8h!
      holidaysDeductibleCount++;
    }
  }

  const hours = (workingDaysCount - holidaysDeductibleCount) * 8;
  const shifts12hEquivalent = Math.round(hours / 12);

  return {
    hours,
    workingDays: workingDaysCount - holidaysDeductibleCount,
    shifts12hEquivalent,
    holidaysOnWorkingDaysOrSaturday: holidaysDeductibleCount,
  };
}

/**
 * Format daty do klucza: YYYY-MM-DD
 */
export function formatDateKey(year: number, month: number, day: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/**
 * Liczba dni w miesiącu
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Domyślna propozycja niedziel handlowych w Polsce w danym roku
 */
export function getDefaultTradingSundays(year: number): Record<string, boolean> {
  const trading: Record<string, boolean> = {};
  const holidays = getPolishHolidays(year);
  const easter = getEasterSunday(year);

  // Niedziela bezpośrednio przed Wielkanocą (Niedziela Palmowa)
  const palmSunday = new Date(easter);
  palmSunday.setDate(easter.getDate() - 7);
  trading[formatDateKey(palmSunday.getFullYear(), palmSunday.getMonth(), palmSunday.getDate())] = true;

  // Dwie niedziele przed Bożym Narodzeniem
  const dec24 = new Date(year, 11, 24);
  let sundayCounter = 0;
  for (let d = 23; d >= 1; d--) {
    const testDate = new Date(year, 11, d);
    if (testDate.getDay() === 0) {
      trading[formatDateKey(year, 11, d)] = true;
      sundayCounter++;
      if (sundayCounter >= 2) break;
    }
  }

  // Ostatnie niedziele: stycznia (0), kwietnia (3), czerwca (5), sierpnia (7)
  const specificMonths = [0, 3, 5, 7];
  for (const m of specificMonths) {
    const lastDay = new Date(year, m + 1, 0).getDate();
    for (let d = lastDay; d >= lastDay - 7; d--) {
      const testDate = new Date(year, m, d);
      if (testDate.getDay() === 0) {
        trading[formatDateKey(year, m, d)] = true;
        break;
      }
    }
  }

  return trading;
}
