import { Worker, ScheduleConflict } from '../types/schedule';
import { formatDateKey, getDaysInMonth, getPolishHolidays } from './calendar';
import { isShiftEntry, isNightShift, isDayShift, parseShift } from './shiftParser';
import { isValidExperiencePair } from './autoFillSolver';

export function auditSchedule(
  workers: Worker[],
  year: number,
  month: number,
  scheduleData: Record<string, string>
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const daysInMonth = getDaysInMonth(year, month);
  const mainWorkers = workers.filter((w) => !w.isPodjazd);

  // 1. Sprawdzanie dobowej obsady stacji (24h D + 24h N = 48h)
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateKey(year, month, day);
    let dayCount = 0;
    let nightCount = 0;
    const dayWorkers: Worker[] = [];
    const nightWorkers: Worker[] = [];

    mainWorkers.forEach((w) => {
      const val = (scheduleData[`${w.name}_${dateStr}`] || '').trim().toUpperCase();
      if (val.startsWith('D')) {
        dayCount++;
        dayWorkers.push(w);
      } else if (val.startsWith('N')) {
        nightCount++;
        nightWorkers.push(w);
      }
    });

    if (dayCount < 2) {
      conflicts.push({
        id: `understaffed-d-${day}`,
        day,
        dateStr,
        severity: 'error',
        title: `Niedobór na zmianie dziennej (${dayCount}/2)`,
        description: `W dniu ${day} na zmianie dziennej (D) zaplanowano tylko ${dayCount} pracownika zamiast 2.`,
        shiftType: 'D',
      });
    } else if (dayCount > 2) {
      conflicts.push({
        id: `overstaffed-d-${day}`,
        day,
        dateStr,
        severity: 'warning',
        title: `Nadmiar na zmianie dziennej (${dayCount}/2)`,
        description: `W dniu ${day} na zmianie dziennej zaplanowano ${dayCount} pracowników (o ${dayCount - 2} za dużo).`,
        shiftType: 'D',
      });
    }

    if (nightCount < 2) {
      conflicts.push({
        id: `understaffed-n-${day}`,
        day,
        dateStr,
        severity: 'error',
        title: `Niedobór na zmianie nocnej (${nightCount}/2)`,
        description: `W dniu ${day} na zmianie nocnej (N) zaplanowano tylko ${nightCount} pracownika zamiast 2.`,
        shiftType: 'N',
      });
    } else if (nightCount > 2) {
      conflicts.push({
        id: `overstaffed-n-${day}`,
        day,
        dateStr,
        severity: 'warning',
        title: `Nadmiar na zmianie nocnej (${nightCount}/2)`,
        description: `W dniu ${day} na zmianie nocnej zaplanowano ${nightCount} pracowników (o ${nightCount - 2} za dużo).`,
        shiftType: 'N',
      });
    }

    // 2. Parowanie doświadczenia na zmianach
    if (dayWorkers.length === 2 && !isValidExperiencePair(dayWorkers[0], dayWorkers[1])) {
      conflicts.push({
        id: `pair-d-${day}`,
        day,
        dateStr,
        severity: 'warning',
        title: `Nieoptymalna para na zmianie dziennej`,
        description: `W dniu ${day} na zmianie dziennej pracują ${dayWorkers[0].name} (dośw. ${dayWorkers[0].experience}) oraz ${dayWorkers[1].name} (dośw. ${dayWorkers[1].experience}). Zmiana wymaga obecności pracownika z wyższym doświadczeniem.`,
        shiftType: 'D',
      });
    }

    if (nightWorkers.length === 2 && !isValidExperiencePair(nightWorkers[0], nightWorkers[1])) {
      conflicts.push({
        id: `pair-n-${day}`,
        day,
        dateStr,
        severity: 'warning',
        title: `Nieoptymalna para na zmianie nocnej`,
        description: `W dniu ${day} na zmianie nocnej pracują ${nightWorkers[0].name} (dośw. ${nightWorkers[0].experience}) oraz ${nightWorkers[1].name} (dośw. ${nightWorkers[1].experience}). Brak wymaganego wsparcia seniora w nocy!`,
        shiftType: 'N',
      });
    }
  }

  // 3. Sprawdzanie odpoczynku dobowego pracowników (Kodeks Pracy)
  mainWorkers.forEach((w) => {
    let consecutiveDays = 0;
    let workedSundays = 0;
    let totalSundays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateKey(year, month, day);
      const val = (scheduleData[`${w.name}_${dateStr}`] || '').trim().toUpperCase();
      const hasWorkingShift = isShiftEntry(val);

      const dObj = new Date(year, month, day);
      if (dObj.getDay() === 0) {
        totalSundays++;
        if (hasWorkingShift) workedSundays++;
      }

      // Ciągłość pracy
      if (hasWorkingShift) {
        consecutiveDays++;
        if (consecutiveDays > 3) {
          conflicts.push({
            id: `consecutive-${w.name}-${day}`,
            day,
            dateStr,
            severity: 'warning',
            title: `Ciąg ponad 3 zmian z rzędu`,
            description: `${w.name} pracuje już ${consecutiveDays} dni pod rząd (zmiany 12h). Zalecana przerwa regeneracyjna.`,
            workerName: w.name,
          });
        }
      } else {
        consecutiveDays = 0;
      }

      // Naruszenie odpoczynku dobowego: Noc w dniu T -> Dzień w dniu T+1
      if (day > 1) {
        const prevVal = (scheduleData[`${w.name}_${formatDateKey(year, month, day - 1)}`] || '')
          .trim()
          .toUpperCase();
        if (prevVal.startsWith('N') && val.startsWith('D')) {
          conflicts.push({
            id: `rest-${w.name}-${day}`,
            day,
            dateStr,
            severity: 'error',
            title: `Naruszenie odpoczynku dobowego (< 11h)`,
            description: `${w.name} kończy nockę o 06:00 rano w dniu ${day} i natychmiast zaczyna dniówkę o 06:00! Złamanie art. 132 Kodeksu Pracy.`,
            workerName: w.name,
          });
        }
      }
    }

    // Sprawdzenie czy pracownik ma chociaż 1 wolną niedzielę w miesiącu
    if (totalSundays > 0 && workedSundays === totalSundays) {
      conflicts.push({
        id: `sundays-${w.name}`,
        day: 1,
        dateStr: formatDateKey(year, month, 1),
        severity: 'warning',
        title: `Brak wolnej niedzieli w miesiącu`,
        description: `${w.name} ma zaplanowane zmiany w każdą niedzielę miesiąca (${workedSundays}/${totalSundays}). Zgodnie z art. 151[10] k.p. pracownik powinien mieć zapewnioną co najmniej 1 wolną niedzielę.`,
        workerName: w.name,
      });
    }

    // Sprawdzenie zgodności sumy zmian z normą pracownika
    const assignedCount = Array.from({ length: daysInMonth }).filter((_, i) =>
      isShiftEntry(scheduleData[`${w.name}_${formatDateKey(year, month, i + 1)}`] || '')
    ).length;

    if (w.maxShifts !== undefined && assignedCount !== w.maxShifts) {
      conflicts.push({
        id: `quota-${w.name}`,
        day: 1,
        dateStr: formatDateKey(year, month, 1),
        severity: 'warning',
        title: `Niezgodność liczby zmian z celem`,
        description: `${w.name}: przypisano ${assignedCount} zmian, podczas gdy docelowo ustawiono ${w.maxShifts} zmian (różnica: ${
          assignedCount - w.maxShifts > 0 ? '+' : ''
        }${assignedCount - w.maxShifts}).`,
        workerName: w.name,
      });
    }
  });

  return conflicts;
}
