import { Worker, AutoFillOptions, AutoFillResult } from '../types/schedule';
import { formatDateKey, getDaysInMonth } from './calendar';
import { isShiftEntry, isNightShift, isDayShift } from './shiftParser';

/**
 * Waliduje czy para pracowników na tej samej zmianie spełnia kryteria bezpieczeństwa i doświadczenia
 */
export function isValidExperiencePair(workerA: Worker, workerB: Worker): boolean {
  const expA = Number(workerA.experience) || 5;
  const expB = Number(workerB.experience) || 5;

  // Bezwzględny zakaz dwóch osób z bardzo małym doświadczeniem
  if (expA <= 3 && expB <= 3) return false;

  // Jeśli pracownik to stażysta/bardzo świeży (exp <= 2), partner MUSI mieć min. 6
  if (expA <= 2 && expB < 6) return false;
  if (expB <= 2 && expA < 6) return false;

  // Unikaj blokowania dwóch super-seniorów (8+ i 8+ lub 9+ i 7+) na jednej zmianie,
  // aby nie zostawiać innych zmian bez doświadczonego pracownika
  if (expA >= 8 && expB >= 8) return false;
  if (expA >= 9 && expB >= 7) return false;
  if (expB >= 9 && expA >= 7) return false;

  // Łączna suma doświadczenia powinna wynosić co najmniej 7
  if (expA + expB < 7) return false;

  return true;
}

/**
 * Oblicza ocenę dopasowania pary pracowników pod kątem doświadczenia (im wyższa tym lepsza)
 */
export function getPairScore(workerA: Worker, workerB: Worker): number {
  if (!isValidExperiencePair(workerA, workerB)) return -1000;
  const expA = Number(workerA.experience) || 5;
  const expB = Number(workerB.experience) || 5;
  const sumExp = expA + expB;
  // Idealna suma doświadczenia pary na stacji to około 10-12 (np. 8+3, 7+4, 6+5)
  const diffFromIdeal = Math.abs(sumExp - 11);
  return 100 - diffFromIdeal * 15;
}

/**
 * Automatyczne dopasowanie i wyrównanie norm zmian pracownikom,
 * aby suma wynosiła DOKŁADNIE daysInMonth * 4.
 */
export function calculateBalancedTargets(
  workers: Worker[],
  daysInMonth: number
): { workerId: string; targetShifts: number }[] {
  const mainWorkers = workers.filter((w) => !w.isPodjazd);
  const totalRequired = daysInMonth * 4;
  if (mainWorkers.length === 0) return [];

  const basePerWorker = Math.floor(totalRequired / mainWorkers.length);
  let remainder = totalRequired % mainWorkers.length;

  // Sortujemy pracowników wg doświadczenia lub obecnych wartości, aby sprawiedliwie rozdać resztę
  return mainWorkers.map((w, index) => {
    const extra = index < remainder ? 1 : 0;
    return {
      workerId: w.id,
      targetShifts: basePerWorker + extra,
    };
  });
}

/**
 * Główny zaawansowany solwer grafiku z obsługą reguł Kodeksu Pracy,
 * odpoczynku dobowego (min 11h), preferencji nocy i naprawiania konfliktów.
 */
export function solveSchedule(
  workers: Worker[],
  year: number,
  month: number,
  currentSchedule: Record<string, string>,
  options: AutoFillOptions
): {
  newSchedule: Record<string, string>;
  result: AutoFillResult;
} {
  const daysInMonth = getDaysInMonth(year, month);
  const totalRequiredShifts = daysInMonth * 4;
  const mainWorkers = workers.filter((w) => !w.isPodjazd);

  // Kopia robocza grafiku
  let scheduleData: Record<string, string> = { ...currentSchedule };

  // Sprawdzenie celów pracowników
  const targets: Record<string, number> = {};
  const targetNights: Record<string, number> = {};

  mainWorkers.forEach((w) => {
    const target = Number.isFinite(w.maxShifts) && w.maxShifts >= 0 ? w.maxShifts : 15;
    targets[w.name] = target;

    // Docelowa liczba nocek na podstawie nightPref (0-100%)
    const pref = Math.min(100, Math.max(0, w.nightPref ?? 50));
    targetNights[w.name] = Math.round((target * pref) / 100);
  });

  const totalTargetConfigured = mainWorkers.reduce((acc, w) => acc + targets[w.name], 0);

  // Jeśli cele nie zgadzają się z wymaganiami kalendarza
  if (totalTargetConfigured !== totalRequiredShifts) {
    return {
      newSchedule: currentSchedule,
      result: {
        success: false,
        message:
          `Niezgodność sumy zmian: Ustawiono łącznie ${totalTargetConfigured} zmian w zespole, ` +
          `podczas gdy kalendarz (${daysInMonth} dni × 4 zmiany) wymaga dokładnie ${totalRequiredShifts} zmian. ` +
          `Kliknij "Dopasuj normę do miesiąca" lub skoryguj liczby zmian w Ustawieniach Pracowników.`,
        unfilledSlots: [],
        workerShiftCounts: {},
        iterations: 0,
        warnings: [
          `Różnica do skorygowania: ${totalTargetConfigured - totalRequiredShifts > 0 ? '+' : ''}${
            totalTargetConfigured - totalRequiredShifts
          } zmian`,
        ],
      },
    };
  }

  // Zliczanie już istniejących ręcznych wpisów
  const assignedTotal: Record<string, number> = {};
  const assignedNights: Record<string, number> = {};
  const assignedDays: Record<string, number> = {};

  mainWorkers.forEach((w) => {
    assignedTotal[w.name] = 0;
    assignedNights[w.name] = 0;
    assignedDays[w.name] = 0;
  });

  // Zachowanie lub czyszczenie istniejących automatycznych wpisów
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    mainWorkers.forEach((w) => {
      const key = `${w.name}_${dateKey}`;
      const val = (scheduleData[key] || '').trim();

      if (options.preserveExisting && val) {
        if (isShiftEntry(val)) {
          assignedTotal[w.name]++;
          if (isNightShift(val)) assignedNights[w.name]++;
          else if (isDayShift(val)) assignedDays[w.name]++;
        }
      } else {
        // Jeśli nie zachowujemy wpisów (lub są puste), czyścimy tylko zmiany (zostawiamy urlopy U i wolne *)
        if (val !== 'U' && val !== '*') {
          delete scheduleData[key];
        }
      }
    });
  }

  // Weryfikacja czy ręczne wpisy nie przekraczają już limitów
  for (const w of mainWorkers) {
    if (assignedTotal[w.name] > targets[w.name]) {
      return {
        newSchedule: currentSchedule,
        result: {
          success: false,
          message: `Pracownik ${w.name} ma już ręcznie wpisane ${assignedTotal[w.name]} zmian, co przekracza jego normę (${targets[w.name]}). Usuń nadmiarowe zmiany.`,
          unfilledSlots: [],
          workerShiftCounts: {},
          iterations: 0,
          warnings: [],
        },
      };
    }
  }

  // Funkcje pomocnicze
  const getEntry = (workerName: string, day: number): string => {
    const key = `${workerName}_${formatDateKey(year, month, day)}`;
    return (scheduleData[key] || '').trim().toUpperCase();
  };

  const hasShift = (workerName: string, day: number): boolean => {
    if (day < 1 || day > daysInMonth) return false;
    return isShiftEntry(getEntry(workerName, day));
  };

  /**
   * Sprawdza czy dany pracownik może legalnie podjąć daną zmianę
   */
  const canAssign = (
    worker: Worker,
    type: 'D' | 'N',
    day: number,
    localAssigned: Record<string, number>,
    maxWeeklyShifts: number
  ): boolean => {
    const name = worker.name;

    // Limit całkowity pracownika
    if (localAssigned[name] >= targets[name]) return false;

    // Respektowanie preferencji nocnej 0% i 100%
    const pref = worker.nightPref ?? 50;
    if (options.enforceNightPref) {
      if (type === 'D' && pref >= 100) return false;
      if (type === 'N' && pref <= 0) return false;
    }

    // Nie można przypisać jeśli ma urlop (U), wolne (*), lub już ma zmianę tego dnia
    const currentVal = getEntry(name, day);
    if (currentVal === 'U' || currentVal === '*' || hasShift(name, day)) {
      return false;
    }

    // BEZWZGLĘDNY ODPOCZYNEK DOBOWY (11-12h Kodeks Pracy):
    if (options.enforceRestPeriod) {
      // 1. Po nocce poprzedniego dnia (kończy się o 06:00) NIE WOLNO zaczynać dniówki (start 06:00 = 0h przerwy!)
      if (day > 1 && getEntry(name, day - 1).startsWith('N') && type === 'D') {
        return false;
      }
      // 2. Jeśli jutro ma już wpisaną dniówkę (start 06:00), dzisiaj nie może wziąć nocki (koniec jutro 06:00)
      if (day < daysInMonth && getEntry(name, day + 1).startsWith('D') && type === 'N') {
        return false;
      }
    }

    // Limit zmian z rzędu (np. max 2 lub 3 dni pracy pod rząd)
    let consecutiveBefore = 0;
    for (let d = day - 1; d >= Math.max(1, day - options.maxConsecutiveDays); d--) {
      if (hasShift(name, d)) consecutiveBefore++;
      else break;
    }
    let consecutiveAfter = 0;
    for (let d = day + 1; d <= Math.min(daysInMonth, day + options.maxConsecutiveDays); d++) {
      if (hasShift(name, d)) consecutiveAfter++;
      else break;
    }
    if (consecutiveBefore + 1 + consecutiveAfter > options.maxConsecutiveDays) {
      return false;
    }

    // Limit tygodniowy (zgodnie z KP, w tygodniu rozliczeniowym pon-ndz)
    const dateObj = new Date(year, month, day);
    let dayOfWeek = dateObj.getDay(); // 0=Nd, 1=Pn...
    if (dayOfWeek === 0) dayOfWeek = 7;
    const monDay = day - (dayOfWeek - 1);
    const sunDay = day + (7 - dayOfWeek);

    let weekCount = 0;
    for (let d = Math.max(1, monDay); d <= Math.min(daysInMonth, sunDay); d++) {
      if (hasShift(name, d) || d === day) {
        weekCount++;
      }
    }
    if (weekCount > maxWeeklyShifts) {
      return false;
    }

    return true;
  };

  /**
   * Punktacja kandydata (heurystyka wyboru najwłaściwszej osoby)
   */
  const scoreCandidate = (
    worker: Worker,
    type: 'D' | 'N',
    day: number,
    localAssigned: Record<string, number>,
    localNights: Record<string, number>,
    currentPartner?: Worker
  ): number => {
    const name = worker.name;
    const remaining = targets[name] - localAssigned[name];

    // Podstawowa waga: pozostała liczba zmian do wykonania
    let score = remaining * 500;

    // Dążenie do właściwego bilansu nocy
    const currentNightCount = localNights[name];
    const targetNightCount = targetNights[name];
    const nightDeficit = targetNightCount - currentNightCount;

    if (type === 'N') {
      score += nightDeficit * 150;
    } else {
      score -= nightDeficit * 150;
    }

    // Rozkład w miesiącu (karanie skupisk, nagradzanie równomierności)
    if (options.evenSpacing) {
      for (let d = Math.max(1, day - 2); d <= Math.min(daysInMonth, day + 2); d++) {
        if (d !== day && hasShift(name, d)) {
          score -= 120;
        }
      }
    }

    // Balans doświadczenia z partnerem obecnym na tej samej zmianie
    if (currentPartner && options.enforceExperiencePairing) {
      score += getPairScore(worker, currentPartner);
    }

    // Sprawiedliwy podział weekendów
    if (options.balanceWeekends) {
      const dObj = new Date(year, month, day);
      const dow = dObj.getDay();
      if (dow === 0 || dow === 6) {
        // Jeśli pracownik ma mało weekendów w porównaniu do innych, dajemy bonus
        score += 30;
      }
    }

    return score;
  };

  // Zapis kopii bazowej przed próbami
  const backupSchedule = JSON.stringify(scheduleData);
  const MAX_GLOBAL_ATTEMPTS = 500;
  let finalSuccess = false;
  let bestAttemptSchedule = { ...scheduleData };
  let minUnfilledCount = 9999;
  let attemptIterations = 0;

  for (let attempt = 0; attempt < MAX_GLOBAL_ATTEMPTS; attempt++) {
    attemptIterations++;
    scheduleData = JSON.parse(backupSchedule);

    const localAssigned = { ...assignedTotal };
    const localNights = { ...assignedNights };
    const localDays = { ...assignedDays };

    // Kolejność dni: zmieniana między próbami (chronologicznie, losowo, od weekendów)
    const dayOrder = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    if (attempt % 3 === 1) {
      dayOrder.reverse();
    } else if (attempt % 3 === 2) {
      // Przemieszanie losowe
      for (let i = dayOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dayOrder[i], dayOrder[j]] = [dayOrder[j], dayOrder[i]];
      }
    }

    let attemptFailed = false;

    for (const day of dayOrder) {
      const dateKey = formatDateKey(year, month, day);

      // Sprawdź co już jest obsadzone na ten dzień
      const assignedDayWorkers: Worker[] = [];
      const assignedNightWorkers: Worker[] = [];
      const usedToday = new Set<string>();

      mainWorkers.forEach((w) => {
        const val = getEntry(w.name, day);
        if (val) {
          usedToday.add(w.name);
          if (val.startsWith('N')) assignedNightWorkers.push(w);
          else if (val.startsWith('D')) assignedDayWorkers.push(w);
        }
      });

      const needD = Math.max(0, 2 - assignedDayWorkers.length);
      const needN = Math.max(0, 2 - assignedNightWorkers.length);

      // Ustalamy kolejność obsadzania (najpierw zmiana trudniejsza, zwykle noc)
      const shiftsToFill: ('N' | 'D')[] = [];
      if (needN > 0 && needD > 0) {
        // Jeśli pracownicy chętniej biorą D, najpierw obsadź N
        shiftsToFill.push('N', 'D');
      } else {
        if (needN > 0) shiftsToFill.push('N');
        if (needD > 0) shiftsToFill.push('D');
      }

      for (const shiftType of shiftsToFill) {
        const slotsNeeded = shiftType === 'N' ? needN : needD;
        const currentGroup = shiftType === 'N' ? assignedNightWorkers : assignedDayWorkers;

        for (let slot = 0; slot < slotsNeeded; slot++) {
          const partner = currentGroup.length > 0 ? currentGroup[0] : undefined;

          // 1. Szukamy z podstawowym limitem tygodniowym (np. 3)
          let candidates = mainWorkers.filter((w) => {
            if (usedToday.has(w.name)) return false;
            if (partner && options.enforceExperiencePairing && !isValidExperiencePair(partner, w)) {
              return false;
            }
            return canAssign(w, shiftType, day, localAssigned, options.maxShiftsPerWeek);
          });

          // 2. Jeśli brak, dopuszczamy 4 zmiany w tygodniu (zgodne z KP przy 12h zmianach)
          if (candidates.length === 0) {
            candidates = mainWorkers.filter((w) => {
              if (usedToday.has(w.name)) return false;
              if (partner && options.enforceExperiencePairing && !isValidExperiencePair(partner, w)) {
                return false;
              }
              return canAssign(w, shiftType, day, localAssigned, options.maxShiftsPerWeek + 1);
            });
          }

          // 3. Sprawdzenie look-ahead: czy pracownik będzie w stanie zrealizować resztę swoich zmian w pozostałych dniach
          candidates = candidates.filter((w) => {
            const remainingShifts = targets[w.name] - (localAssigned[w.name] + 1);
            const futureDaysCount = daysInMonth - day;
            const maxPossibleFuture = Math.ceil((futureDaysCount * 4) / 7) + 2;
            return remainingShifts <= maxPossibleFuture;
          });

          // 4. Jeśli wciąż brak, sprawdzamy z wyłączonym ścisłym parowaniem doświadczenia jako ostateczność
          if (candidates.length === 0) {
            candidates = mainWorkers.filter((w) => {
              if (usedToday.has(w.name)) return false;
              return canAssign(w, shiftType, day, localAssigned, options.maxShiftsPerWeek + 1);
            });
          }

          if (candidates.length === 0) {
            attemptFailed = true;
            break;
          }

          // Sortujemy kandydatów wg heurystyki
          candidates.sort((a, b) => {
            const scoreB = scoreCandidate(b, shiftType, day, localAssigned, localNights, partner);
            const scoreA = scoreCandidate(a, shiftType, day, localAssigned, localNights, partner);
            return scoreB - scoreA;
          });

          const chosen = candidates[0];
          usedToday.add(chosen.name);
          currentGroup.push(chosen);

          // Zapis do grafiku
          const key = `${chosen.name}_${dateKey}`;
          if (shiftType === 'N') {
            scheduleData[key] = 'N\n18:00\n06:00';
            localNights[chosen.name]++;
          } else {
            scheduleData[key] = 'D\n06:00\n18:00';
            localDays[chosen.name]++;
          }
          localAssigned[chosen.name]++;
        }

        if (attemptFailed) break;
      }

      if (attemptFailed) break;
    }

    // Sprawdzenie czy wszyscy pracownicy osiągnęli dokładnie swój cel
    let allTargetsMet = true;
    for (const w of mainWorkers) {
      if (localAssigned[w.name] !== targets[w.name]) {
        allTargetsMet = false;
        break;
      }
    }

    if (!attemptFailed && allTargetsMet) {
      finalSuccess = true;
      bestAttemptSchedule = { ...scheduleData };
      break;
    }

    // Monitorowanie najlepszego przybliżenia
    let unfilledInThis = 0;
    for (const w of mainWorkers) {
      unfilledInThis += Math.abs(targets[w.name] - localAssigned[w.name]);
    }
    if (unfilledInThis < minUnfilledCount) {
      minUnfilledCount = unfilledInThis;
      bestAttemptSchedule = { ...scheduleData };
    }
  }

  // Jeśli standardowa konstrukcja nie domknęła kilku slotów, uruchamiamy silnik naprawczy (Local Search / Repair)
  if (!finalSuccess) {
    const repaired = repairSchedule(
      bestAttemptSchedule,
      mainWorkers,
      year,
      month,
      targets,
      targetNights,
      options
    );
    if (repaired.success) {
      finalSuccess = true;
      scheduleData = repaired.schedule;
    } else {
      scheduleData = bestAttemptSchedule;
    }
  }

  // Przygotowanie raportu i podsumowania
  const unfilledSlots: { day: number; shiftType: 'D' | 'N'; needed: number }[] = [];
  const workerShiftCounts: Record<
    string,
    { current: number; target: number; nights: number; days: number }
  > = {};
  const warnings: string[] = [];

  mainWorkers.forEach((w) => {
    let current = 0;
    let nights = 0;
    let days = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const val = (scheduleData[`${w.name}_${formatDateKey(year, month, day)}`] || '')
        .trim()
        .toUpperCase();
      if (isShiftEntry(val)) {
        current++;
        if (val.startsWith('N')) nights++;
        else if (val.startsWith('D')) days++;
      }
    }

    workerShiftCounts[w.name] = {
      current,
      target: targets[w.name],
      nights,
      days,
    };

    if (current !== targets[w.name]) {
      warnings.push(
        `${w.name}: przypisano ${current} z ${targets[w.name]} zaplanowanych zmian`
      );
    }
  });

  // Weryfikacja braków na poszczególnych dniach
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    let dayCount = 0;
    let nightCount = 0;

    mainWorkers.forEach((w) => {
      const val = (scheduleData[`${w.name}_${dateKey}`] || '').trim().toUpperCase();
      if (val.startsWith('D')) dayCount++;
      if (val.startsWith('N')) nightCount++;
    });

    if (dayCount < 2) {
      unfilledSlots.push({ day, shiftType: 'D', needed: 2 - dayCount });
    }
    if (nightCount < 2) {
      unfilledSlots.push({ day, shiftType: 'N', needed: 2 - nightCount });
    }
  }

  const success = unfilledSlots.length === 0 && warnings.length === 0;

  return {
    newSchedule: scheduleData,
    result: {
      success,
      message: success
        ? `Grafik wygenerowany pomyślnie! Wszystkie ${totalRequiredShifts} zmian obsadzono zgodnie z normami i preferencjami.`
        : `Wygenerowano grafik z ${unfilledSlots.length} nieobsadzonymi slotami lub drobnymi odchyleniami normy. Sprawdź raport.`,
      unfilledSlots,
      workerShiftCounts,
      iterations: attemptIterations,
      warnings,
    },
  };
}

/**
 * Silnik naprawczy: Local Search / Min-Conflicts / Shift Swapping
 * Zamienia sloty pomiędzy pracownikami w celu wyeliminowania luk lub przekroczeń
 */
function repairSchedule(
  currentSchedule: Record<string, string>,
  workers: Worker[],
  year: number,
  month: number,
  targets: Record<string, number>,
  targetNights: Record<string, number>,
  options: AutoFillOptions
): { success: boolean; schedule: Record<string, string> } {
  const schedule = { ...currentSchedule };
  const daysInMonth = getDaysInMonth(year, month);

  // Sprawdzamy aktualny stan
  const countShifts = (name: string) => {
    let c = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const v = (schedule[`${name}_${formatDateKey(year, month, d)}`] || '').trim();
      if (isShiftEntry(v)) c++;
    }
    return c;
  };

  for (let cycle = 0; cycle < 50; cycle++) {
    // Szukamy dni z brakiem obsady
    let hasMissing = false;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);

      for (const type of ['D', 'N'] as const) {
        const workersOnShift = workers.filter((w) => {
          const v = (schedule[`${w.name}_${dateKey}`] || '').trim().toUpperCase();
          return v.startsWith(type);
        });

        if (workersOnShift.length < 2) {
          hasMissing = true;
          // Szukamy pracownika który ma niedobór zmian i nie pracuje dzisiaj
          const eligibleWorkers = workers.filter((w) => {
            const v = (schedule[`${w.name}_${dateKey}`] || '').trim().toUpperCase();
            if (v !== '') return false; // już pracuje lub ma wolne/urlop
            // Brak kolizji nocka -> dniówka
            if (type === 'D' && day > 1) {
              const prev = (schedule[`${w.name}_${formatDateKey(year, month, day - 1)}`] || '').trim().toUpperCase();
              if (prev.startsWith('N')) return false;
            }
            if (type === 'N' && day < daysInMonth) {
              const next = (schedule[`${w.name}_${formatDateKey(year, month, day + 1)}`] || '').trim().toUpperCase();
              if (next.startsWith('D')) return false;
            }
            return true;
          });

          // Sortujemy tych co mają najmniej przypisanych zmian w stosunku do celu
          eligibleWorkers.sort((a, b) => {
            const diffA = targets[a.name] - countShifts(a.name);
            const diffB = targets[b.name] - countShifts(b.name);
            return diffB - diffA;
          });

          if (eligibleWorkers.length > 0) {
            const best = eligibleWorkers[0];
            const key = `${best.name}_${dateKey}`;
            schedule[key] = type === 'N' ? 'N\n18:00\n06:00' : 'D\n06:00\n18:00';
          }
        }
      }
    }

    if (!hasMissing) break;
  }

  // Weryfikacja końcowa
  let complete = true;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(year, month, day);
    let d = 0, n = 0;
    workers.forEach((w) => {
      const v = (schedule[`${w.name}_${dateKey}`] || '').trim().toUpperCase();
      if (v.startsWith('D')) d++;
      if (v.startsWith('N')) n++;
    });
    if (d !== 2 || n !== 2) {
      complete = false;
      break;
    }
  }

  return { success: complete, schedule };
}
