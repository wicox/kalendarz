import { ParsedShift, Worker, VacationBalance } from '../types/schedule';

export function parseShift(val: string): ParsedShift {
  const trimmed = (val || '').trim();
  if (!trimmed) {
    return { raw: '', code: '', hours: 0 };
  }

  if (trimmed === 'U' || trimmed === '*') {
    return { raw: trimmed, code: trimmed, hours: 0 };
  }

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length >= 3) {
    const code = lines[0].toUpperCase();
    const startTime = lines[1];
    const endTime = lines[2];
    const hours = calculateExactHours(startTime, endTime, code);
    return {
      raw: trimmed,
      code,
      startTime,
      endTime,
      hours,
      isCustom: true,
    };
  }

  const upper = trimmed.toUpperCase();
  if (upper.startsWith('D')) {
    return { raw: trimmed, code: 'D', startTime: '06:00', endTime: '18:00', hours: 12 };
  }
  if (upper.startsWith('N')) {
    return { raw: trimmed, code: 'N', startTime: '18:00', endTime: '06:00', hours: 12 };
  }
  if (upper.startsWith('P')) {
    return { raw: trimmed, code: 'P', startTime: '08:00', endTime: '16:00', hours: 8 };
  }

  return { raw: trimmed, code: upper, hours: 0 };
}

export function calculateExactHours(startTime: string, endTime: string, code?: string): number {
  if (!startTime || !endTime) return 12;
  const [h1, m1] = startTime.split(':').map(Number);
  const [h2, m2] = endTime.split(':').map(Number);

  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) {
    return code === 'P' ? 8 : 12;
  }

  let start = h1 * 60 + m1;
  let end = h2 * 60 + m2;

  // Przejście przez północ (np. 18:00 -> 06:00)
  if (end <= start && code !== 'P') {
    end += 24 * 60;
  }

  const diffMinutes = Math.max(0, end - start);
  return Number((diffMinutes / 60).toFixed(1));
}

export function isShiftEntry(val: string): boolean {
  const trimmed = (val || '').trim().toUpperCase();
  if (!trimmed || trimmed === 'U' || trimmed === '*') {
    return false;
  }
  return true;
}

export function isNightShift(val: string): boolean {
  const parsed = parseShift(val);
  return parsed.code.startsWith('N');
}

export function isDayShift(val: string): boolean {
  const parsed = parseShift(val);
  return parsed.code.startsWith('D');
}

export function formatShiftString(code: string, startTime?: string, endTime?: string): string {
  if (code === 'U' || code === '*' || !code) {
    return code;
  }
  if (startTime && endTime) {
    return `${code}\n${startTime}\n${endTime}`;
  }
  if (code === 'D') return 'D\n06:00\n18:00';
  if (code === 'N') return 'N\n18:00\n06:00';
  if (code === 'P') return 'P\n08:00\n16:00';
  return code;
}

/**
 * Oblicza stan urlopu pracownika w danym roku (z uwzględnieniem urlopu zaległego i bieżącego)
 */
export function getVacationBalance(
  worker: Worker,
  scheduleData: Record<string, string>,
  year: number
): VacationBalance {
  let usedInYear = 0;
  const prefix = `${worker.name}_${year}-`;

  for (const key in scheduleData) {
    if (key.startsWith(prefix)) {
      const val = (scheduleData[key] || '').trim().toUpperCase();
      if (val === 'U') {
        usedInYear++;
      }
    }
  }

  let remOld = Math.max(0, worker.oldVacation || 0);
  let remNew = worker.newVacation !== undefined ? worker.newVacation : 26;

  if (usedInYear <= remOld) {
    remOld -= usedInYear;
  } else {
    const overflow = usedInYear - remOld;
    remOld = 0;
    remNew = Math.max(0, remNew - overflow);
  }

  return {
    total: remOld + remNew,
    oldVac: remOld,
    newVac: remNew,
    usedInYear,
  };
}
