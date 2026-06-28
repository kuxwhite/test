/* ===================== Главная — прототип ======================
   Модель B (динамическая): карточки собираются из 3 семейств:
   - urgent: срочные/утилитарные (рейсы, чеки, напоминания)
   - emotional: эмоциональные триггеры ("год назад", сезонные воспоминания)
   - fresh: свежее/продолжающееся (последняя серия снимков)
   Лимит: 1 доминантная + 2-3 меньшие. Визуально статичный, спокойный темп —
   в отличие от "живой" композиции Потока.
================================================================ */

const FEED = document.getElementById('feed');
const GREETING = document.getElementById('greeting');
const DATE_LINE = document.getElementById('dateLine');
const STORY_BACKDROP = document.getElementById('storyBackdrop');
const STORY_SHEET = document.getElementById('storySheet');
const STORY_MEDIA = document.getElementById('storyMedia');
const STORY_TITLE = document.getElementById('storyTitle');
const STORY_TEXT = document.getElementById('storyText');
const STORY_CTA = document.getElementById('storyCta');
const STORY_CLOSE = document.getElementById('storyClose');

function seedPhoto(seed, w = 700, h = 900) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

function greetingForHour(h) {
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

const now = new Date();
GREETING.textContent = greetingForHour(now.getHours());
DATE_LINE.textContent = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });

/* ---------- Card pool (3 families), priority: urgent > emotional > fresh ---------- */
const CARDS = [
  {
    id: 'flight', family: 'urgent', dominant: true,
    kicker: 'Завтра', title: 'Посадочный талон на рейс SU 1840',
    img: seedPhoto('flight-doc', 900, 1100),
    story: 'Завтра в 14:35 — рейс SU 1840. Талон и документы уже разложены в Потоке рядом с этим днём.',
    dayIndex: 4,
  },
  {
    id: 'memory', family: 'emotional',
    kicker: 'Год назад', title: 'Эта же неделя, прошлым летом',
    icon: '◐',
    story: 'Ровно год назад в эти дни вы были в дороге — сохранилось несколько кадров и пара заметок.',
    dayIndex: 1,
  },
  {
    id: 'fresh', family: 'fresh',
    kicker: 'Продолжение', title: 'Сегодняшняя серия — 7 новых кадров',
    icon: '✦',
    story: 'С утра добавилось 7 новых снимков. Они уже легли в сегодняшний день в Потоке.',
    dayIndex: 2,
  },
  {
    id: 'receipt', family: 'urgent',
    kicker: 'Документ', title: 'Чек из аптеки — на этой неделе',
    icon: '▤',
    story: 'На этой неделе появился чек из аптеки. Найдётся рядом с фото того дня в Потоке.',
    dayIndex: 1,
  },
];

function pickCards() {
  const dominant = CARDS.find(c => c.dominant);
  const rest = CARDS.filter(c => !c.dominant).slice(0, 3);
  return { dominant, rest };
}

function render() {
  const { dominant, rest } = pickCards();
  FEED.innerHTML = '';

  if (dominant) {
    const el = document.createElement('div');
    el.className = 'g-card g-card--dominant';
    el.innerHTML = `
      <img src="${dominant.img}" alt="">
      <div class="g-card-overlay">
        <div class="g-card-kicker">${dominant.kicker}</div>
        <div class="g-card-title">${dominant.title}</div>
      </div>`;
    el.addEventListener('click', () => openStory(dominant));
    FEED.appendChild(el);
  }

  const row = document.createElement('div');
  row.className = 'g-row';
  rest.forEach(c => {
    const el = document.createElement('div');
    el.className = 'g-card g-card--small' + (c.family === 'emotional' ? ' g-card--emotional' : '');
    el.innerHTML = `
      <div class="g-card-icon">${c.icon || '•'}</div>
      <div>
        <div class="g-card-kicker">${c.kicker}</div>
        <div class="g-card-title">${c.title}</div>
      </div>`;
    el.addEventListener('click', () => openStory(c));
    row.appendChild(el);
  });
  FEED.appendChild(row);
}

/* ---------- Mini-story sheet ---------- */
function openStory(card) {
  STORY_TITLE.textContent = card.title;
  STORY_TEXT.textContent = card.story;
  STORY_MEDIA.innerHTML = card.img ? `<img src="${card.img}" alt="">` : '';
  STORY_MEDIA.style.display = card.img ? '' : 'none';
  STORY_CTA.onclick = () => {
    window.location.href = `../potok/index.html?day=${card.dayIndex}`;
  };
  STORY_BACKDROP.classList.add('show');
  STORY_SHEET.classList.add('show');
}
function closeStory() {
  STORY_BACKDROP.classList.remove('show');
  STORY_SHEET.classList.remove('show');
}
STORY_BACKDROP.addEventListener('click', closeStory);
STORY_CLOSE.addEventListener('click', closeStory);

render();
