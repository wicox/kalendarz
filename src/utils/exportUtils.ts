import { Worker } from '../types/schedule';
import { formatDateKey, getDaysInMonth, POLISH_DAYS_SHORT, calculateWorkNorm } from './calendar';
import { parseShift, isShiftEntry } from './shiftParser';

export function exportScheduleToJson(
  workers: Worker[],
  scheduleData: Record<string, string>,
  tradingSundays: Record<string, boolean>,
  year: number,
  month: number
): void {
  const data = {
    version: '2.1',
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

/**
 * Eksport do bogatego pliku Excel (.xls / XML Spreadsheet) z kolorami, stylami i pełnymi formułami
 */
export function exportScheduleToExcelHtml(
  workers: Worker[],
  scheduleData: Record<string, string>,
  year: number,
  month: number,
  tradingSundays: Record<string, boolean>
): void {
  const daysInMonth = getDaysInMonth(year, month);
  const norm = calculateWorkNorm(year, month);
  const monthName = new Date(year, month).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }).toUpperCase();

  let tableHtml = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
      table { border-collapse: collapse; }
      th, td { border: 1px solid #B0BEC5; padding: 4px; text-align: center; vertical-align: middle; }
      .header-brand { background-color: #E30613; color: #FFFFFF; font-weight: bold; font-size: 16pt; }
      .header-title { background-color: #2C3E50; color: #FFFFFF; font-weight: bold; font-size: 12pt; }
      .header-norm { background-color: #ECEFF1; color: #37474F; font-size: 10pt; font-weight: bold; }
      .col-header { background-color: #263238; color: #FFFFFF; font-weight: bold; font-size: 10pt; }
      .col-weekend { background-color: #D35400; color: #FFFFFF; font-weight: bold; }
      .col-holiday { background-color: #C0392B; color: #FFFFFF; font-weight: bold; }
      .col-trading { background-color: #8E44AD; color: #FFFFFF; font-weight: bold; }
      .worker-name { text-align: left; font-weight: bold; background-color: #F8F9FA; }
      .shift-d { background-color: #EBF5FB; color: #1B4F72; font-weight: bold; }
      .shift-n { background-color: #1C2833; color: #F7DC6F; font-weight: bold; }
      .shift-p { background-color: #E8F8F5; color: #117A65; font-weight: bold; }
      .shift-u { background-color: #27AE60; color: #FFFFFF; font-weight: bold; }
      .shift-w { background-color: #FEF9E7; color: #7D6608; font-weight: bold; }
      .sum-exact { background-color: #2ECC71; color: #FFFFFF; font-weight: bold; }
      .sum-rounded { background-color: #2980B9; color: #FFFFFF; font-weight: bold; }
      .sum-bad { background-color: #FADBD8; color: #78281F; font-weight: bold; }
      .sum-station-ok { background-color: #27AE60; color: #FFFFFF; font-weight: bold; font-size: 11pt; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="${daysInMonth + 6}" class="header-brand">ORLEN - GRAFIK PRACY 24/7</td>
      </tr>
      <tr>
        <td colspan="${daysInMonth + 6}" class="header-title">${monthName}</td>
      </tr>
      <tr>
        <td colspan="${daysInMonth + 6}" class="header-norm">
          Norma czasu pracy: ${norm.hours}h | Norma na pracownika: ${norm.requiredShiftsCeil} zmian (${norm.shiftsRaw} zm. +${norm.overtimeHours}h nadgodz.) | Suma obsady stacji: ${norm.totalStationHours}h (${norm.totalStationShifts} zmian)
        </td>
      </tr>
      <tr>
        <th class="col-header" style="width: 140px;">Pracownik</th>
        <th class="col-header" style="width: 60px;">Umowa</th>
        <th class="col-header" style="width: 60px;">Urlop</th>
  `;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const dateStr = formatDateKey(year, month, day);
    const isTrading = Boolean(tradingSundays[dateStr]);

    let thClass = 'col-header';
    if (isTrading) thClass = 'col-trading';
    else if (dow === 0) thClass = 'col-weekend';
    else if (dow === 6) thClass = 'col-weekend';

    tableHtml += `<th class="${thClass}">${day}<br><small>${POLISH_DAYS_SHORT[dow]}</small></th>`;
  }

  tableHtml += `
        <th class="col-header">D (h)</th>
        <th class="col-header">N (h)</th>
        <th class="col-header">Suma h</th>
        <th class="col-header">Zmiany</th>
      </tr>
  `;

  const stationWorkers = workers.filter((w) => !w.isPodjazd);
  let totalMainHours = 0;
  let totalMainShifts = 0;

  workers.forEach((worker) => {
    const isUoP = worker.contractType === 'uop';
    let dH = 0, nH = 0, sc = 0;

    tableHtml += `<tr>
      <td class="worker-name">${worker.name}</td>
      <td>${isUoP ? 'UoP' : 'UZ'}${worker.isPodjazd ? ' (Podjazd)' : ''}</td>
      <td>${worker.oldVacation + worker.newVacation}d</td>
    `;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateKey(year, month, day);
      const val = (scheduleData[`${worker.name}_${dateStr}`] || '').trim();
      const p = parseShift(val);

      let cellClass = '';
      if (p.code === 'D') cellClass = 'shift-d';
      else if (p.code === 'N') cellClass = 'shift-n';
      else if (p.code === 'P') cellClass = 'shift-p';
      else if (p.code === 'U') cellClass = 'shift-u';
      else if (p.code === '*') cellClass = 'shift-w';

      if (isShiftEntry(val)) {
        sc++;
        if (p.code.startsWith('D')) dH += p.hours;
        if (p.code.startsWith('N')) nH += p.hours;
      }

      let cellText = p.code;
      if (p.startTime && p.endTime) {
        cellText += ` (${p.startTime}-${p.endTime})`;
      }

      tableHtml += `<td class="${cellClass}">${cellText}</td>`;
    }

    const totalHours = dH + nH;
    if (!worker.isPodjazd) {
      totalMainHours += totalHours;
      totalMainShifts += sc;
    }

    let sumClass = '';
    if (isUoP && !worker.isPodjazd) {
      if (totalHours === norm.hours) sumClass = 'sum-exact';
      else if (totalHours === norm.requiredShiftsCeil * 12) sumClass = 'sum-rounded';
      else if (totalHours < norm.hours) sumClass = 'sum-bad';
    }

    tableHtml += `
      <td>${dH}</td>
      <td>${nH}</td>
      <td class="${sumClass}"><strong>${totalHours}</strong></td>
      <td><strong>${sc}</strong></td>
    </tr>`;
  });

  // Wiersz podsumowania dobowego stacji (BEZ PODJAZDU)
  tableHtml += `<tr>
    <td class="col-header" colspan="3"><strong>Suma stacji (D/N)</strong></td>
  `;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateKey(year, month, day);
    let dayHoursTotal = 0;
    let nightHoursTotal = 0;

    stationWorkers.forEach((w) => {
      const p = parseShift(scheduleData[`${w.name}_${dateStr}`] || '');
      if (p.code.startsWith('D')) dayHoursTotal += p.hours;
      if (p.code.startsWith('N')) nightHoursTotal += p.hours;
    });

    const isComplete = dayHoursTotal === 24 && nightHoursTotal === 24;
    tableHtml += `<td style="font-size:9pt; font-weight:bold; background-color:${isComplete ? '#D4EDDA' : '#F8D7DA'}; color:${isComplete ? '#155724' : '#721C24'};">
      ${dayHoursTotal}h D<br>${nightHoursTotal}h N
    </td>`;
  }

  const isExactStationHours = totalMainHours === norm.totalStationHours;
  tableHtml += `
    <td></td>
    <td></td>
    <td class="${isExactStationHours ? 'sum-station-ok' : 'sum-bad'}"><strong>${totalMainHours}h</strong></td>
    <td class="col-header"><strong>${totalMainShifts}</strong></td>
  </tr></table></body></html>`;

  const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grafik_orlen_${year}_${String(month + 1).padStart(2, '0')}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Eksport do samodzielnego, eleganckiego pliku HTML z opcjami widoczności kolumn i wydruku
 */
export function exportScheduleToStandaloneHtml(
  workers: Worker[],
  scheduleData: Record<string, string>,
  year: number,
  month: number,
  tradingSundays: Record<string, boolean>
): void {
  const daysInMonth = getDaysInMonth(year, month);
  const norm = calculateWorkNorm(year, month);
  const monthName = new Date(year, month).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }).toUpperCase();

  const stationWorkers = workers.filter((w) => !w.isPodjazd);

  let html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Grafik Pracy ORLEN - ${monthName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 15px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #e30613; padding-bottom: 8px; margin-bottom: 12px; }
    .brand { font-size: 24px; font-weight: 900; color: #e30613; letter-spacing: 2px; }
    .title { text-align: center; }
    .title h1 { margin: 0; font-size: 18px; text-transform: uppercase; color: #1e293b; }
    .title h2 { margin: 2px 0; font-size: 14px; color: #e30613; }
    
    /* Pasek kontrolny opcji wydruku (tylko na ekranie) */
    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      font-size: 12px;
    }
    .controls-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 14px;
    }
    .controls-group label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-weight: 600;
      color: #334155;
    }
    .btn-print {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #e30613;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.15s;
    }
    .btn-print:hover {
      background: #b90510;
    }

    /* Ukrywanie kolumn wg przełączników */
    .hide-contract .col-contract { display: none !important; }
    .hide-vacation .col-vacation { display: none !important; }
    .hide-dh .col-dh { display: none !important; }
    .hide-nh .col-nh { display: none !important; }
    .hide-sum .col-sum { display: none !important; }
    .hide-shifts .col-shifts { display: none !important; }

    table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: center; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { border: 1px solid #cbd5e1; height: 38px; padding: 2px; }
    th { background: #1e293b; color: #fff; font-size: 10px; }
    .weekend { background: #d97706 !important; color: #fff; }
    .trading { background: #7e22ce !important; color: #fff; }
    .worker-col { text-align: left; font-weight: 800; font-size: 12px; padding-left: 8px; width: 160px; }
    .shift-d { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-weight: bold; border-radius: 3px; padding: 2px; }
    .shift-n { background: #e0e7ff; color: #1e1b4b; border: 1px solid #c7d2fe; font-weight: bold; border-radius: 3px; padding: 2px; }
    .shift-p { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; font-weight: bold; border-radius: 3px; padding: 2px; }
    .shift-u { background: #10b981; color: #fff; font-weight: bold; border-radius: 3px; padding: 2px; }
    .shift-w { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-weight: bold; border-radius: 3px; padding: 2px; }
    .status-ok { background: #dcfce7; color: #166534; font-weight: bold; }
    .status-bad { background: #fee2e2; color: #991b1b; font-weight: bold; }
    
    @media print {
      @page { size: A4 landscape; margin: 0.3cm; }
      body { margin: 0; background: #fff; }
      .controls-bar { display: none !important; }
      table { box-shadow: none !important; }
      th, td { height: 32pt !important; }
    }
  </style>
</head>
<body>
  <!-- Pasek opcji widoczności i wydruku -->
  <div class="controls-bar">
    <div class="controls-group">
      <span style="font-weight: bold; color: #0f172a;">Widoczność kolumn do wydruku:</span>
      <label><input type="checkbox" id="chk-contract" checked onchange="toggleCol('contract', this.checked)"> Umowa</label>
      <label><input type="checkbox" id="chk-vacation" checked onchange="toggleCol('vacation', this.checked)"> Urlop</label>
      <label><input type="checkbox" id="chk-dh" checked onchange="toggleCol('dh', this.checked)"> D (h)</label>
      <label><input type="checkbox" id="chk-nh" checked onchange="toggleCol('nh', this.checked)"> N (h)</label>
      <label><input type="checkbox" id="chk-sum" checked onchange="toggleCol('sum', this.checked)"> Suma</label>
      <label><input type="checkbox" id="chk-shifts" checked onchange="toggleCol('shifts', this.checked)"> Zmiany</label>
    </div>
    <button type="button" class="btn-print" onclick="window.print()">
      🖨️ Drukuj grafik (A4 Poziomo)
    </button>
  </div>

  <div class="header">
    <div class="brand">ORLEN</div>
    <div class="title">
      <h1>Grafik Pracy 24/7</h1>
      <h2>${monthName}</h2>
    </div>
    <div style="width: 100px;"></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="worker-col">Imię i Nazwisko</th>
        <th class="col-contract" style="width: 50px;">Umowa</th>
        <th class="col-vacation" style="width: 50px;">Urlop</th>
`;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    const dateStr = formatDateKey(year, month, day);
    const isTrading = Boolean(tradingSundays[dateStr]);

    let thCls = '';
    if (isTrading) thCls = 'trading';
    else if (dow === 0 || dow === 6) thCls = 'weekend';

    html += `<th class="${thCls}">${day}<br>${POLISH_DAYS_SHORT[dow]}</th>`;
  }

  html += `
        <th class="col-dh">D</th>
        <th class="col-nh">N</th>
        <th class="col-sum">Suma</th>
        <th class="col-shifts">Zmiany</th>
      </tr>
    </thead>
    <tbody>
  `;

  let grandMainHours = 0;
  let grandMainShifts = 0;

  workers.forEach((worker) => {
    let dH = 0, nH = 0, sc = 0;

    html += `<tr>
      <td class="worker-col">${worker.name}</td>
      <td class="col-contract">${worker.contractType === 'uop' ? 'UoP' : 'UZ'}${worker.isPodjazd ? ' (P)' : ''}</td>
      <td class="col-vacation">${worker.oldVacation + worker.newVacation}d</td>
    `;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateKey(year, month, day);
      const val = (scheduleData[`${worker.name}_${dateStr}`] || '').trim();
      const p = parseShift(val);

      if (isShiftEntry(val)) {
        sc++;
        if (p.code.startsWith('D')) dH += p.hours;
        if (p.code.startsWith('N')) nH += p.hours;
      }

      let content = p.code;
      if (p.code === 'U') content = '🌴 U';
      else if (p.code === '*') content = '☕ *';
      else if (p.startTime && p.endTime) {
        content = `${p.code}<br><small style="font-size:8px;">${p.startTime}</small><br><small style="font-size:8px;">${p.endTime}</small>`;
      }

      let badgeCls = '';
      if (p.code === 'D') badgeCls = 'shift-d';
      else if (p.code === 'N') badgeCls = 'shift-n';
      else if (p.code === 'P') badgeCls = 'shift-p';
      else if (p.code === 'U') badgeCls = 'shift-u';
      else if (p.code === '*') badgeCls = 'shift-w';

      html += `<td>${badgeCls ? `<div class="${badgeCls}">${content}</div>` : ''}</td>`;
    }

    const totalHours = dH + nH;
    if (!worker.isPodjazd) {
      grandMainHours += totalHours;
      grandMainShifts += sc;
    }

    html += `
      <td class="col-dh">${dH}h</td>
      <td class="col-nh">${nH}h</td>
      <td class="col-sum" style="font-weight:bold;">${totalHours}h</td>
      <td class="col-shifts" style="font-weight:bold;">${sc}</td>
    </tr>`;
  });

  html += `</tbody><tfoot><tr>
    <td class="worker-col">Suma stacji (D/N bez podjazdu)</td>
    <td class="col-contract"></td>
    <td class="col-vacation"></td>
  `;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateKey(year, month, day);
    let dH = 0, nH = 0;
    stationWorkers.forEach((w) => {
      const p = parseShift(scheduleData[`${w.name}_${dateStr}`] || '');
      if (p.code.startsWith('D')) dH += p.hours;
      if (p.code.startsWith('N')) nH += p.hours;
    });

    const isOk = dH === 24 && nH === 24;
    html += `<td class="${isOk ? 'status-ok' : 'status-bad'}" style="font-size:9px;">${dH}h D<br>${nH}h N</td>`;
  }

  html += `
    <td class="col-dh"></td>
    <td class="col-nh"></td>
    <td class="col-sum" style="font-weight:bold; background-color:${grandMainHours === norm.totalStationHours ? '#dcfce7' : '#fee2e2'};">${grandMainHours}h</td>
    <td class="col-shifts" style="font-weight:bold;">${grandMainShifts}</td>
  </tr></tfoot></table>

  <script>
    function toggleCol(colName, isVisible) {
      if (isVisible) {
        document.body.classList.remove('hide-' + colName);
      } else {
        document.body.classList.add('hide-' + colName);
      }
    }
  </script>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grafik_orlen_${year}_${String(month + 1).padStart(2, '0')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}


export const exportScheduleToExcel = exportScheduleToExcelHtml;
export const exportScheduleToHtml = exportScheduleToStandaloneHtml;

