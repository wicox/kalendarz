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
 * Eksport do bogatego pliku Excel (.xls / XML Spreadsheet) - ZWĘŻONY I PIONOWY UKŁAD KOMÓREK
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
      body { font-family: Calibri, Arial, sans-serif; font-size: 9pt; }
      table { border-collapse: collapse; table-layout: fixed; }
      th, td { border: 1px solid #B0BEC5; padding: 2px 1px; text-align: center; vertical-align: middle; mso-number-format: '\\@'; }
      .header-brand { background-color: #E30613; color: #FFFFFF; font-weight: bold; font-size: 14pt; }
      .header-title { background-color: #2C3E50; color: #FFFFFF; font-weight: bold; font-size: 11pt; }
      .header-norm { background-color: #ECEFF1; color: #37474F; font-size: 9pt; font-weight: bold; }
      .col-header { background-color: #263238; color: #FFFFFF; font-weight: bold; font-size: 8pt; }
      .col-weekend { background-color: #D35400; color: #FFFFFF; font-weight: bold; }
      .col-holiday { background-color: #C0392B; color: #FFFFFF; font-weight: bold; }
      .col-trading { background-color: #8E44AD; color: #FFFFFF; font-weight: bold; }
      .worker-name { text-align: left; font-weight: bold; background-color: #F8F9FA; font-size: 9pt; padding-left: 4px; }
      
      /* Kolory zmian w Excelu - pastelowe, lekkie, idealne do czytania */
      .shift-d { background-color: #EFF6FF; color: #1E40AF; font-weight: bold; }
      .shift-n { background-color: #E0E7FF; color: #1E1B4B; font-weight: bold; }
      .shift-p { background-color: #ECFDF5; color: #065F46; font-weight: bold; }
      .shift-u { background-color: #10B981; color: #FFFFFF; font-weight: bold; }
      .shift-w { background-color: #FEF3C7; color: #92400E; font-weight: bold; }
      
      .sum-exact { background-color: #2ECC71; color: #FFFFFF; font-weight: bold; }
      .sum-rounded { background-color: #2980B9; color: #FFFFFF; font-weight: bold; }
      .sum-bad { background-color: #FADBD8; color: #78281F; font-weight: bold; }
      .sum-station-ok { background-color: #27AE60; color: #FFFFFF; font-weight: bold; font-size: 9.5pt; }
    </style>
  </head>
  <body>
    <table>
      <colgroup>
        <col width="115" style="width: 115pt; mso-width-source: users;" />
        <col width="40" style="width: 40pt; mso-width-source: users;" />
        <col width="38" style="width: 38pt; mso-width-source: users;" />
  `;

  for (let day = 1; day <= daysInMonth; day++) {
    tableHtml += `<col width="28" style="width: 28pt; mso-width-source: users;" />`;
  }

  tableHtml += `
        <col width="32" style="width: 32pt; mso-width-source: users;" />
        <col width="32" style="width: 32pt; mso-width-source: users;" />
        <col width="38" style="width: 38pt; mso-width-source: users;" />
        <col width="36" style="width: 36pt; mso-width-source: users;" />
      </colgroup>
      <tr>
        <td colspan="${daysInMonth + 7}" class="header-brand">ORLEN - GRAFIK PRACY 24/7</td>
      </tr>
      <tr>
        <td colspan="${daysInMonth + 7}" class="header-title">${monthName}</td>
      </tr>
      <tr>
        <td colspan="${daysInMonth + 7}" class="header-norm">
          Norma czasu pracy: ${norm.hours}h | Norma na pracownika: ${norm.requiredShiftsCeil} zmian (${norm.shiftsRaw} zm. +${norm.overtimeHours}h nadgodz.) | Suma obsady stacji: ${norm.totalStationHours}h (${norm.totalStationShifts} zmian)
        </td>
      </tr>
      <tr>
        <th class="col-header" style="width: 115pt;">Imię i Nazwisko</th>
        <th class="col-header" style="width: 40pt;">Umowa</th>
        <th class="col-header" style="width: 38pt;">Urlop</th>
  `;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    const dateStr = formatDateKey(year, month, day);
    const isTrading = Boolean(tradingSundays[dateStr]);

    let thClass = 'col-header';
    if (isTrading) thClass = 'col-trading';
    else if (dow === 0 || dow === 6) thClass = 'col-weekend';

    tableHtml += `<th class="${thClass}" style="width: 28pt;">${day}<br><small style="font-size:7pt;">${POLISH_DAYS_SHORT[dow]}</small></th>`;
  }

  tableHtml += `
        <th class="col-header" style="width: 32pt;">D</th>
        <th class="col-header" style="width: 32pt;">N</th>
        <th class="col-header" style="width: 38pt;">Suma</th>
        <th class="col-header" style="width: 36pt;">Zmiany</th>
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
      <td style="font-size:8pt;">${isUoP ? 'UoP' : 'UZ'}${worker.isPodjazd ? ' (P)' : ''}</td>
      <td style="font-size:8pt;">${worker.oldVacation + worker.newVacation}d</td>
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

      // Pionowy, zwężony zapis w komórce Excela: litera na górze, godziny w dwóch linijkach pod spodem
      let cellInnerHtml = '';
      if (p.code === 'D' || p.code === 'N' || p.code === 'P') {
        cellInnerHtml = `<b>${p.code}</b><br/><font size="1" style="font-size:6.5pt;">${p.startTime || ''}<br/>${p.endTime || ''}</font>`;
      } else if (p.code === 'U') {
        cellInnerHtml = `<b>U</b><br/><font size="1" style="font-size:6.5pt;">Urlop</font>`;
      } else if (p.code === '*') {
        cellInnerHtml = `<b>*</b><br/><font size="1" style="font-size:6.5pt;">Wolne</font>`;
      } else if (p.code) {
        cellInnerHtml = `<b>${p.code}</b>`;
      } else {
        cellInnerHtml = `&nbsp;`;
      }

      tableHtml += `<td class="${cellClass}" style="width: 28pt; line-height: 1.05;">${cellInnerHtml}</td>`;
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
      <td style="font-size:8pt;">${dH}h</td>
      <td style="font-size:8pt;">${nH}h</td>
      <td class="${sumClass}"><strong>${totalHours}h</strong></td>
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
    tableHtml += `<td style="font-size:7.5pt; font-weight:bold; background-color:${isComplete ? '#D4EDDA' : '#F8D7DA'}; color:${isComplete ? '#155724' : '#721C24'}; width: 28pt; line-height: 1.05;">
      ${dayHoursTotal}h<br/>${nightHoursTotal}h
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
 * Eksport do samodzielnego, eleganckiego pliku HTML z opcjami widoczności kolumn i wydrukiem
 * ZOPTYMALIZOWANY PIONOWO - 14-18 pracowników mieści się na 1 stronie A4 poziomo bez podziału!
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
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 10px 14px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e30613; padding-bottom: 4px; margin-bottom: 8px; }
    .brand { font-size: 20px; font-weight: 900; color: #e30613; letter-spacing: 2px; }
    .title { text-align: center; }
    .title h1 { margin: 0; font-size: 15px; text-transform: uppercase; color: #1e293b; }
    .title h2 { margin: 1px 0; font-size: 12px; color: #e30613; }
    
    /* Pasek kontrolny opcji wydruku (tylko na ekranie) */
    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 8px 14px;
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      font-size: 11.5px;
    }
    .controls-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
    }
    .controls-group label {
      display: flex;
      align-items: center;
      gap: 5px;
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
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 11.5px;
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

    table { width: 100%; border-collapse: collapse; font-size: 9.5px; text-align: center; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { border: 1px solid #cbd5e1; height: 26px; padding: 1px; }
    th { background: #1e293b; color: #fff; font-size: 9px; height: 20px; }
    .weekend { background: #d97706 !important; color: #fff; }
    .trading { background: #7e22ce !important; color: #fff; }
    .worker-col { text-align: left; font-weight: 800; font-size: 11px; padding-left: 6px; width: 130px; }
    
    /* Zwarte komórki ze zmianami */
    .shift-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      line-height: 1.05;
      padding: 1px 0;
      border-radius: 2px;
    }
    .shift-box .s-code { font-weight: 800; font-size: 8pt; line-height: 1; }
    .shift-box .s-time { font-family: monospace; font-size: 6pt; line-height: 1; }
    
    .shift-d { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .shift-n { background: #e0e7ff; color: #1e1b4b; border: 1px solid #c7d2fe; }
    .shift-p { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .shift-u { background: #10b981; color: #fff; font-weight: 800; }
    .shift-w { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-weight: 800; }
    
    .status-ok { background: #dcfce7; color: #166534; font-weight: bold; }
    .status-bad { background: #fee2e2; color: #991b1b; font-weight: bold; }
    
    /* Super-zwarty arkusz druku A4 w poziomie: gwarantuje 1 stronę dla 14-18 pracowników */
    @media print {
      @page { size: A4 landscape; margin: 0.2cm 0.15cm; }
      body { margin: 0; background: #fff; font-size: 6.5pt; }
      .controls-bar { display: none !important; }
      .header { margin-bottom: 3px !important; padding-bottom: 2px !important; }
      .brand { font-size: 15px !important; }
      .title h1 { font-size: 12px !important; }
      .title h2 { font-size: 10px !important; }
      table { box-shadow: none !important; page-break-inside: avoid !important; }
      tr { page-break-inside: avoid !important; }
      th { height: 15pt !important; font-size: 6pt !important; padding: 1px 0 !important; }
      td { height: 21pt !important; padding: 0.5px !important; font-size: 6pt !important; }
      .worker-col { font-size: 7.5pt !important; width: 110px !important; padding-left: 4px !important; }
      .shift-box { padding: 0.5px 0 !important; }
      .shift-box .s-code { font-size: 7pt !important; }
      .shift-box .s-time { font-size: 5.5pt !important; }
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
    <div style="width: 80px;"></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="worker-col">Imię i Nazwisko</th>
        <th class="col-contract" style="width: 44px;">Umowa</th>
        <th class="col-vacation" style="width: 44px;">Urlop</th>
`;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    const dateStr = formatDateKey(year, month, day);
    const isTrading = Boolean(tradingSundays[dateStr]);

    let thCls = '';
    if (isTrading) thCls = 'trading';
    else if (dow === 0 || dow === 6) thCls = 'weekend';

    html += `<th class="${thCls}">${day}<br><span style="font-size:7pt;">${POLISH_DAYS_SHORT[dow]}</span></th>`;
  }

  html += `
        <th class="col-dh" style="width: 28px;">D</th>
        <th class="col-nh" style="width: 28px;">N</th>
        <th class="col-sum" style="width: 36px;">Suma</th>
        <th class="col-shifts" style="width: 34px;">Zmiany</th>
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

      let inner = '';
      if (p.code === 'D') {
        inner = `<div class="shift-box shift-d"><span class="s-code">D</span><span class="s-time">${p.startTime || '06:00'}</span><span class="s-time">${p.endTime || '18:00'}</span></div>`;
      } else if (p.code === 'N') {
        inner = `<div class="shift-box shift-n"><span class="s-code">N</span><span class="s-time">${p.startTime || '18:00'}</span><span class="s-time">${p.endTime || '06:00'}</span></div>`;
      } else if (p.code === 'P') {
        inner = `<div class="shift-box shift-p"><span class="s-code">P</span><span class="s-time">${p.startTime || '08:00'}</span><span class="s-time">${p.endTime || '16:00'}</span></div>`;
      } else if (p.code === 'U') {
        inner = `<div class="shift-box shift-u"><span class="s-code">🌴 U</span><span class="s-time" style="font-size:5pt;">URLOP</span></div>`;
      } else if (p.code === '*') {
        inner = `<div class="shift-box shift-w"><span class="s-code">☕ *</span><span class="s-time" style="font-size:5pt;">WOLNE</span></div>`;
      } else if (p.code) {
        inner = `<div class="shift-box"><span class="s-code">${p.code}</span></div>`;
      }

      html += `<td>${inner}</td>`;
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
    html += `<td class="${isOk ? 'status-ok' : 'status-bad'}" style="font-size:7pt; line-height:1.05;">${dH}h<br>${nH}h</td>`;
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
