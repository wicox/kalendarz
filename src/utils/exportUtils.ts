import { Worker } from '../types/schedule';
import { formatDateKey, getDaysInMonth, POLISH_DAYS_SHORT } from './calendar';
import { calculateExactHours, parseShift, isShiftEntry } from './shiftParser';

export function exportScheduleToJson(
  workers: Worker[],
  scheduleData: Record<string, string>,
  tradingSundays: Record<string, boolean>,
  year: number,
  month: number
): void {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    year,
    month: month + 1,
    workers,
    scheduleData,
    tradingSundays,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grafik_orlen_${year}_${String(month + 1).padStart(2, '0')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportScheduleToCsv(
  workers: Worker[],
  scheduleData: Record<string, string>,
  year: number,
  month: number
): void {
  const daysInMonth = getDaysInMonth(year, month);

  // Nagłówek CSV
  const headerParts = ['Pracownik', 'Stanowisko', 'Zal. urlop', 'Bież. urlop'];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    headerParts.push(`${day} (${POLISH_DAYS_SHORT[d.getDay()]})`);
  }
  headerParts.push('Godziny D', 'Godziny N', 'Suma Godzin', 'Liczba Zmian');

  const rows: string[][] = [headerParts];

  workers.forEach((w) => {
    let dayHours = 0;
    let nightHours = 0;
    let shiftCount = 0;

    const row = [
      `"${w.name}"`,
      w.isPodjazd ? '"Podjazd"' : '"Obsługa stacji"',
      String(w.oldVacation || 0),
      String(w.newVacation || 26),
    ];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      const val = scheduleData[`${w.name}_${dateKey}`] || '';
      const parsed = parseShift(val);

      if (isShiftEntry(val)) {
        shiftCount++;
        if (parsed.code.startsWith('D')) dayHours += parsed.hours;
        else if (parsed.code.startsWith('N')) nightHours += parsed.hours;
      }

      // Formatowanie komórki
      const cellText = val.replace(/\n/g, ' ');
      row.push(`"${cellText}"`);
    }

    row.push(
      String(dayHours),
      String(nightHours),
      String(dayHours + nightHours),
      String(shiftCount)
    );
    rows.push(row);
  });

  // Wiersz podsumowania dobowego stacji
  const summaryRow = ['"SUMA OBSADY STACJI"', '""', '""', '""'];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    let dH = 0;
    let nH = 0;
    workers.forEach((w) => {
      const val = scheduleData[`${w.name}_${dateKey}`] || '';
      const p = parseShift(val);
      if (p.code.startsWith('D')) dH += p.hours;
      if (p.code.startsWith('N')) nH += p.hours;
    });
    summaryRow.push(`"${dH}h D / ${nH}h N"`);
  }
  summaryRow.push('""', '""', '""', '""');
  rows.push(summaryRow);

  const csvContent = '\uFEFF' + rows.map((r) => r.join(';')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grafik_orlen_${year}_${String(month + 1).padStart(2, '0')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
