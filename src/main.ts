import './style.css';
import { marked } from 'marked';

// Interface definitions
interface TimetableRow {
  time: string;
  days: {
    [dayName: string]: string;
  };
}

interface LogEntry {
  date: string;
  markdownContent: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ESTONIAN_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DAY_LABELS: {[key: string]: string} = {
  Monday: 'E', Tuesday: 'T', Wednesday: 'K', Thursday: 'N',
  Friday: 'R', Saturday: 'L', Sunday: 'P',
};
const DAY_LABELS_FULL: {[key: string]: string} = {
  Monday: 'Esmaspäev', Tuesday: 'Teisipäev', Wednesday: 'Kolmapäev',
  Thursday: 'Neljapäev', Friday: 'Reede', Saturday: 'Laupäev', Sunday: 'Pühapäev',
};

// State object
const state = {
  currentDate: new Date(),
  timetable: [] as TimetableRow[],
  logs: new Map<string, LogEntry>(),
  activeTab: 'week',
  selectedLogDate: '',
};

// Default paths (copied from content directory)
const DEFAULT_TIMETABLE_PATH = 'content/timetable.csv';
const DEFAULT_ABOUT_PATH = 'content/about.md';
const DEFAULT_LOGS_PATH = 'content/logs.md';
const DEFAULT_INTRO_PATH = 'content/intro.md';

// Elements Cache
let els: { [key: string]: HTMLElement | null } = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  wireEvents();
  initApp();
});

function cacheElements() {
  els = {
    // Navigation Desktop
    navToday: document.getElementById('nav-btn-today'),
    navWeek: document.getElementById('nav-btn-week'),
    navLogs: document.getElementById('nav-btn-logs'),
    navAbout: document.getElementById('nav-btn-about'),
    
    // Navigation Mobile
    mobileNavToday: document.getElementById('mobile-nav-btn-today'),
    mobileNavWeek: document.getElementById('mobile-nav-btn-week'),
    mobileNavLogs: document.getElementById('mobile-nav-btn-logs'),
    mobileNavAbout: document.getElementById('mobile-nav-btn-about'),
    
    // Main Headers
    mainHeading: document.getElementById('main-heading'),
    dateDisplay: document.getElementById('date-display'),
    
    // Today Tab
    btnPrevDay: document.getElementById('btn-prev-day'),
    btnTodayDay: document.getElementById('btn-today-day'),
    btnNextDay: document.getElementById('btn-next-day'),
    dayProgressBar: document.getElementById('day-progress-bar'),
    timelineSlotsContainer: document.getElementById('timeline-slots-container'),
    currentActivityCard: document.getElementById('current-activity-card'),
    currentActivityName: document.getElementById('current-activity-name'),
    currentActivityTime: document.getElementById('current-activity-time'),
    nextActivityText: document.getElementById('next-activity-text'),
    todayLogContainer: document.getElementById('today-log-container'),
    linkToLogsTab: document.getElementById('link-to-logs-tab'),
    
    // Week Tab
    weekIntroContent: document.getElementById('week-intro-content'),
    weekGridHeaders: document.getElementById('week-grid-headers'),
    weekGridBody: document.getElementById('week-grid-body'),
    
    // Logs Tab
    logSearchInput: document.getElementById('log-search-input') as HTMLInputElement | null,
    logsListMenu: document.getElementById('logs-list-menu'),
    logDetailContent: document.getElementById('log-detail-content'),
    
    // About Tab
    aboutContent: document.getElementById('about-content'),
  };
}

function wireEvents() {
  // Tab Swapping
  const tabButtons = document.querySelectorAll('[data-tab]');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const tabName = target.getAttribute('data-tab');
      if (tabName) {
        switchTab(tabName);
      }
    });
  });

  // Today Tab Day Controls
  els.btnPrevDay?.addEventListener('click', () => {
    navigateDay(-1);
  });
  
  els.btnTodayDay?.addEventListener('click', () => {
    state.currentDate = new Date();
    renderAll();
  });
  
  els.btnNextDay?.addEventListener('click', () => {
    navigateDay(1);
  });

  els.linkToLogsTab?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('logs');
    // Set selected log date to today's date if it exists
    const dateStr = formatISODate(state.currentDate);
    if (state.logs.has(dateStr)) {
      state.selectedLogDate = dateStr;
      renderLogsTab();
    }
  });

  // Logs Search
  els.logSearchInput?.addEventListener('input', () => {
    renderLogsSidebar();
  });

  // Re-check current active slot every 60 seconds (only if viewing today)
  setInterval(() => {
    if (state.activeTab === 'today') {
      renderTodaySchedule();
    }
  }, 60000);
}

function switchTab(tabName: string) {
  state.activeTab = tabName;
  
  // Update UI classes for navigation buttons
  const allNavs = document.querySelectorAll('.nav-item, .mobile-nav-item');
  allNavs.forEach(nav => {
    if (nav.getAttribute('data-tab') === tabName) {
      nav.classList.add('active');
    } else {
      nav.classList.remove('active');
    }
  });

  // Show corresponding view panel
  const allViews = document.querySelectorAll('.app-view');
  allViews.forEach(view => {
    if (view.id === `view-${tabName}`) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  // Update header text based on tab
  if (els.mainHeading) {
    switch (tabName) {
      case 'today':
        els.mainHeading.textContent = "Tänane päev";
        break;
      case 'week':
        els.mainHeading.textContent = "Nädalavaade";
        break;
      case 'logs':
        els.mainHeading.textContent = "Päevik";
        break;
      case 'about':
        els.mainHeading.textContent = "Info";
        break;
    }
  }

  renderAll();
}

async function initApp() {
  await Promise.all([
    loadTimetable(),
    loadAboutContent(),
    loadLogsContent(),
    loadIntroContent()
  ]);
  renderAll();
}

// Data loaders
async function loadTimetable() {
  let csvText = '';
  try {
    const res = await fetch(DEFAULT_TIMETABLE_PATH);
    if (!res.ok) throw new Error('Local timetable fetch failed');
    csvText = await res.text();
  } catch (e) {
    console.error("Could not fetch local timetable CSV.", e);
    csvText = `Time,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday
07:00,Closed,Closed,Closed,Closed,Closed,Closed,Closed
08:00,Closed,Closed,Closed,Closed,Closed,Closed,Closed
09:00,Closed,Closed,Closed,Closed,Closed,Closed,Closed`;
  }
  state.timetable = parseCSV(csvText);
}

async function loadIntroContent() {
  let md = '';
  try {
    const res = await fetch(DEFAULT_INTRO_PATH);
    if (!res.ok) throw new Error('Local intro.md fetch failed');
    md = await res.text();
  } catch (e) {
    md = '';
  }
  if (!els.weekIntroContent || !md.trim()) {
    (els.weekIntroContent?.closest('.intro-card') as HTMLElement | null)?.style.setProperty('display', 'none');
    return;
  }

  const PREVIEW_WORDS = 40;
  const trimmedMd = md.trim();
  const lines = trimmedMd.split(/\r?\n/);
  const firstContentLine = lines.find((line) => line.trim().length > 0) ?? '';
  const headingLine = /^#{1,6}\s+/.test(firstContentLine) ? firstContentLine.trim() : '';
  const bodyMd = headingLine
    ? trimmedMd.slice(trimmedMd.indexOf(firstContentLine) + firstContentLine.length).trim()
    : trimmedMd;

  let previewWordCount = 0;
  const previewParagraphs: string[] = [];

  for (const paragraph of bodyMd.split(/\n\s*\n/)) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) {
      continue;
    }

    const paragraphWords = trimmedParagraph.split(/\s+/);
    const remainingWords = PREVIEW_WORDS - previewWordCount;

    if (remainingWords <= 0) {
      break;
    }

    if (paragraphWords.length <= remainingWords) {
      previewParagraphs.push(trimmedParagraph);
      previewWordCount += paragraphWords.length;
      continue;
    }

    previewParagraphs.push(`${paragraphWords.slice(0, remainingWords).join(' ')}…`);
    previewWordCount = PREVIEW_WORDS;
    break;
  }

  const previewSections = [headingLine, ...previewParagraphs].filter(Boolean);
  const previewMd = previewSections.join('\n\n');
  const fullHtml = await marked.parse(md);
  const previewHtml = await marked.parse(previewMd);

  els.weekIntroContent.innerHTML = `
    <div class="intro-preview">${previewHtml}</div>
    <div class="intro-full" style="display:none">${fullHtml}</div>
    <button class="intro-toggle-btn" aria-expanded="false">Loe edasi</button>
  `;

  els.weekIntroContent.querySelector('.intro-toggle-btn')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const preview = els.weekIntroContent!.querySelector('.intro-preview') as HTMLElement;
    const full = els.weekIntroContent!.querySelector('.intro-full') as HTMLElement;
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    preview.style.display = expanded ? '' : 'none';
    full.style.display = expanded ? 'none' : '';
    btn.textContent = expanded ? 'Loe edasi' : 'Peida';
    btn.setAttribute('aria-expanded', String(!expanded));
  });
}

async function loadAboutContent() {
  let md = '';
  try {
    const res = await fetch(DEFAULT_ABOUT_PATH);
    if (!res.ok) throw new Error('Local about.md fetch failed');
    md = await res.text();
  } catch (e) {
    md = `# About Kaareke\n\nFailed to load content/about.md.`;
  }

  if (els.aboutContent) {
    const html = await marked.parse(md);
    els.aboutContent.innerHTML = html;
    refreshIcons(els.aboutContent);
  }
}

async function loadLogsContent() {
  let md = '';
  try {
    const res = await fetch(DEFAULT_LOGS_PATH);
    if (!res.ok) throw new Error('Local logs.md fetch failed');
    md = await res.text();
  } catch (e) {
    md = `# Kaareke Daily Logs\n\nFailed to load content/logs.md.`;
  }

  state.logs = parseLogs(md);

  if (!state.selectedLogDate && state.logs.size > 0) {
    const keys = Array.from(state.logs.keys()).sort((a, b) => b.localeCompare(a));
    state.selectedLogDate = keys[0];
  }
}

// CSV & Markdown Parsers
function parseCSV(csvText: string): TimetableRow[] {
  const rows: TimetableRow[] = [];
  const lines = csvText.split(/\r?\n/);
  if (lines.length === 0) return rows;
  
  // Parse headers
  const headers = parseCSVLine(lines[0]);
  if (headers.length < 2) return rows;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = parseCSVLine(line);
    if (cells.length === 0) continue;
    
    const time = cells[0].trim();
    const days: { [dayName: string]: string } = {};
    
    for (let j = 1; j < headers.length; j++) {
      const dayName = headers[j].trim();
      days[dayName] = cells[j] ? cells[j].trim() : '';
    }
    
    rows.push({ time, days });
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(cell => {
    if (cell.startsWith('"') && cell.endsWith('"')) {
      return cell.slice(1, -1);
    }
    return cell;
  });
}

function parseLogs(markdownText: string): Map<string, LogEntry> {
  const logsMap = new Map<string, LogEntry>();
  // Split by ## at the start of lines to isolate date sections
  const sections = markdownText.split(/(?=\n##\s|\r\n##\s|^##\s)/g);
  
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    
    // Check if it matches a date header: e.g. ## YYYY-MM-DD
    const match = trimmed.match(/^##\s+(\d{4}-\d{2}-\d{2})\b([\s\S]*)$/);
    if (match) {
      const dateStr = match[1];
      const content = match[2].trim();
      logsMap.set(dateStr, {
        date: dateStr,
        markdownContent: content
      });
    }
  }
  return logsMap;
}

// Global Renders
function renderAll() {
  // Update header dates
  if (els.dateDisplay) {
    els.dateDisplay.textContent = formatLongDate(state.currentDate);
  }

  // Render corresponding tab
  switch (state.activeTab) {
    case 'today':
      renderTodayTab();
      break;
    case 'week':
      renderWeekTab();
      break;
    case 'logs':
      renderLogsTab();
      break;
  }
}

// TODAY TAB RENDERING
function renderTodayTab() {
  renderTodaySchedule();
  renderTodayLog();
}

function renderTodaySchedule() {
  if (!els.timelineSlotsContainer) return;
  els.timelineSlotsContainer.innerHTML = '';

  const dayName = DAY_NAMES[state.currentDate.getDay()];
  const isSelectedDateToday = isSameDay(state.currentDate, new Date());
  
  let activeRowIndex = -1;
  let currentMinutes = 0;
  
  if (isSelectedDateToday) {
    const now = new Date();
    currentMinutes = now.getHours() * 60 + now.getMinutes();
  }

  // Calculate day progress bar
  updateProgressBar(isSelectedDateToday);

  // Filter & sort timetable rows
  const sortedRows = [...state.timetable].sort((a, b) => {
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });

  if (sortedRows.length === 0) {
    els.timelineSlotsContainer.innerHTML = `<div class="empty-state"><p>Tunniplaan puudub.</p></div>`;
    return;
  }

  // Determine active row based on system time
  if (isSelectedDateToday) {
    for (let i = 0; i < sortedRows.length; i++) {
      const row = sortedRows[i];
      const startMin = timeToMinutes(row.time);
      let endMin = startMin + 60;
      if (i < sortedRows.length - 1) {
        endMin = timeToMinutes(sortedRows[i + 1].time);
      }
      
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        activeRowIndex = i;
        break;
      }
    }
  }

  // Fill in slots HTML
  sortedRows.forEach((row, index) => {
    const isActive = index === activeRowIndex;
    const value = row.days[dayName] || '';
    
    // Don't show completely empty cells on weekends or weekdays unless they have some content
    const hasContent = value.trim().length > 0;
    
    const slotEl = document.createElement('div');
    slotEl.className = `timeline-slot ${isActive ? 'active' : ''} ${!hasContent ? 'empty-slot' : ''}`;
    
    // Deduce emoji / icon
    const icon = getActivityIcon(value);
    
    slotEl.innerHTML = `
      <div class="slot-time">${formatTimeDisplay(row.time)}</div>
      <div class="slot-activity">
        <span class="slot-icon">${icon}</span>
        <span>${hasContent ? value : '<span class="text-muted">Tegevus puudub</span>'}</span>
      </div>
      <span class="slot-indicator">Aktiivne</span>
    `;
    
    els.timelineSlotsContainer?.appendChild(slotEl);
  });

  // Render Highlight Status Card
  if (els.currentActivityCard) {
    if (activeRowIndex !== -1) {
      const activeRow = sortedRows[activeRowIndex];
      const activeName = activeRow.days[dayName] || 'Vaba mäng';
      
      let nextRowTime = '';
      let nextName = 'Lõpp';
      if (activeRowIndex < sortedRows.length - 1) {
        const nextRow = sortedRows[activeRowIndex + 1];
        nextRowTime = formatTimeDisplay(nextRow.time);
        nextName = nextRow.days[dayName] || 'Vaba aeg';
      }

      if (els.currentActivityName) els.currentActivityName.textContent = activeName;
      
      let startTime = activeRow.time;
      let endTime = '';
      if (activeRowIndex < sortedRows.length - 1) {
        endTime = sortedRows[activeRowIndex + 1].time;
      } else {
        const [h, m] = startTime.split(':').map(Number);
        endTime = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
      
      if (els.currentActivityTime) {
        els.currentActivityTime.textContent = `${formatTimeDisplay(startTime)} - ${formatTimeDisplay(endTime)}`;
      }
      
      if (els.nextActivityText) {
        els.nextActivityText.textContent = nextRowTime ? `Järgmine: ${nextName} kell ${nextRowTime}` : `Järgmine: Lõpp`;
      }
      els.currentActivityCard.style.display = 'block';
    } else {
      if (els.currentActivityName) els.currentActivityName.textContent = "Lasterühm suletud";
      if (els.currentActivityTime) els.currentActivityTime.textContent = "Prooviaeg: 10:00 – 12:00";
      if (els.nextActivityText) {
        const tomorrow = new Date(state.currentDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDay = DAY_NAMES[tomorrow.getDay()];
        const firstSlot = sortedRows[0];
        const firstActivity = firstSlot ? (firstSlot.days[tomorrowDay] || 'Saabumine') : '';
        els.nextActivityText.textContent = firstSlot ? `Homme: ${firstActivity} kell ${formatTimeDisplay(firstSlot.time)}` : '';
      }
    }
  }
}

function updateProgressBar(isSelectedDateToday: boolean) {
  if (!els.dayProgressBar) return;
  
  if (!isSelectedDateToday) {
    els.dayProgressBar.style.width = '0%';
    return;
  }
  
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  
  // Kindergarten timetable operates between 7 AM (7.0) and 8 PM (20.0)
  const startHour = 7.0;
  const endHour = 20.0;
  const totalHours = endHour - startHour;
  
  if (currentHour < startHour) {
    els.dayProgressBar.style.width = '0%';
  } else if (currentHour > endHour) {
    els.dayProgressBar.style.width = '100%';
  } else {
    const percentage = ((currentHour - startHour) / totalHours) * 100;
    els.dayProgressBar.style.width = `${percentage}%`;
  }
}

async function renderTodayLog() {
  if (!els.todayLogContainer) return;
  
  const dateStr = formatISODate(state.currentDate);
  const log = state.logs.get(dateStr);
  
  if (log) {
    const html = await marked.parse(log.markdownContent);
    if (els.todayLogContainer) {
      els.todayLogContainer.innerHTML = html;
      refreshIcons(els.todayLogContainer);
    }
  } else {
    els.todayLogContainer.innerHTML = `
      <div class="empty-state">
        <i data-lucide="edit-3" class="empty-icon"></i>
        <p>Sellel päeval pole märkmeid.</p>
        <span class="empty-subtext">Märkmete lisamiseks muuda faili <code>content/logs.md</code>.</span>
      </div>
    `;
    refreshIcons(els.todayLogContainer);
  }
}

// WEEK TAB RENDERING
function renderWeekTab() {
  if (!els.weekGridHeaders || !els.weekGridBody) return;

  // Render headers
  els.weekGridHeaders.innerHTML = '<th>Kellaaeg</th>';
  ESTONIAN_DAYS.forEach(day => {
    const isTodayColumn = DAY_NAMES[new Date().getDay()] === day;
    
    const th = document.createElement('th');
    if (isTodayColumn) th.className = 'active-day';
    th.textContent = DAY_LABELS[day] ?? day.substring(0, 3);
    th.title = DAY_LABELS_FULL[day] ?? day;
    
    // Clicking header navigates to that day
    th.addEventListener('click', () => {
      const diff = ESTONIAN_DAYS.indexOf(day) - ESTONIAN_DAYS.indexOf(DAY_NAMES[state.currentDate.getDay()]);
      navigateDay(diff);
      switchTab('today');
    });
    
    els.weekGridHeaders?.appendChild(th);
  });

  // Render rows
  els.weekGridBody.innerHTML = '';
  
  // Sort rows by time
  const sortedRows = [...state.timetable].sort((a, b) => {
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });

  // System status
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const systemDayName = DAY_NAMES[now.getDay()];

  sortedRows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    
    // Time cell
    const timeCell = document.createElement('td');
    timeCell.className = 'time-cell';
    timeCell.textContent = formatTimeDisplay(row.time);
    tr.appendChild(timeCell);

    // Calculate active cell status
    const startMin = timeToMinutes(row.time);
    let endMin = startMin + 60;
    if (rowIndex < sortedRows.length - 1) {
      endMin = timeToMinutes(sortedRows[rowIndex + 1].time);
    }
    const isCurrentTimeRow = currentMinutes >= startMin && currentMinutes < endMin;

    // Day cells
    ESTONIAN_DAYS.forEach(day => {
      const cell = document.createElement('td');
      const val = row.days[day] || '';
      cell.textContent = val;

      const isCurrentDayColumn = systemDayName === day;
      if (isCurrentDayColumn && isCurrentTimeRow) {
        cell.className = 'active-cell';
        cell.title = "Praegu aktiivne";
      }

      tr.appendChild(cell);
    });

    els.weekGridBody?.appendChild(tr);
  });
}

// LOGS TAB RENDERING
function renderLogsTab() {
  renderLogsSidebar();
  renderLogDetail();
}

function renderLogsSidebar() {
  if (!els.logsListMenu) return;
  els.logsListMenu.innerHTML = '';

  const searchQuery = (els.logSearchInput as HTMLInputElement)?.value.toLowerCase() || '';

  // Get keys, sort descending (newest first)
  const keys = Array.from(state.logs.keys()).sort((a, b) => b.localeCompare(a));
  
  const filteredKeys = keys.filter(date => {
    const log = state.logs.get(date);
    if (!log) return false;
    return date.includes(searchQuery) || log.markdownContent.toLowerCase().includes(searchQuery);
  });

  if (filteredKeys.length === 0) {
    els.logsListMenu.innerHTML = `<div style="padding: 16px; font-size:12px; color:var(--text-muted);">Otsing ei andnud tulemusi</div>`;
    return;
  }

  filteredKeys.forEach(date => {
    const btn = document.createElement('button');
    btn.className = `log-menu-item ${state.selectedLogDate === date ? 'active' : ''}`;
    
    const formattedDate = formatLogDateString(date);
    btn.innerHTML = `
      <div style="font-weight:600; margin-bottom: 2px;">${formattedDate}</div>
      <div style="font-size:11px; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
        ${stripMarkdown(state.logs.get(date)?.markdownContent || '')}
      </div>
    `;

    btn.addEventListener('click', () => {
      state.selectedLogDate = date;
      // Re-render sidebar to highlight active
      const allButtons = els.logsListMenu?.querySelectorAll('.log-menu-item');
      allButtons?.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLogDetail();
    });

    els.logsListMenu?.appendChild(btn);
  });
}

async function renderLogDetail() {
  if (!els.logDetailContent) return;

  const log = state.logs.get(state.selectedLogDate);
  if (log) {
    const html = await marked.parse(log.markdownContent);
    if (els.logDetailContent) {
      els.logDetailContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:16px; margin-bottom:20px;">
          <h2 style="font-family:var(--font-title); font-size:24px; font-weight:700;">${formatLogDateString(state.selectedLogDate)}</h2>
          <span style="font-size:12px; color:var(--text-muted); font-family:monospace;">${state.selectedLogDate}</span>
        </div>
        <div class="markdown-body">
          ${html}
        </div>
      `;
      refreshIcons(els.logDetailContent);
    }
  } else {
    els.logDetailContent.innerHTML = `
      <div class="empty-state" style="padding: 80px 20px;">
        <i data-lucide="book-open" class="empty-icon"></i>
        <p>Ükski päevikmärge pole valitud.</p>
        <span class="empty-subtext">Vali kuupäev vasakult külgribalt.</span>
      </div>
    `;
    refreshIcons(els.logDetailContent);
  }
}

// Helpers
function navigateDay(offset: number) {
  const newDate = new Date(state.currentDate);
  newDate.setDate(newDate.getDate() + offset);
  state.currentDate = newDate;
  renderAll();
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString('et-EE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatLogDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('et-EE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function getActivityIcon(activity: string): string {
  const val = activity.toLowerCase();
  if (val.includes('prooviaeg') || val.includes('proov')) return '🌟';
  if (val.includes('breakfast') || val.includes('eat') || val.includes('meal')) return '🍳';
  if (val.includes('lunch') || val.includes('soup') || val.includes('dinner')) return '🥣';
  if (val.includes('snack') || val.includes('fruit')) return '🍎';
  if (val.includes('nap') || val.includes('sleep') || val.includes('rest') || val.includes('quiet')) return '😴';
  if (val.includes('music') || val.includes('sing') || val.includes('song')) return '🎵';
  if (val.includes('art') || val.includes('paint') || val.includes('draw') || val.includes('craft')) return '🎨';
  if (val.includes('math') || val.includes('count') || val.includes('number')) return '🔢';
  if (val.includes('read') || val.includes('story') || val.includes('book')) return '📖';
  if (val.includes('outdoor') || val.includes('play') || val.includes('yard') || val.includes('sand') || val.includes('park')) return '☀️';
  if (val.includes('closed') || val.includes('close')) return '🔒';
  if (val.includes('arrival') || val.includes('welcome') || val.includes('open')) return '👋';
  if (val.includes('pickup') || val.includes('home') || val.includes('leave')) return '🎒';
  return '⭐️'; // Default star icon
}

function stripMarkdown(md: string): string {
  return md
    .replace(/[#*`_\[\]()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

function refreshIcons(container: HTMLElement | null) {
  if (container && (window as any).lucide) {
    (window as any).lucide.createIcons({
      attrs: {
        class: 'lucide-icon'
      },
      nameAttr: 'data-lucide',
      node: container
    });
  }
}
