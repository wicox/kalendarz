import { Worker, PrintSettings } from '../types/schedule';
import { formatDateKey, getDaysInMonth, POLISH_DAYS_SHORT, calculateWorkNorm } from './calendar';
import { parseShift, isShiftEntry } from './shiftParser';
import { toJpeg } from 'html-to-image';

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
 * Eksport do bogatego pliku Excel (.xls / XML Spreadsheet)
 * ZWĘŻONY I PIONOWY UKŁAD KOMÓREK - z możliwością wyboru kolumn przed eksportem
 */
export function exportScheduleToExcelHtml(
  workers: Worker[],
  scheduleData: Record<string, string>,
  year: number,
  month: number,
  tradingSundays: Record<string, boolean>,
  settings?: PrintSettings
): void {
  const daysInMonth = getDaysInMonth(year, month);
  const norm = calculateWorkNorm(year, month);
  const monthName = new Date(year, month).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }).toUpperCase();

  const opt = {
    showLastName: settings?.showLastName !== false,
    showExperience: settings?.showExperience !== false,
    showContractType: settings?.showContractType !== false,
    showVacation: settings?.showVacation !== false,
    showDayHours: settings?.showDayHours !== false,
    showNightHours: settings?.showNightHours !== false,
    showTotalHours: settings?.showTotalHours !== false,
    showShiftsCount: settings?.showShiftsCount !== false,
  };

  // Obliczenie liczby kolumn dla nagłówków colspan
  let summaryColCount = 0;
  if (opt.showDayHours) summaryColCount++;
  if (opt.showNightHours) summaryColCount++;
  if (opt.showTotalHours) summaryColCount++;
  if (opt.showShiftsCount) summaryColCount++;

  let leadingColCount = 1; // Imię pracownika
  if (opt.showContractType) leadingColCount++;
  if (opt.showVacation) leadingColCount++;

  const totalCols = leadingColCount + daysInMonth + summaryColCount;

  let tableHtml = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 8.5pt; }
      table { border-collapse: collapse; table-layout: fixed; }
      th, td { border: 1px solid #B0BEC5; padding: 1px 0px; text-align: center; vertical-align: middle; mso-number-format: '\\@'; }
      .header-brand { background-color: #E30613; color: #FFFFFF; font-weight: bold; font-size: 13pt; text-align: center; height: 26pt; }
      .header-title { background-color: #2C3E50; color: #FFFFFF; font-weight: bold; font-size: 10.5pt; text-align: center; height: 20pt; }
      .col-header { background-color: #263238; color: #FFFFFF; font-weight: bold; font-size: 7.5pt; height: 20pt; }
      .col-weekend { background-color: #D35400; color: #FFFFFF; font-weight: bold; font-size: 7.5pt; height: 20pt; }
      .col-holiday { background-color: #C0392B; color: #FFFFFF; font-weight: bold; font-size: 7.5pt; height: 20pt; }
      .col-trading { background-color: #8E44AD; color: #FFFFFF; font-weight: bold; font-size: 7.5pt; height: 20pt; }
      .worker-name { text-align: left; font-weight: bold; background-color: #F8F9FA; font-size: 8.5pt; padding-left: 4px; }
      
      /* Kolory zmian w Excelu - pastelowe, czytelne i zoptymalizowane do druku */
      .shift-d { background-color: #EFF6FF; color: #1E40AF; font-weight: bold; }
      .shift-n { background-color: #E0E7FF; color: #1E1B4B; font-weight: bold; }
      .shift-p { background-color: #ECFDF5; color: #065F46; font-weight: bold; }
      .shift-u { background-color: #10B981; color: #FFFFFF; font-weight: bold; }
      .shift-w { background-color: #FEF3C7; color: #92400E; font-weight: bold; }
      
      .sum-exact { background-color: #2ECC71; color: #FFFFFF; font-weight: bold; }
      .sum-rounded { background-color: #2980B9; color: #FFFFFF; font-weight: bold; }
      .sum-bad { background-color: #FADBD8; color: #78281F; font-weight: bold; }
      .sum-station-ok { background-color: #27AE60; color: #FFFFFF; font-weight: bold; font-size: 9pt; }
    </style>
  </head>
  <body>
    <table>
      <colgroup>
        <col width="88" style="width: 88pt; mso-width-source: users;" />
        ${opt.showContractType ? '<col width="24" style="width: 24pt; mso-width-source: users;" />' : ''}
        ${opt.showVacation ? '<col width="22" style="width: 22pt; mso-width-source: users;" />' : ''}
  `;

  // Zawężone kolumny dni (18pt zamiast 28pt)
  for (let day = 1; day <= daysInMonth; day++) {
    tableHtml += `<col width="18" style="width: 18pt; mso-width-source: users;" />`;
  }

  if (opt.showDayHours) tableHtml += `<col width="20" style="width: 20pt; mso-width-source: users;" />`;
  if (opt.showNightHours) tableHtml += `<col width="20" style="width: 20pt; mso-width-source: users;" />`;
  if (opt.showTotalHours) tableHtml += `<col width="24" style="width: 24pt; mso-width-source: users;" />`;
  if (opt.showShiftsCount) tableHtml += `<col width="22" style="width: 22pt; mso-width-source: users;" />`;

  tableHtml += `
      </colgroup>
      <tr>
        <td colspan="${totalCols}" class="header-brand">ORLEN - GRAFIK PRACY 24/7</td>
      </tr>
      <tr>
        <td colspan="${totalCols}" class="header-title">${monthName}</td>
      </tr>
      <tr>
        <th class="col-header" style="width: 88pt;">Pracownik</th>
        ${opt.showContractType ? '<th class="col-header" style="width: 24pt;">Um.</th>' : ''}
        ${opt.showVacation ? '<th class="col-header" style="width: 22pt;">Url.</th>' : ''}
  `;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    const dateStr = formatDateKey(year, month, day);
    const isTrading = Boolean(tradingSundays[dateStr]);

    let thClass = 'col-header';
    if (isTrading) thClass = 'col-trading';
    else if (dow === 0 || dow === 6) thClass = 'col-weekend';

    tableHtml += `<th class="${thClass}" style="width: 18pt;">${day}<br><small style="font-size:6pt;">${POLISH_DAYS_SHORT[dow]}</small></th>`;
  }

  if (opt.showDayHours) tableHtml += `<th class="col-header" style="width: 20pt;">D</th>`;
  if (opt.showNightHours) tableHtml += `<th class="col-header" style="width: 20pt;">N</th>`;
  if (opt.showTotalHours) tableHtml += `<th class="col-header" style="width: 24pt;">Suma</th>`;
  if (opt.showShiftsCount) tableHtml += `<th class="col-header" style="width: 22pt;">Zm.</th>`;
  tableHtml += `</tr>`;

  const stationWorkers = workers.filter((w) => !w.isPodjazd);
  let totalMainHours = 0;
  let totalMainShifts = 0;

  workers.forEach((worker) => {
    const isUoP = worker.contractType === 'uop';
    let dH = 0, nH = 0, sc = 0;

    const displayName = opt.showLastName
      ? worker.name
      : (worker.firstName || worker.name.split(' ')[0]);

    tableHtml += `<tr>
      <td class="worker-name">${displayName}</td>
      ${opt.showContractType ? `<td style="font-size:7pt;">${isUoP ? 'UoP' : 'UZ'}${worker.isPodjazd ? ' (P)' : ''}</td>` : ''}
      ${opt.showVacation ? `<td style="font-size:7pt;">${worker.oldVacation + worker.newVacation}d</td>` : ''}
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

      // Zawężony i pionowy zapis w komórce Excela: litera na górze, godziny pionowo
      let cellInnerHtml = '';
      if (p.code === 'D' || p.code === 'N' || p.code === 'P') {
        cellInnerHtml = `<b style="font-size:7.5pt;">${p.code}</b><br/><font size="1" style="font-size:5.5pt; font-family:'Arial Narrow', sans-serif;">${p.startTime || ''}<br/>${p.endTime || ''}</font>`;
      } else if (p.code === 'U') {
        cellInnerHtml = `<b style="font-size:7.5pt;">U</b><br/><font size="1" style="font-size:5.5pt;">Urlop</font>`;
      } else if (p.code === '*') {
        cellInnerHtml = `<b style="font-size:7.5pt;">*</b><br/><font size="1" style="font-size:5.5pt;">Wolne</font>`;
      } else if (p.code) {
        cellInnerHtml = `<b style="font-size:7.5pt;">${p.code}</b>`;
      } else {
        cellInnerHtml = `&nbsp;`;
      }

      tableHtml += `<td class="${cellClass}" style="width: 18pt; line-height: 1.0; padding: 1px 0;">${cellInnerHtml}</td>`;
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

    if (opt.showDayHours) tableHtml += `<td style="font-size:7.5pt;">${dH}h</td>`;
    if (opt.showNightHours) tableHtml += `<td style="font-size:7.5pt;">${nH}h</td>`;
    if (opt.showTotalHours) tableHtml += `<td class="${sumClass}"><strong>${totalHours}h</strong></td>`;
    if (opt.showShiftsCount) tableHtml += `<td><strong>${sc}</strong></td>`;
    tableHtml += `</tr>`;
  });

  // Wiersz podsumowania dobowego stacji (BEZ PODJAZDU)
  tableHtml += `<tr>
    <td class="col-header" colspan="${leadingColCount}"><strong>Suma stacji (D/N)</strong></td>
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
    tableHtml += `<td style="font-size:6.5pt; font-weight:bold; background-color:${isComplete ? '#D4EDDA' : '#F8D7DA'}; color:${isComplete ? '#155724' : '#721C24'}; width: 18pt; line-height: 1.0; padding: 1px 0;">
      ${dayHoursTotal}h<br/>${nightHoursTotal}h
    </td>`;
  }

  const isExactStationHours = totalMainHours === norm.totalStationHours;
  if (opt.showDayHours) tableHtml += `<td></td>`;
  if (opt.showNightHours) tableHtml += `<td></td>`;
  if (opt.showTotalHours) tableHtml += `<td class="${isExactStationHours ? 'sum-station-ok' : 'sum-bad'}"><strong>${totalMainHours}h</strong></td>`;
  if (opt.showShiftsCount) tableHtml += `<td class="col-header"><strong>${totalMainShifts}</strong></td>`;
  tableHtml += `</tr></table></body></html>`;

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
 * ZOPTYMALIZOWANY PIONOWO - komórki zwężone w pionie, 14-18 pracowników mieści się na 1 stronie A4 poziomo bez podziału!
 */
export function exportScheduleToStandaloneHtml(
  workers: Worker[],
  scheduleData: Record<string, string>,
  year: number,
  month: number,
  tradingSundays: Record<string, boolean>,
  settings?: PrintSettings
): void {
  const daysInMonth = getDaysInMonth(year, month);
  const norm = calculateWorkNorm(year, month);
  const monthName = new Date(year, month).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }).toUpperCase();

  const stationWorkers = workers.filter((w) => !w.isPodjazd);

  const initContract = settings?.showContractType !== false;
  const initVacation = settings?.showVacation !== false;
  const initDH = settings?.showDayHours !== false;
  const initNH = settings?.showNightHours !== false;
  const initSum = settings?.showTotalHours !== false;
  const initShifts = settings?.showShiftsCount !== false;
  const showLast = settings?.showLastName !== false;

  let bodyClasses = [];
  if (!initContract) bodyClasses.push('hide-contract');
  if (!initVacation) bodyClasses.push('hide-vacation');
  if (!initDH) bodyClasses.push('hide-dh');
  if (!initNH) bodyClasses.push('hide-nh');
  if (!initSum) bodyClasses.push('hide-sum');
  if (!initShifts) bodyClasses.push('hide-shifts');

  let html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Grafik Pracy ORLEN - ${monthName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 8px 10px; font-size: 8.5px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e30613; padding-bottom: 3px; margin-bottom: 6px; }
    .brand { font-size: 18px; font-weight: 900; color: #e30613; letter-spacing: 2px; }
    .title { text-align: center; }
    .title h1 { margin: 0; font-size: 14px; text-transform: uppercase; color: #1e293b; }
    .title h2 { margin: 1px 0; font-size: 11px; color: #e30613; }
    
    /* Pasek kontrolny opcji wydruku (tylko na ekranie) */
    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      font-size: 11px;
    }
    .controls-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .controls-group label {
      display: flex;
      align-items: center;
      gap: 4px;
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
      padding: 5px 12px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 11px;
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

    table { width: 100%; border-collapse: collapse; font-size: 8.5px; text-align: center; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { border: 1px solid #cbd5e1; height: 18px; padding: 0.5px; }
    th { background: #1e293b; color: #fff; font-size: 8pt; height: 16px; }
    .weekend { background: #d97706 !important; color: #fff; }
    .trading { background: #7e22ce !important; color: #fff; }
    .worker-col { text-align: left; font-weight: 800; font-size: 9.5px; padding-left: 4px; width: 105px; }
    
    /* Zwarte komórki ze zmianami - zwężone w pionie bez zbędnego pustego pola */
    .shift-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      line-height: 1.0;
      padding: 0;
      border-radius: 2px;
    }
    .shift-box .s-code { font-weight: 800; font-size: 7.5pt; line-height: 1; }
    .shift-box .s-time { font-family: monospace; font-size: 5.5pt; line-height: 0.95; }
    
    .shift-d { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .shift-n { background: #e0e7ff; color: #1e1b4b; border: 1px solid #c7d2fe; }
    .shift-p { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .shift-u { background: #10b981; color: #fff; font-weight: 800; }
    .shift-w { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-weight: 800; }
    
    .status-ok { background: #dcfce7; color: #166534; font-weight: bold; }
    .status-bad { background: #fee2e2; color: #991b1b; font-weight: bold; }
    
    /* Super-zwarty arkusz druku A4 w poziomie: gwarantuje 1 stronę dla 14-18 pracowników */
    @media print {
      @page { size: A4 landscape; margin: 0.15cm 0.12cm; }
      body { margin: 0; background: #fff; font-size: 5.8pt; }
      .controls-bar { display: none !important; }
      .header { margin-bottom: 2px !important; padding-bottom: 1px !important; }
      .brand { font-size: 13px !important; }
      .title h1 { font-size: 11px !important; }
      .title h2 { font-size: 9px !important; }
      table { box-shadow: none !important; page-break-inside: avoid !important; }
      tr { page-break-inside: avoid !important; height: 14pt !important; }
      th { height: 12pt !important; font-size: 5.5pt !important; padding: 0.5px 0 !important; }
      td { height: 14pt !important; max-height: 15pt !important; padding: 0 !important; font-size: 5.5pt !important; }
      .worker-col { font-size: 7pt !important; width: 95px !important; padding-left: 2px !important; }
      .shift-box { padding: 0 !important; height: 100% !important; justify-content: center !important; }
      .shift-box .s-code { font-size: 6.5pt !important; line-height: 0.95 !important; }
      .shift-box .s-time { font-size: 4.8pt !important; line-height: 0.9 !important; }
    }
  </style>
</head>
<body class="${bodyClasses.join(' ')}">
  <!-- Pasek opcji widoczności i wydruku -->
  <div class="controls-bar">
    <div class="controls-group">
      <span style="font-weight: bold; color: #0f172a;">Widoczność kolumn:</span>
      <label><input type="checkbox" id="chk-contract" ${initContract ? 'checked' : ''} onchange="toggleCol('contract', this.checked)"> Umowa</label>
      <label><input type="checkbox" id="chk-vacation" ${initVacation ? 'checked' : ''} onchange="toggleCol('vacation', this.checked)"> Urlop</label>
      <label><input type="checkbox" id="chk-dh" ${initDH ? 'checked' : ''} onchange="toggleCol('dh', this.checked)"> D (h)</label>
      <label><input type="checkbox" id="chk-nh" ${initNH ? 'checked' : ''} onchange="toggleCol('nh', this.checked)"> N (h)</label>
      <label><input type="checkbox" id="chk-sum" ${initSum ? 'checked' : ''} onchange="toggleCol('sum', this.checked)"> Suma</label>
      <label><input type="checkbox" id="chk-shifts" ${initShifts ? 'checked' : ''} onchange="toggleCol('shifts', this.checked)"> Zmiany</label>
    </div>
    <button type="button" class="btn-print" onclick="window.print()">
      🖨️ Drukuj grafik (1 strona A4 Poziomo)
    </button>
  </div>

  <div class="header">
    <div class="brand">ORLEN</div>
    <div class="title">
      <h1>Grafik Pracy 24/7</h1>
      <h2>${monthName}</h2>
    </div>
    <div style="width: 70px;"></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="worker-col">Pracownik</th>
        <th class="col-contract" style="width: 32px;">Umowa</th>
        <th class="col-vacation" style="width: 30px;">Urlop</th>
`;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    const dateStr = formatDateKey(year, month, day);
    const isTrading = Boolean(tradingSundays[dateStr]);

    let thCls = '';
    if (isTrading) thCls = 'trading';
    else if (dow === 0 || dow === 6) thCls = 'weekend';

    html += `<th class="${thCls}">${day}<br><span style="font-size:6pt;">${POLISH_DAYS_SHORT[dow]}</span></th>`;
  }

  html += `
        <th class="col-dh" style="width: 24px;">D</th>
        <th class="col-nh" style="width: 24px;">N</th>
        <th class="col-sum" style="width: 28px;">Suma</th>
        <th class="col-shifts" style="width: 26px;">Zmiany</th>
      </tr>
    </thead>
    <tbody>
`;

  let grandMainHours = 0;
  let grandMainShifts = 0;

  workers.forEach((worker) => {
    let dH = 0, nH = 0, sc = 0;
    const displayName = showLast ? worker.name : (worker.firstName || worker.name.split(' ')[0]);

    html += `<tr>
      <td class="worker-col">${displayName}</td>
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
        inner = `<div class="shift-box shift-u"><span class="s-code">🌴 U</span><span class="s-time" style="font-size:4.5pt;">URLOP</span></div>`;
      } else if (p.code === '*') {
        inner = `<div class="shift-box shift-w"><span class="s-code">☕ *</span><span class="s-time" style="font-size:4.5pt;">WOLNE</span></div>`;
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
    <td class="worker-col">Suma stacji (D/N)</td>
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
    html += `<td class="${isOk ? 'status-ok' : 'status-bad'}" style="font-size:6.5pt; line-height:1.0;">${dH}h<br>${nH}h</td>`;
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

/**
 * Eksport grafiku do obrazu JPG w wysokiej rozdzielczości (pixelRatio: 2)
 * Z pełną obsługą ukrywania wybranych kolumn i elementów (urlop, umowa, nazwisko, godziny, zmiany)
 */
export async function exportScheduleToJpg(
  year: number,
  month: number,
  settings?: PrintSettings,
  elementId: string = 'schedule-table-capture-root'
): Promise<void> {
  const root = document.getElementById(elementId);
  if (!root) {
    throw new Error('Nie znaleziono elementu grafiku do zapisu jako JPG');
  }

  const prevOverflow = root.style.overflow;
  const prevWidth = root.style.width;
  const prevMaxWidth = root.style.maxWidth;

  const appliedClasses: string[] = ['is-exporting'];
  if (settings?.showLastName === false) appliedClasses.push('hide-export-lastname');
  if (settings?.showExperience === false) appliedClasses.push('hide-export-experience');
  if (settings?.showContractType === false) appliedClasses.push('hide-export-contract');
  if (settings?.showVacation === false) appliedClasses.push('hide-export-vacation');
  if (settings?.showDayHours === false) appliedClasses.push('hide-export-dh');
  if (settings?.showNightHours === false) appliedClasses.push('hide-export-nh');
  if (settings?.showTotalHours === false) appliedClasses.push('hide-export-sum');
  if (settings?.showShiftsCount === false) appliedClasses.push('hide-export-shifts');

  root.classList.add(...appliedClasses);

  try {
    const scrollWidth = root.scrollWidth;
    root.style.overflow = 'visible';
    root.style.width = `${Math.max(scrollWidth, 1100)}px`;
    root.style.maxWidth = 'none';

    // Oczekiwanie na przeliczenie stylów i layoutu DOM przez przeglądarkę
    await new Promise((resolve) => setTimeout(resolve, 100));

    const dataUrl = await toJpeg(root, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      filter: (node) => {
        if (node instanceof HTMLElement && node.classList) {
          if (node.classList.contains('no-export')) return false;
          if (node.classList.contains('no-print')) return false;
          if (settings?.showLastName === false && node.classList.contains('export-lastname')) return false;
          if (settings?.showExperience === false && node.classList.contains('export-experience')) return false;
          if (settings?.showContractType === false && node.classList.contains('export-contract')) return false;
          if (settings?.showVacation === false && node.classList.contains('export-col-vacation')) return false;
          if (settings?.showDayHours === false && node.classList.contains('export-col-dh')) return false;
          if (settings?.showNightHours === false && node.classList.contains('export-col-nh')) return false;
          if (settings?.showTotalHours === false && node.classList.contains('export-col-sum')) return false;
          if (settings?.showShiftsCount === false && node.classList.contains('export-col-shifts')) return false;
        }
        return true;
      },
    });

    const link = document.createElement('a');
    link.download = `grafik_orlen_${year}_${String(month + 1).padStart(2, '0')}.jpg`;
    link.href = dataUrl;
    link.click();
  } finally {
    root.classList.remove(...appliedClasses);
    root.style.overflow = prevOverflow;
    root.style.width = prevWidth;
    root.style.maxWidth = prevMaxWidth;
  }
}

export const exportScheduleToExcel = exportScheduleToExcelHtml;
export const exportScheduleToHtml = exportScheduleToStandaloneHtml;
