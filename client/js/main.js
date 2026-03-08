// Entry point for client app
import {
  getProperties,
  registerUser,
  loginUser,
  getReservations,
  adminLogin,
  adminLogout,
  deleteReservation,
  getRegisteredUsers,
  askAssistant
} from './api.js';

const grid = document.getElementById('properties-grid');
const mainContainer = document.querySelector('main.o-container');
const filtersForm = document.getElementById('filters-form');
const searchInput = document.getElementById('filter-search');
const minInput = document.getElementById('filter-min');
const maxInput = document.getElementById('filter-max');
const nav = document.getElementById('primary-nav');
const navLinks = Array.from(document.querySelectorAll('.c-navbar__link'));
const navToggle = document.querySelector('.c-navbar__toggle');
const themeToggle = document.querySelector('.c-navbar__theme');
const brandLogo = document.getElementById('brand-logo');
const views = Array.from(document.querySelectorAll('.js-view'));
const registerForm = document.getElementById('form-register');
const loginForm = document.getElementById('form-login');
const registerFeedback = document.getElementById('register-feedback');
const loginFeedback = document.getElementById('login-feedback');
// Correctos para la tabla
const reservationsBody = document.getElementById('reservations-tbody');
const reservationsFeedback = document.getElementById('reservations-feedback');
const refreshReservationsBtn = document.getElementById('btn-reservations-refresh');
const exportCsvBtn = document.getElementById('btn-export-csv');
const exportXlsxBtn = document.getElementById('btn-export-xlsx');

const usersBody = document.getElementById('users-tbody');
const usersFeedback = document.getElementById('users-feedback');
const refreshUsersBtn = document.getElementById('btn-users-refresh');
const exportUsersBtn = document.getElementById('btn-users-export');
const adminLogoutBtn = document.getElementById('btn-admin-logout');
const adminModal = document.getElementById('admin-modal');
const adminForm = document.getElementById('admin-login-form');
const adminUserInput = document.getElementById('admin-username');
const adminPassInput = document.getElementById('admin-password');
const adminFeedback = document.getElementById('admin-feedback');
const adminCloseBtn = document.querySelector('.c-modal__close');
const adminCancelBtn = document.getElementById('admin-cancel');
const adminSubmitBtn = document.getElementById('admin-submit');
const adminLink = Array.from(navLinks).find((l) => l.dataset.view === 'admin');
const statsContainer = document.getElementById('reservations-stats');
const filterProperty = document.getElementById('filter-property');
const filterCountry = document.getElementById('filter-country');
const usersStatsEl = document.getElementById('users-stats');

let allProperties = [];
let reservationsLoaded = false;
let isAdminAuthed = Boolean(localStorage.getItem('adminToken'));
let reservationsCache = [];
let usersCache = [];
let usersLoaded = false;
let botLocale = null;
let botLocaleConfirmed = false;

const botI18n = {
  'es-419': {
    title: 'Stylo-Bot',
    placeholder: 'Escribe tu consulta...',
    send: 'Enviar',
    greeting: 'Hola, soy Stylo-Bot. Puedo ayudarte con dudas de las propiedades, presupuestos y FAQs.',
    langQuestion: (langName) => `Detecté tu idioma: ${langName}. ¿Quieres que responda en ese idioma?`,
    tooltip: 'Hola, soy Stylo-Bot. Haz tu consulta.',
    error: 'No pude responder ahora. Intenta de nuevo.'
  },
  'en-US': {
    title: 'Stylo-Bot',
    placeholder: 'Ask anything about the listings...',
    send: 'Send',
    greeting: 'Hi, I am Stylo-Bot. I can help with listings, budgets and FAQs.',
    langQuestion: (langName) => `Detected your language: ${langName}. Should I reply in that language?`,
    tooltip: 'Hi, I am Stylo-Bot. Ask your question.',
    error: 'I could not reply right now. Try again.'
  },
  'pt-BR': {
    title: 'Stylo-Bot',
    placeholder: 'Digite sua dúvida sobre os imóveis...',
    send: 'Enviar',
    greeting: 'Olá, sou o Stylo-Bot. Posso ajudar com imóveis, orçamentos e FAQs.',
    langQuestion: (langName) => `Detectei seu idioma: ${langName}. Quer que eu responda nele?`,
    tooltip: 'Olá, sou o Stylo-Bot. Faça sua pergunta.',
    error: 'Não consegui responder agora. Tente novamente.'
  }
};

// Revalida token al cargar, para evitar estados inconsistentes tras reinicio de servidor
if (isAdminAuthed) {
  getReservations().then((resp) => {
    if (resp?.error === 'unauthorized') {
      localStorage.removeItem('adminToken');
      isAdminAuthed = false;
    }
  });
}

const formatPrice = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value || 0);

function renderProperties(list = allProperties) {
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = '<p class="u-text-center">No hay propiedades disponibles con estos filtros.</p>';
    return;
  }

  grid.innerHTML = list.map((p) => `
    <a class="c-property-card" href="property.html?id=${p.id}">
      <img src="${p.image_url}" alt="${p.title}">
      <div class="c-property-card__body">
        <h3>${p.title}</h3>
        <p>${p.location}</p>
        <span>${formatPrice(p.price_per_night)} / noche</span>
      </div>
    </a>
  `).join('');
}

function applyFilters() {
  if (!allProperties.length) return;

  const term = (searchInput?.value || '').toLowerCase().trim();
  const min = Number(minInput?.value) || null;
  const max = Number(maxInput?.value) || null;

  const filtered = allProperties.filter((p) => {
    const matchesTerm = term
      ? `${p.title} ${p.location} ${p.description || ''}`.toLowerCase().includes(term)
      : true;

    const price = Number(p.price_per_night) || 0;
    const matchesMin = min !== null ? price >= min : true;
    const matchesMax = max !== null && max > 0 ? price <= max : true;

    return matchesTerm && matchesMin && matchesMax;
  });

  renderProperties(filtered);
}

async function loadProperties() {
  allProperties = await getProperties();
  renderProperties();
}

function showView(viewName) {
  if (viewName === 'admin' && !isAdminAuthed) {
    openAdminModal();
    return;
  }

  views.forEach((section) => {
    const match = section.id === `view-${viewName}`;
    section.hidden = !match;
    section.classList.toggle('is-active', match);
  });

  navLinks.forEach((link) => {
    const isActive = link.dataset.view === viewName;
    link.classList.toggle('is-active', isActive);
  });

  if (mainContainer) {
    mainContainer.classList.toggle('is-wide', viewName === 'admin');
  }

  closeNavMobile();

  if (viewName === 'admin' && !reservationsLoaded) {
    loadReservations();
  }

  if (viewName === 'admin' && !usersLoaded) {
    loadUsers();
  }
}

function setupNavigation() {
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.view;
      if (target) showView(target);
    });
  });

  navToggle?.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    const next = !expanded;
    navToggle.setAttribute('aria-expanded', String(next));
    nav?.classList.toggle('is-open', next);
    navToggle.classList.toggle('is-open', next);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
      nav?.classList.remove('is-open');
      navToggle?.classList.remove('is-open');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
  });
}

function closeNavMobile() {
  if (!nav || !navToggle) return;
  if (window.innerWidth > 1024) return;
  nav.classList.remove('is-open');
  navToggle.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
}

function setBrandLogo(mode) {
  if (!brandLogo) return;
  const light = brandLogo.dataset.light;
  const light2x = brandLogo.dataset.light2x;
  const dark = brandLogo.dataset.dark;
  const dark2x = brandLogo.dataset.dark2x;
  const useDark = mode === 'dark';
  const src = useDark ? dark : light;
  const src2x = useDark ? dark2x : light2x;
  if (src) brandLogo.setAttribute('src', src);
  if (src2x) brandLogo.setAttribute('srcset', `${src} 1x, ${src2x} 2x`);
}

function applyTheme(mode) {
  const isDark = mode === 'dark';
  document.body.classList.toggle('theme-dark', isDark);
  themeToggle?.setAttribute('aria-pressed', String(isDark));
  themeToggle?.classList.toggle('is-dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  setBrandLogo(mode);
}

function setupThemeToggle() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const mode = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(mode);

  themeToggle?.addEventListener('click', () => {
    const isDark = document.body.classList.contains('theme-dark');
    applyTheme(isDark ? 'light' : 'dark');
  });
}

const serializeForm = (form) => {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
};

const detectUserLocale = () => {
  const lang = (navigator.language || navigator.userLanguage || 'es').toLowerCase();
  if (lang.startsWith('pt')) return 'pt-BR';
  if (lang.startsWith('en')) return 'en-US';
  return 'es-419';
};

const localeName = (loc) =>
  loc === 'en-US' ? 'English' : loc === 'pt-BR' ? 'Português (Brasil)' : 'Español';

function setFeedback(el, message, ok = false) {
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('is-error', !ok);
  el.classList.toggle('is-success', ok);
}

function openAdminModal() {
  if (!adminModal) return;
  adminModal.hidden = false;
  adminModal.setAttribute('aria-hidden', 'false');
  adminUserInput?.focus();
}

function closeAdminModal() {
  if (!adminModal) return;
  adminModal.hidden = true;
  adminModal.setAttribute('aria-hidden', 'true');
  adminFeedback && setFeedback(adminFeedback, '');
  adminForm?.reset();
}

function renderReservations(items = []) {
  if (!reservationsBody) return;

  if (!items.length) {
    reservationsBody.innerHTML = '<tr><td colspan="7" class="u-text-center">Sin reservas registradas.</td></tr>';
    return;
  }

  const fmtDate = (value) => new Date(value).toLocaleDateString('es-ES');

  reservationsBody.innerHTML = items
    .map((r) => `
      <tr>
        <td data-label="ID">
          <span class="c-cell__label">ID</span>
          <span class="c-cell__value u-ellipsis u-mono">#${r.id}</span>
        </td>
        <td data-label="Propiedad">
          <span class="c-cell__label">Propiedad</span>
          <span class="c-cell__value u-ellipsis">${r.property_title || r.property_id || '—'}</span>
        </td>
        <td data-label="Huésped">
          <span class="c-cell__label">Huésped</span>
          <span class="c-cell__value u-ellipsis">${r.full_name}</span>
        </td>
        <td data-label="Contacto" class="c-cell--stack">
          <span class="c-cell__label">Contacto</span>
          <span class="c-cell__value c-cell__value--stack">
            <span class="u-ellipsis">${r.email}</span>
            ${r.phone ? `<small class="u-muted u-ellipsis">${r.phone}</small>` : ''}
          </span>
        </td>
        <td data-label="Fechas">
          <span class="c-cell__label">Fechas</span>
          <span class="c-cell__value u-ellipsis u-mono">${fmtDate(r.check_in)} → ${fmtDate(r.check_out)}</span>
        </td>
        <td data-label="Huéspedes">
          <span class="c-cell__label">Huéspedes</span>
          <span class="c-cell__value u-ellipsis u-number">${r.guests}</span>
        </td>
        <td data-label="Creada">
          <span class="c-cell__label">Creada</span>
          <span class="c-cell__value u-ellipsis u-mono">${fmtDate(r.created_at)}</span>
        </td>
        <td data-label="Acciones">
          <span class="c-cell__label">Acciones</span>
          <button class="c-btn c-btn--ghost c-btn--danger c-btn--icon js-delete-reservation" data-id="${r.id}" type="button" aria-label="Eliminar reserva" title="Eliminar">
            <span aria-hidden="true" class="c-btn__icon"></span>
          </button>
        </td>
      </tr>
    `)
    .join('');
}

function renderReservationsTable(rows) {
  const tbody = document.getElementById('reservations-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => `
    <tr class="c-table__row">
      <td class="c-table__cell u-mono"><span class="c-table__label">ID</span>${r.id}</td>
      <td class="c-table__cell"><span class="c-table__label">Propiedad</span>${r.property_title ?? '—'}</td>
      <td class="c-table__cell"><span class="c-table__label">Huésped</span>${r.full_name}</td>
      <td class="c-table__cell"><span class="c-table__label">Contacto</span>${r.email}${r.phone ? ' · ' + r.phone : ''}</td>
      <td class="c-table__cell u-mono"><span class="c-table__label">Check-in</span>${r.check_in}</td>
      <td class="c-table__cell u-mono"><span class="c-table__label">Check-out</span>${r.check_out}</td>
      <td class="c-table__cell u-number"><span class="c-table__label">Huéspedes</span>${r.guests}</td>
      <td class="c-table__cell u-mono"><span class="c-table__label">Creada</span>${r.created_at ?? ''}</td>
      <td class="c-table__cell"><span class="c-table__label">Acciones</span>
        <button class="c-btn c-btn--danger c-btn--icon js-delete-reservation" data-id="${r.id}" title="Eliminar"></button>
      </td>
    </tr>`).join('');
}

function renderUsersTable(rows) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(u => `
    <tr class="c-table__row">
      <td class="c-table__cell u-mono"><span class="c-table__label">ID</span>${u.id}</td>
      <td class="c-table__cell"><span class="c-table__label">Nombre</span>${u.full_name}</td>
      <td class="c-table__cell"><span class="c-table__label">Email</span>${u.email}</td>
      <td class="c-table__cell"><span class="c-table__label">Teléfono</span>${u.phone ?? '—'}</td>
      <td class="c-table__cell"><span class="c-table__label">País</span>${u.country ?? '—'}</td>
      <td class="c-table__cell"><span class="c-table__label">Ciudad</span>${u.city ?? '—'}</td>
      <td class="c-table__cell"><span class="c-table__label">Usuario</span>${u.username}</td>
      <td class="c-table__cell u-mono"><span class="c-table__label">Registro</span>${u.created_at ?? ''}</td>
    </tr>`).join('');
}

const escapeCsv = (value) => {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
};

const buildCsv = (items = []) => {
  const SEP = ';'; // Mejor compatibilidad con Excel en configuraciones es-ES
  const header = ['ID', 'Propiedad', 'Huésped', 'Email', 'Teléfono', 'Check-in', 'Check-out', 'Huéspedes', 'Creada'];
  const rows = items.map((r) => [
    escapeCsv(r.id),
    escapeCsv(r.property_title || r.property_id || '—'),
    escapeCsv(r.full_name),
    escapeCsv(r.email),
    escapeCsv(r.phone || ''),
    escapeCsv(new Date(r.check_in).toISOString().slice(0, 10)),
    escapeCsv(new Date(r.check_out).toISOString().slice(0, 10)),
    escapeCsv(r.guests),
    escapeCsv(new Date(r.created_at).toISOString())
  ].join(SEP));

  // Primer línea sep=; para que Excel tome correctamente el separador
  return [`sep=${SEP}`, header.join(SEP), ...rows].join('\n');
};

const buildUsersCsv = (items = []) => {
  const SEP = ';';
  const header = ['ID', 'Nombre', 'Email', 'Teléfono', 'Ciudad', 'País', 'Usuario', 'Registrado'];
  const rows = items.map((u) => [
    escapeCsv(u.id),
    escapeCsv(u.full_name),
    escapeCsv(u.email),
    escapeCsv(u.phone || ''),
    escapeCsv(u.city || ''),
    escapeCsv(u.country || ''),
    escapeCsv(u.username),
    escapeCsv(new Date(u.created_at).toISOString())
  ].join(SEP));

  return [`sep=${SEP}`, header.join(SEP), ...rows].join('\n');
};

const downloadFile = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

function handleExportCsv() {
  if (!reservationsCache.length) return;
  const csv = buildCsv(reservationsCache);
  downloadFile('reservas.csv', `\uFEFF${csv}`, 'text/csv;charset=utf-8;');
}

function handleExportXlsx() {
  if (!reservationsCache.length) return;
  const csv = buildCsv(reservationsCache);
  downloadFile('reservas.xls', `\uFEFF${csv}`, 'application/vnd.ms-excel');
}

function handleExportUsers() {
  if (!usersCache.length) return;
  const csv = buildUsersCsv(usersCache);
  downloadFile('clientes.csv', `\uFEFF${csv}`, 'text/csv;charset=utf-8;');
}

async function loadReservations() {
  if (!reservationsBody) return;
  setFeedback(reservationsFeedback, 'Cargando reservas...', true);
  const items = await getReservations();
  if (items?.error === 'unauthorized') {
    isAdminAuthed = false;
    reservationsLoaded = false;
    localStorage.removeItem('adminToken');
    setFeedback(reservationsFeedback, 'Sesión expirada. Ingresa nuevamente.', false);
    showView('home');
    openAdminModal();
    return;
  }
  const list = Array.isArray(items) ? items : [];
  reservationsCache = list;
  renderReservationsTable(list);
  setFeedback(reservationsFeedback, list.length ? `Total: ${list.length} reservas.` : 'Sin reservas registradas.', true);
  reservationsLoaded = true;
}

async function loadUsers() {
  if (!usersBody) return;
  setFeedback(usersFeedback, 'Cargando clientes...', true);
  const items = await getRegisteredUsers();
  if (items?.error === 'unauthorized') {
    isAdminAuthed = false;
    usersLoaded = false;
    localStorage.removeItem('adminToken');
    setFeedback(usersFeedback, 'Sesión expirada. Ingresa nuevamente.', false);
    showView('home');
    openAdminModal();
    return;
  }
  const list = Array.isArray(items) ? items : [];
  usersCache = list;
  renderUsersTable(list);
  setFeedback(usersFeedback, list.length ? `Total: ${list.length} clientes.` : 'Sin clientes registrados.', true);
  usersLoaded = true;
}

const formatErrors = (result) => {
  if (result?.errors?.length) {
    return `${result.message || 'Validación fallida'}: ${result.errors.join(' ')}`;
  }
  return result?.message || 'Ocurrió un error.';
};

function setupAuthForms() {
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFeedback(registerFeedback, 'Enviando...', true);
    const payload = serializeForm(registerForm);
    const result = await registerUser(payload);
    if (result.ok) {
      setFeedback(registerFeedback, 'Registro exitoso.', true);
      registerForm.reset();
    } else {
      setFeedback(registerFeedback, formatErrors(result), false);
    }
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFeedback(loginFeedback, 'Validando...', true);
    const payload = serializeForm(loginForm);
    const result = await loginUser(payload);
    if (result.ok) {
      setFeedback(loginFeedback, 'Inicio de sesión exitoso.', true);
      if (result.data?.token) {
        localStorage.setItem('userToken', result.data.token);
        localStorage.setItem('userName', result.data?.user?.full_name || result.data?.user?.username || '');
      }
      loginForm.reset();
    } else {
      setFeedback(loginFeedback, result.message || 'Credenciales inválidas.', false);
    }
  });
}

function setupAdminPanel() {
  refreshReservationsBtn?.addEventListener('click', () => {
    loadReservations();
  });
  refreshUsersBtn?.addEventListener('click', () => {
    loadUsers();
  });
  exportCsvBtn?.addEventListener('click', () => handleExportCsv());
  exportXlsxBtn?.addEventListener('click', () => handleExportXlsx());
  exportUsersBtn?.addEventListener('click', () => handleExportUsers());

  adminLogoutBtn?.addEventListener('click', () => {
    isAdminAuthed = false;
    reservationsLoaded = false;
    usersLoaded = false;
    usersCache = [];
    adminLogout();
    localStorage.removeItem('adminToken');
    showView('home');
    setFeedback(reservationsFeedback, 'Sesión cerrada.', true);
    setFeedback(usersFeedback, 'Sesión cerrada.', true);
  });

  adminCloseBtn?.addEventListener('click', () => closeAdminModal());
  adminCancelBtn?.addEventListener('click', () => closeAdminModal());

  adminModal?.addEventListener('click', (e) => {
    if (e.target === adminModal || e.target.classList.contains('c-modal__backdrop')) {
      closeAdminModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !adminModal?.hidden) {
      closeAdminModal();
    }
  });

  adminForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFeedback(adminFeedback, 'Validando...', true);
    adminSubmitBtn && (adminSubmitBtn.disabled = true);

    const user = adminUserInput?.value?.trim();
    const pass = adminPassInput?.value;

    const result = await adminLogin({ username: user, password: pass });
    if (result.ok && result.token) {
      isAdminAuthed = true;
      localStorage.setItem('adminToken', result.token);
      setFeedback(adminFeedback, 'Acceso concedido.', true);
      closeAdminModal();
      showView('admin');
    } else {
      setFeedback(adminFeedback, result.message || 'Credenciales inválidas.', false);
    }

    adminSubmitBtn && (adminSubmitBtn.disabled = false);
  });

  reservationsBody?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.js-delete-reservation');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;
    const confirmed = window.confirm('¿Eliminar esta reserva? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    setFeedback(reservationsFeedback, 'Eliminando...', true);
    btn.disabled = true;
    const result = await deleteReservation(id);
    if (result.ok) {
      reservationsCache = reservationsCache.filter((r) => String(r.id) !== String(id));
      renderReservationsTable(reservationsCache);
      setFeedback(reservationsFeedback, 'Reserva eliminada.', true);
    } else {
      setFeedback(reservationsFeedback, result.message || 'No se pudo eliminar.', false);
      btn.disabled = false;
    }
  });
}

function createBotMessage(text, role = 'bot') {
  const el = document.createElement('div');
  el.className = `c-chat__message c-chat__message--${role}`;
  el.innerText = text;
  return el;
}

const createActionRow = (children = []) => {
  const row = document.createElement('div');
  row.className = 'c-chat__actions';
  children.forEach((child) => row.appendChild(child));
  return row;
};

const createActionButton = (label, onClick) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'c-chat__action-btn';
  btn.textContent = label;
  btn.addEventListener('click', onClick, { once: true });
  return btn;
};


let botConversationId = null;
let botHistory = [];
let botIdleTimer = null;
const BOT_IDLE_MS = 30000;

function newConversationId() {
  return (crypto?.randomUUID ? crypto.randomUUID() : `conv-${Date.now()}`);
}

function resetBotConversation(reason = '') {
  botConversationId = null;
  botHistory = [];
  clearBotIdleTimer();
  if (reason) addBotMessage('bot', reason);
}

function scheduleBotIdle() {
  clearBotIdleTimer();
  botIdleTimer = setTimeout(() => {
    resetBotConversation('He cerrado la conversación por inactividad. Puedes comenzar una nueva consulta cuando quieras.');
  }, BOT_IDLE_MS);
}

function clearBotIdleTimer() {
  if (botIdleTimer) {
    clearTimeout(botIdleTimer);
    botIdleTimer = null;
  }
}

async function askAssistantWithRetry(payload, { timeoutMs = 10000, retries = 1 } = {}) {
  let attempt = 0;
  let lastError;
  const safeHistory = Array.isArray(payload.history) ? payload.history.slice(-4) : [];
  const basePayload = {
    message: payload.message,
    locale: payload.locale,
    conversationId: payload.conversationId,
    history: safeHistory
  };

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await askAssistant(basePayload, controller.signal);
      clearTimeout(timer);

      if (!res) throw new Error('Sin respuesta');
      if (res.ok === false && res.error) throw new Error(res.error || 'Respuesta inválida');

      const reply = res.reply || res.data?.reply;
      if (!reply) throw new Error('Respuesta inválida');

      return { reply };
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      attempt += 1;
      if (attempt > retries) throw lastError;
    }
  }
  throw lastError;
}

let isBotLoading = false;
const botForm = document.getElementById('property-bot-form');
const botInput = document.getElementById('property-bot-input');
const botSendBtn = document.getElementById('property-bot-send');
const botStatus = document.getElementById('property-bot-status');
const botCloseBtn = document.getElementById('property-bot-close');

function setBotStatus(message) {
  if (botStatus) botStatus.textContent = message;
}

function addBotMessage(role, text) {
  const list = document.getElementById('property-bot-messages');
  if (!list) return;
  list.appendChild(createBotMessage(text, role));
  list.scrollTop = list.scrollHeight;
}

async function handleBotSubmit(e) {
  e.preventDefault();
  if (isBotLoading) return;
  const inputVal = botInput?.value?.trim();
  if (!inputVal) return;

  if (!botConversationId) botConversationId = newConversationId();
  botHistory.push({ role: 'user', content: inputVal });

  const payload = {
    message: inputVal,
    locale: botLocale,
    conversationId: botConversationId,
    history: botHistory
  };

  isBotLoading = true;
  botSendBtn && (botSendBtn.disabled = true);
  botInput && (botInput.disabled = true);
  addBotMessage('user', inputVal);
  setBotStatus('Lia está pensando...');
  clearBotIdleTimer();

  try {
    const data = await askAssistantWithRetry(payload, { timeoutMs: 10000, retries: 1 });
    const reply = data?.reply || 'No pude responder ahora, intenta de nuevo.';
    addBotMessage('bot', reply);
    botHistory.push({ role: 'assistant', content: reply });
    scheduleBotIdle();
  } catch (err) {
    addBotMessage('bot', 'Lia no pudo responder ahora, intenta de nuevo.');
  } finally {
    isBotLoading = false;
    botSendBtn && (botSendBtn.disabled = false);
    botInput && (botInput.disabled = false);
    setBotStatus('');
    botInput?.focus();
  }
}

function handleBotClose() {
  resetBotConversation('Chat cerrado. Inicia una nueva consulta cuando quieras.');
}

function setupBotAssistant() {
  botLocale = detectUserLocale();
  const copy = {
    'es-419': {
      title: 'Lia',
      placeholder: 'Escribe tu consulta...',
      send: 'Enviar',
      greeting: 'Hola, soy Lia. Puedo ayudarte con dudas de las propiedades, presupuestos y FAQs.',
      langQuestion: (langName) => `Detecté tu idioma: ${langName}. ¿Quieres que responda en ese idioma?`,
      tooltip: 'Habla con Lia',
      error: 'No pude responder ahora. Intenta de nuevo.'
    },
    'en-US': {
      title: 'Stylo-Bot',
      placeholder: 'Ask anything about the listings...',
      send: 'Send',
      greeting: 'Hi, I am Stylo-Bot. I can help with listings, budgets and FAQs.',
      langQuestion: (langName) => `Detected your language: ${langName}. Should I reply in that language?`,
      tooltip: 'Hi, I am Stylo-Bot. Ask your question.',
      error: 'I could not reply right now. Try again.'
    },
    'pt-BR': {
      title: 'Stylo-Bot',
      placeholder: 'Digite sua dúvida sobre os imóveis...',
      send: 'Enviar',
      greeting: 'Olá, sou o Stylo-Bot. Posso ajudar com imóveis, orçamentos e FAQs.',
      langQuestion: (langName) => `Detectei seu idioma: ${langName}. Quer que eu responda nele?`,
      tooltip: 'Olá, sou o Stylo-Bot. Faça sua pergunta.',
      error: 'Não consegui responder agora. Tente novamente.'
    }
  }[botLocale] || {
    title: 'Lia',
    tooltip: 'Habla con Lia',
    error: 'No pude responder ahora. Intenta de nuevo.'
  };

  const launcher = document.createElement('div');
  launcher.className = 'c-chat-launcher';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'c-chat-launcher__btn';
  btn.title = copy.title;
  const tooltip = document.createElement('div');
  tooltip.className = 'c-chat-launcher__tooltip';
  tooltip.textContent = copy.tooltip;

  const panel = document.createElement('section');
  panel.className = 'c-chat';
  panel.setAttribute('aria-live', 'polite');
  panel.hidden = true;

  const header = document.createElement('header');
  header.className = 'c-chat__header';
  header.innerHTML = `<span>${copy.title}</span><button type="button" class="c-chat__close" aria-label="Cerrar">×</button>`;

  const endBtn = document.createElement('button');
  endBtn.type = 'button';
  endBtn.className = 'c-chat__end';
  endBtn.textContent = 'Cerrar chat';

  // FIX: cerrar conversación + panel y limpiar estado de hilo
  endBtn.addEventListener('click', () => {
    resetBotConversation('Chat cerrado. Inicia una nueva consulta cuando quieras.');
    closePanel();
  });

  const list = document.createElement('div');
  list.className = 'c-chat__messages';

  const form = document.createElement('form');
  form.className = 'c-chat__form';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = copy.placeholder;
  input.required = true;
  const sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.textContent = copy.send;
  form.append(input, sendBtn, endBtn);

  panel.append(header, list, form);
  launcher.append(btn, tooltip, panel);
  document.body.appendChild(launcher);

  const closePanel = () => {
    panel.hidden = true;
    launcher.classList.remove('is-open');
  };

  const openPanel = () => {
    panel.hidden = false;
    launcher.classList.add('is-open');
    input.focus();
  };

  // botón X del header del chat
  header.querySelector('.c-chat__close')?.addEventListener('click', closePanel);

  // launcher toggle
  btn.addEventListener('click', () => {
    if (panel.hidden) openPanel();
    else closePanel();
  });

  list.appendChild(createBotMessage(copy.greeting, 'bot'));

  const yesLabel = copy.send === 'Send' ? 'Yes' : botLocale === 'pt-BR' ? 'Sim' : 'Sí';
  const chooseLabel =
    copy.send === 'Send'
      ? 'No, choose language'
      : botLocale === 'pt-BR'
        ? 'Não, escolher idioma'
        : 'No, elegir idioma';

  const renderLocalePrompt = () => {
    const langLabel = localeName(botLocale);
    const question = createBotMessage(copy.langQuestion(langLabel), 'bot');
    const yesBtn = createActionButton(yesLabel, () => {
      botLocaleConfirmed = true;
      list.removeChild(actionRow);
    });
    const noBtn = createActionButton(chooseLabel, () => {
      const chooseRow = createActionRow([
        createActionButton('Español', () => {
          botLocale = 'es-419';
          botLocaleConfirmed = true;
          list.removeChild(chooseRow);
          list.removeChild(actionRow);
        }),
        createActionButton('English', () => {
          botLocale = 'en-US';
          botLocaleConfirmed = true;
          list.removeChild(chooseRow);
          list.removeChild(actionRow);
        }),
        createActionButton('Português', () => {
          botLocale = 'pt-BR';
          botLocaleConfirmed = true;
          list.removeChild(chooseRow);
          list.removeChild(actionRow);
        })
      ]);
      list.appendChild(chooseRow);
      list.scrollTop = list.scrollHeight;
    });
    const actionRow = createActionRow([yesBtn, noBtn]);
    list.appendChild(question);
    list.appendChild(actionRow);
    list.scrollTop = list.scrollHeight;
  };

  renderLocalePrompt();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    if (!botConversationId) botConversationId = newConversationId();
    botHistory.push({ role: 'user', content: text });
    list.appendChild(createBotMessage(text, 'user'));
    input.value = '';
    list.scrollTop = list.scrollHeight;

    const thinking = createBotMessage('…', 'bot');
    list.appendChild(thinking);
    list.scrollTop = list.scrollHeight;

    clearBotIdleTimer();
    const payload = {
      message: text,
      locale: botLocale,
      conversationId: botConversationId,
      history: botHistory
    };

    try {
      const result = await askAssistantWithRetry(payload, { timeoutMs: 10000, retries: 1 });
      thinking.remove();
      const reply = result?.reply || copy.error;
      list.appendChild(createBotMessage(reply, 'bot'));
      botHistory.push({ role: 'assistant', content: reply });
      scheduleBotIdle();
    } catch (err) {
      thinking.remove();
      list.appendChild(createBotMessage(copy.error, 'bot'));
    }
    list.scrollTop = list.scrollHeight;
  });
}

const userMenuEl = document.getElementById('user-menu');
const userShortcutEl = document.getElementById('login-user-shortcut');

function syncUserAccessUI() {
  const hasSession = Boolean(localStorage.getItem('userToken'));
  if (userMenuEl) userMenuEl.hidden = !hasSession;
  if (userShortcutEl) userShortcutEl.hidden = !hasSession;
}

syncUserAccessUI();

loadProperties();
setupNavigation();
setupAuthForms();
setupThemeToggle();
setupAdminPanel();
setupBotAssistant();

if (botForm) {
  botForm.addEventListener('submit', handleBotSubmit);
}
if (botCloseBtn) {
  botCloseBtn.addEventListener('click', handleBotClose);
}