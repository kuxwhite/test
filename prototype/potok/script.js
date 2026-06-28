/* ===================== Поток — прототип ======================
   Физика и пороги:
   - Переход зума: 420ms, cubic-bezier(0.34,1.56,0.64,1) (пружина с перелётом)
   - Long-press: 500ms до открытия контекстного меню, haptic ~10ms
   - Рентген pull-to-reveal: порог раскрытия 110px по перпендикулярной оси
     - <50% дистанции к порогу -> пружинный откат 280ms ease-out
     - >=порог -> полное раскрытие 260ms, открывается документ
   - Junk threshold (значимость) < 0.22 -> уходит в папку/периферию
   - Снап недели: scroll-snap-type x proximity (мягкий, не блокирующий)
================================================================ */

const STAGE = document.getElementById('stage');
const DAY_HEADER = document.getElementById('dayHeader');
const ZOOM_SWITCH = document.getElementById('zoomSwitch');
const ZOOM_THUMB = document.getElementById('zoomThumb');
const HINT_PILL = document.getElementById('hintPill');

const JUNK_THRESHOLD = 0.22;
const XRAY_THRESHOLD = 110; // px
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

let state = { level: 'day', dayIndex: 2, momentEventIndex: 0 };

/* ---------- Mock data ---------- */
function seedPhoto(seed, w = 600, h = 750) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

function genEvents(dayIdx) {
  const counts = [3, 6, 2, 9, 4, 7, 5];
  const n = counts[dayIdx % counts.length];
  const events = [];
  for (let i = 0; i < n; i++) {
    const significance = +(Math.random() * (i === 0 ? 1 : 0.95) + (i === 0 ? 0.2 : 0)).toFixed(2);
    events.push({
      id: `d${dayIdx}-e${i}`,
      src: seedPhoto(`d${dayIdx}-${i}`),
      significance: i === 0 ? Math.max(significance, 0.7) : significance,
      hour: 8 + Math.floor((i / n) * 13),
      isJunk: false,
    });
  }
  // распределяем значимость по убыванию, чтобы было "тяжёлое" событие
  events.sort((a, b) => b.significance - a.significance);
  events.forEach((e, i) => { if (e.significance < JUNK_THRESHOLD) e.isJunk = true; });
  return events;
}

const MOODS = ['Тёплый день', 'Дорога домой', 'Тишина', 'Сборы', 'Морской бриз', 'Город гудит', 'Воскресный ритм'];
const WEATHER = ['☀️ +23°', '⛅ +18°', '🌧 +14°', '☀️ +26°', '🌙 +12°', '☁️ +17°', '☀️ +21°'];

const WEEK = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(2025, 5, 16 + i);
  return {
    date,
    mood: MOODS[i],
    weather: WEATHER[i],
    hasDocs: i === 1 || i === 4,
    docs: (i === 1 || i === 4) ? [
      { title: i === 1 ? 'Посадочный талон' : 'Чек из аптеки', icon: '✈️' },
    ] : [],
    events: genEvents(i),
  };
});

function fmtDate(d) {
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
}

/* ===================== RENDER: DAY (horizontal stream, по часам) ===================== */
function buildCard(ev, day, idx, listLen, onTap) {
  const scale = 0.55 + ev.significance * 0.45; // гравитация значимости -> размер
  const card = document.createElement('div');
  card.className = 'card';
  if (day.hasDocs && Math.abs(idx - Math.floor(listLen / 2)) < 1) card.classList.add('card--doc-near');
  const h = Math.round(window.innerHeight * 0.62 * scale);
  card.style.height = h + 'px';
  card.style.width = Math.round(h * 0.78) + 'px';
  card.style.marginTop = (idx % 2 === 0 ? -1 : 1) * (10 + ev.significance * 14) + 'px';
  card.style.transform = `rotate(${(idx % 2 === 0 ? -1 : 1) * (2 + Math.random() * 3)}deg)`;
  card.innerHTML = `<img src="${ev.src}" alt=""><span class="card-label">${ev.hour}:00</span>`;
  attachLongPress(card, ev);
  if (onTap) card.addEventListener('click', () => { if (!card.classList.contains('card--pressed')) onTap(); });
  return card;
}

function renderDay(dayIdx) {
  const day = WEEK[dayIdx];
  const visible = day.events.filter(e => !e.isJunk);
  const junk = day.events.filter(e => e.isJunk);

  STAGE.className = 'stage stage--day';
  const canvas = document.createElement('div');
  canvas.className = 'stage-canvas';

  visible.forEach((ev, i) => {
    const card = buildCard(ev, day, i, visible.length, () => {
      state.dayIndex = dayIdx;
      state.momentEventIndex = day.events.indexOf(ev);
      setLevel('moment');
    });
    canvas.appendChild(card);
  });

  if (junk.length) {
    const tile = document.createElement('div');
    tile.className = 'junk-tile';
    tile.innerHTML = `<span class="junk-icon">🗂️</span><span>вот тут всё лежит (${junk.length})</span>`;
    tile.addEventListener('click', () => openJunkModal(junk));
    canvas.appendChild(tile);
  }

  STAGE.innerHTML = '';
  STAGE.appendChild(canvas);
  STAGE.scrollLeft = 0;
  updateDayHeader(day);
  attachXray(STAGE, dayIdx);
}

/* ===================== RENDER: WEEK (один непрерывный поток по всем дням) ===================== */
function renderWeek() {
  STAGE.className = 'stage stage--week';
  const canvas = document.createElement('div');
  canvas.className = 'stage-canvas';

  WEEK.forEach((day, dayIdx) => {
    const sep = document.createElement('div');
    sep.className = 'week-sep' + (day.hasDocs ? ' has-docs' : '');
    sep.innerHTML = `
      <span class="week-sep-weekday">${day.date.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
      <span class="week-sep-date">${day.date.getDate()} июня</span>
      <span class="week-sep-mood">${day.mood}</span>
    `;
    canvas.appendChild(sep);

    const visible = day.events.filter(e => !e.isJunk);
    visible.forEach((ev, i) => {
      const card = buildCard(ev, day, i, visible.length, () => {
        state.dayIndex = dayIdx;
        state.momentEventIndex = day.events.indexOf(ev);
        setLevel('moment');
      });
      canvas.appendChild(card);
    });
  });

  STAGE.innerHTML = '';
  STAGE.appendChild(canvas);
  STAGE.scrollLeft = 0;
  DAY_HEADER.style.opacity = 0;
  attachXray(STAGE, state.dayIndex);
}

/* ===================== RENDER: MOMENT (на весь экран, горизонтальный свайп) ===================== */
function renderMoment(dayIdx, startEventIdx = 0) {
  const day = WEEK[dayIdx];
  STAGE.className = 'stage stage--moment';
  const wrap = document.createElement('div');
  wrap.className = 'stage-canvas';

  day.events.forEach((ev, i) => {
    const sec = document.createElement('section');
    sec.className = 'moment-section';
    const peekDoc = day.hasDocs && Math.abs(ev.hour - (day.events[Math.floor(day.events.length/2)].hour)) <= 1;
    sec.innerHTML = `
      <div class="moment-card">
        <img src="${ev.src}" alt="">
        <span class="moment-time">${ev.hour}:00</span>
      </div>
      ${peekDoc ? '<div class="moment-edge-peek">📄</div>' : ''}
    `;
    attachLongPress(sec.querySelector('.moment-card'), ev);
    wrap.appendChild(sec);
  });

  STAGE.innerHTML = '';
  STAGE.appendChild(wrap);
  updateDayHeader(day);
  requestAnimationFrame(() => {
    const sections = wrap.querySelectorAll('.moment-section');
    if (sections[startEventIdx]) sections[startEventIdx].scrollIntoView();
  });
  attachXray(STAGE, dayIdx);
}

/* ---------- Day header ---------- */
function updateDayHeader(day) {
  DAY_HEADER.style.opacity = 1;
  document.getElementById('dayHeaderDate').textContent = fmtDate(day.date);
  document.getElementById('dayHeaderMood').textContent = day.mood;
  document.getElementById('dayHeaderMeta').textContent = day.weather + (day.hasDocs ? ' · есть документы' : '');
}

/* ---------- Zoom switching ---------- */
const LEVELS = ['moment', 'day', 'week'];
function setLevel(level) {
  state.level = level;
  ZOOM_SWITCH.querySelectorAll('.zoom-tab').forEach(t => t.classList.toggle('active', t.dataset.level === level));
  ZOOM_THUMB.style.transform = `translateX(${LEVELS.indexOf(level) * 100}%)`;
  STAGE.style.opacity = 0;
  setTimeout(() => {
    if (level === 'day') renderDay(state.dayIndex);
    if (level === 'week') renderWeek();
    if (level === 'moment') renderMoment(state.dayIndex, state.momentEventIndex);
    STAGE.style.opacity = 1;
  }, 120);
}

ZOOM_SWITCH.addEventListener('click', (e) => {
  const btn = e.target.closest('.zoom-tab');
  if (btn) setLevel(btn.dataset.level);
});

/* pinch gesture to change zoom level (two fingers) */
let pinchStartDist = null;
document.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    pinchStartDist = dist(e.touches[0], e.touches[1]);
  }
}, { passive: true });
document.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2 && pinchStartDist) {
    const d = dist(e.touches[0], e.touches[1]);
    const ratio = d / pinchStartDist;
    if (ratio > 1.35) { pinchStartDist = null; zoomStep(-1); }
    else if (ratio < 0.7) { pinchStartDist = null; zoomStep(1); }
  }
}, { passive: true });
document.addEventListener('touchend', () => { pinchStartDist = null; });
function dist(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
function zoomStep(dir) {
  const i = LEVELS.indexOf(state.level);
  const next = LEVELS[Math.min(2, Math.max(0, i + dir))];
  if (next !== state.level) setLevel(next);
}

/* ---------- Long press context menu ---------- */
const ctxMenu = document.getElementById('contextMenu');
const ctxBackdrop = document.getElementById('contextMenuBackdrop');
let pressTimer = null, activeCard = null;

function attachLongPress(el, ev) {
  el.addEventListener('touchstart', (e) => {
    activeCard = el;
    pressTimer = setTimeout(() => {
      el.classList.add('card--pressed');
      vibrate(10);
      openContextMenu(e.touches[0].clientX, e.touches[0].clientY);
    }, 500);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach(type =>
    el.addEventListener(type, () => { clearTimeout(pressTimer); }, { passive: true })
  );
}

function openContextMenu(x, y) {
  ctxBackdrop.classList.add('show');
  ctxMenu.classList.add('show');
  const top = Math.min(y, window.innerHeight - 260);
  const left = Math.min(x, window.innerWidth - 220);
  ctxMenu.style.top = top + 'px';
  ctxMenu.style.left = Math.max(12, left - 100) + 'px';
}
function closeContextMenu() {
  ctxMenu.classList.remove('show');
  ctxBackdrop.classList.remove('show');
  if (activeCard) activeCard.classList.remove('card--pressed');
  activeCard = null;
}
ctxBackdrop.addEventListener('click', closeContextMenu);
ctxMenu.addEventListener('click', (e) => {
  if (e.target.dataset.action) closeContextMenu();
});

function vibrate(ms) { if (navigator.vibrate) navigator.vibrate(ms); }

/* ---------- X-ray pull-to-reveal ---------- */
const xrayOverlay = document.getElementById('xrayOverlay');
const xrayProgress = document.getElementById('xrayProgress');
const xrayCard = document.getElementById('xrayCard');
const xrayTitle = document.getElementById('xrayTitle');
const xrayDistance = document.getElementById('xrayDistance');
const xrayEmpty = document.getElementById('xrayEmpty');

/* Основная ось везде горизонтальная (листание времени/дней) ->
   рентген всегда строго перпендикулярен: только вертикальный свайп. */
function attachXray(container, dayIdx) {
  let startX = 0, startY = 0, dragging = false, locked = null;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    dragging = true; locked = null;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!dragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!locked) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      // вертикальное движение должно заметно доминировать, иначе это листание времени
      locked = (Math.abs(dy) > Math.abs(dx) * 1.3) ? 'xray' : 'scroll';
    }
    if (locked !== 'xray') return;
    e.preventDefault();
    const progress = Math.min(1, Math.abs(dy) / XRAY_THRESHOLD);
    showXrayProgress(progress, dy, dayIdx);
  }, { passive: false });

  container.addEventListener('touchend', () => {
    if (locked === 'xray') {
      const progress = parseFloat(xrayOverlay.dataset.progress || '0');
      if (progress >= 1) revealXrayFull(dayIdx);
      else springBackXray();
    }
    dragging = false; locked = null;
  });
}

function showXrayProgress(progress, dy, dayIdx) {
  xrayOverlay.dataset.progress = progress;
  xrayOverlay.style.transition = 'none';
  xrayOverlay.classList.add('active');
  xrayOverlay.style.opacity = progress;
  xrayOverlay.style.clipPath = dy < 0
    ? `inset(${100 - progress * 100}% 0 0 0)`   // свайп вверх -> раскрытие снизу вверх
    : `inset(0 0 ${100 - progress * 100}% 0)`;  // свайп вниз -> раскрытие сверху вниз
  fillXrayContent(dayIdx);
}

function fillXrayContent(dayIdx) {
  const day = WEEK[dayIdx];
  if (day.hasDocs) {
    xrayCard.style.display = 'block';
    xrayEmpty.style.display = 'none';
    xrayTitle.textContent = day.docs[0].title;
    xrayDistance.textContent = 'найдено именно за этот день';
  } else {
    const near = WEEK.map((d, i) => ({ d, dist: Math.abs(i - dayIdx) })).filter(x => x.d.hasDocs).sort((a, b) => a.dist - b.dist)[0];
    if (near) {
      xrayTitle.textContent = near.d.docs[0].title;
      xrayDistance.textContent = `≈ за ${near.dist} ${near.dist === 1 ? 'день' : 'дня'} от этого момента`;
      xrayEmpty.style.display = 'none';
    } else {
      xrayTitle.textContent = '';
      xrayDistance.textContent = '';
      xrayEmpty.style.display = 'block';
    }
  }
}

function springBackXray() {
  xrayOverlay.style.transition = `opacity 280ms ease-out, clip-path 280ms ease-out`;
  xrayOverlay.style.opacity = 0;
  xrayOverlay.style.clipPath = 'inset(0 100% 0 0)';
  setTimeout(() => xrayOverlay.classList.remove('active'), 280);
}

function revealXrayFull(dayIdx) {
  xrayOverlay.style.transition = `opacity 260ms ease, clip-path 260ms ease`;
  xrayOverlay.style.opacity = 1;
  xrayOverlay.style.clipPath = 'inset(0 0% 0 0)';
  vibrate(8);
  setTimeout(() => {
    xrayOverlay.addEventListener('click', closeXray, { once: true });
  }, 200);
}
function closeXray() { springBackXray(); }

/* ---------- Junk modal ---------- */
const junkBackdrop = document.getElementById('junkModalBackdrop');
const junkModal = document.getElementById('junkModal');
const junkGrid = document.getElementById('junkGrid');
let currentJunk = [];

function openJunkModal(items) {
  currentJunk = items;
  junkGrid.innerHTML = items.map(it => `<img src="${it.src}" alt="">`).join('');
  junkBackdrop.classList.add('show');
  junkModal.classList.add('show');
}
function closeJunkModal() {
  junkBackdrop.classList.remove('show');
  junkModal.classList.remove('show');
}
junkBackdrop.addEventListener('click', closeJunkModal);
document.getElementById('junkRestoreBtn').addEventListener('click', () => {
  currentJunk.forEach(it => it.isJunk = false);
  closeJunkModal();
  renderDay(state.dayIndex);
});

/* ---------- Hint pill (onboarding) ---------- */
function showHint(text) {
  HINT_PILL.textContent = text;
  HINT_PILL.classList.add('show');
  setTimeout(() => HINT_PILL.classList.remove('show'), 2600);
}
setTimeout(() => showHint('Свайп вбок — рентген, щипок — масштаб времени'), 700);

/* ---------- Init ---------- */
setLevel('day');
