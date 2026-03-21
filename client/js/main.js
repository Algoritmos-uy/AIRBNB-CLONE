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
const sortInput = document.getElementById('filter-sort'); // <- agregar (select en HTML)
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

let allProperties = [];
let reservationsLoaded = false;
let isAdminAuthed = Boolean(localStorage.getItem('adminToken'));
let reservationsCache = [];
let usersCache = [];
let usersLoaded = false;
let botLocale = null;
let botLocaleConfirmed = false;

function renderProperties(list = allProperties) {
  if (!grid) return;

  const safeList = Array.isArray(list) ? list : [];
  if (!safeList.length) {
    grid.innerHTML = '<p class="u-text-center">No hay propiedades disponibles con estos filtros.</p>';
    return;
  }

  grid.innerHTML = safeList.map((p) => `
    <a class="c-property-card" href="property.html?id=${p?.id ?? ''}" title="VEA MAS">
      <img src="${p?.image_url || './assets/img/placeholder.jpg'}" alt="${p?.title || 'Propiedad'}">
      <div class="c-property-card__body">
        <h3>
          ${p?.title || 'Sin título'}
          <span class="c-property-card__id">ID: ${p?.id ?? '-'}</span>
        </h3>
        <p>${p?.location || 'Ubicación no disponible'}</p>
        <span>${formatPrice(Number(p?.price_per_night) || 0)} / noche</span>
      </div>
    </a>
  `).join('');
}

function sortProperties(list = []) {
  const mode = sortInput?.value || 'id-asc';

  const sorted = [...list];
  if (mode === 'price-asc') {
    sorted.sort((a, b) => Number(a?.price_per_night || 0) - Number(b?.price_per_night || 0));
  } else if (mode === 'price-desc') {
    sorted.sort((a, b) => Number(b?.price_per_night || 0) - Number(a?.price_per_night || 0));
  } else {
    // fallback actual
    sorted.sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
  }

  return sorted;
}

function applyFilters() {
  if (!Array.isArray(allProperties)) return;

  const minRaw = minInput?.value?.trim() ?? '';
  const maxRaw = maxInput?.value?.trim() ?? '';
  const min = minRaw === '' ? null : Number(minRaw);
  const max = maxRaw === '' ? null : Number(maxRaw);

  const filtered = allProperties.filter((p) => {
    const price = Number(p.price_per_night) || 0;
    if (min !== null && Number.isFinite(min) && price < min) return false;
    if (max !== null && Number.isFinite(max) && price > max) return false;
    return true;
  });

  renderProperties(sortProperties(filtered));
}

function setupFilters() {
  if (!filtersForm) return;

  const onApply = (e) => {
    e?.preventDefault?.();
    applyFilters();
  };

  const onReset = (e) => {
    e?.preventDefault?.();
    if (searchInput) searchInput.value = '';
    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';
    if (sortInput) sortInput.value = 'id-asc';
    renderProperties(sortProperties(allProperties));
  };

  filtersForm.addEventListener('submit', onApply);
  filtersForm.addEventListener('reset', onReset);

  filtersForm.querySelector('button[type="submit"], [data-action="filter"]')?.addEventListener('click', onApply);
  filtersForm.querySelector('button[type="reset"], [data-action="clear"]')?.addEventListener('click', onReset);

  // aplicar al cambiar orden
  sortInput?.addEventListener('change', () => applyFilters());
}

async function loadProperties() {
  try {
    const data = await getProperties();
    const list = Array.isArray(data) ? data : [];
    allProperties = list.sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
    renderProperties(sortProperties(allProperties));
  } catch (err) {
    console.error('Error cargando propiedades:', err);
    allProperties = [];
    renderProperties([]);
  }
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
  const nextMode = isDark ? 'dark' : 'light';

  // Aplicar en ambos nodos para compatibilidad total
  document.documentElement.classList.toggle('theme-dark', isDark);
  document.body.classList.toggle('theme-dark', isDark);

  // Soporte para CSS basado en atributos
  document.documentElement.setAttribute('data-theme', nextMode);

  themeToggle?.setAttribute('aria-pressed', String(isDark));
  themeToggle?.classList.toggle('is-dark', isDark);

  localStorage.setItem('theme', nextMode);
  setBrandLogo(nextMode);
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

  // Sincroniza cuando el tema cambie en otra pestaña/vista
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      applyTheme(e.newValue || 'light');
    }
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
  downloadFile('clientes.csv', `\uFEFF${csv}`, 'text/csv;charset=utf-8');
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

function getLoginPayload(form) {
  const fd = new FormData(form);
  const username = String(fd.get('username') || '').trim();
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '').trim();

  const identity = (username || email).trim();

  return {
    username: identity, // backend puede tomar username
    email: identity,    // backend también puede tomar email
    password
  };
}

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

    const payload = getLoginPayload(loginForm);
    console.log('[LOGIN payload]', payload); // temporal

    const result = await loginUser(payload);
    console.log('[LOGIN result]', result); // temporal

    // token puede venir anidado según api.js
    const token = result?.data?.data?.token || result?.data?.token;
    const user = result?.data?.data?.user || result?.data?.user;

    if (result?.ok && token) {
      localStorage.setItem('userToken', token);
      localStorage.setItem('userName', user?.full_name || '');
      syncUserMenuVisibility();
      setFeedback(loginFeedback, 'Inicio de sesión exitoso.', true);
      loginForm.reset();
      return;
    }

    setFeedback(loginFeedback, result?.message || 'Credenciales inválidas.', false);
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
  // permite firma con imagen en respuestas de Lia
  if (role === 'bot' && /c-lia-signature|<img/i.test(String(text))) {
    el.innerHTML = text;
  } else {
    el.innerText = text;
  }
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

function buildLiaSignature() {
  return [
    'Atentamente,',
    '<span class="c-lia-signature">',
    '  <img src="./assets/img/lia-bot.png" alt="Lia" class="c-lia-signature__icon" width="18" height="18" loading="lazy" decoding="async" />',
    '  Lia',
    '</span>',
    'Asistente de reservas – Staylo'
  ].join('\n');
}

function normalizeLiaReply(raw = '') {
  let text = String(raw || '').trim();
  if (!text) return text;

  text = text.replace(/Stylo-?Bot/gi, 'Lia');
  text = text.replace(
    /Atentamente,\s*Lia\s*🤖\s*Asistente de reservas\s*[–-]\s*Staylo/gi,
    buildLiaSignature()
  );

  return text;
}

let botConversationId = null;
let botHistory = [];
let botIdleTimer = null;
const BOT_IDLE_MS = 30000;

function newConversationId() {
  return (crypto?.randomUUID ? crypto.randomUUID() : `conv-${Date.now()}`);
}

function resetBotConversation() {
  botConversationId = null;
  botHistory = [];
  clearBotIdleTimer();
}

function scheduleBotIdle() {
  clearBotIdleTimer();
  botIdleTimer = setTimeout(() => {
    resetBotConversation();
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
    history: safeHistory,
    systemPrompt: [
      'Eres Lia, asistente virtual de reservas de Staylo.',
      'Habla SIEMPRE en femenino en respuestas autoreferenciales (ej: "estoy lista", "encantada de ayudarte", "Estoy Lista para ayudarte con lo que necesites).',
      'No uses "Stylo-Bot" ni variantes para firmar.',
      'Si incluyes cierre/firma, usa exactamente:',
      'Atentamente,',
      'Lia 🤖',
      'Asistente de reservas – Staylo'
    ].join('\n')
  };

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await askAssistant(basePayload, controller.signal);
      clearTimeout(timer);

      if (!res) throw new Error('Sin respuesta');
      if (res.ok === false && res.error) throw new Error(res.error || 'Respuesta inválida');

      const rawReply = res.reply || res.data?.reply;
      if (!rawReply) throw new Error('Respuesta inválida');

      const reply = normalizeLiaReply(rawReply);
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

function setupBotAssistant() {
  botLocale = detectUserLocale();
  const copy = {
    'es-419': {
      title: 'Lia',
      placeholder: 'Escribe tu consulta...',
      send: 'Enviar',
      greeting: 'Puedo ayudarte con dudas de las propiedades, presupuestos y FAQs.',
      langQuestion: (langName) => `Detecté tu idioma: ${langName}. ¿Quieres que responda en ese idioma?`,
      tooltip: 'Habla con Lia',
      error: 'No pude responder ahora. Intenta de nuevo.'
    },
    'en-US': {
      title: 'Lia',
      placeholder: 'Ask anything about the listings...',
      send: 'Send',
      greeting: 'I can help with listings, budgets and FAQs.',
      langQuestion: (langName) => `Detected your language: ${langName}. Should I reply in that language?`,
      tooltip: 'Talk to Lia',
      error: 'I could not reply right now. Try again.'
    },
    'pt-BR': {
      title: 'Lia',
      placeholder: 'Digite sua dúvida sobre os imóveis...',
      send: 'Enviar',
      greeting: 'Posso ajudar com imóveis, orçamentos e FAQs.',
      langQuestion: (langName) => `Detectei seu idioma: ${langName}. Quer que eu responda nele?`,
      tooltip: 'Fale com Lia',
      error: 'Não consegui responder agora. Tente novamente.'
    }
  }[botLocale] || {
    title: 'Lia',
    tooltip: 'Habla con Lia',
    error: 'No pude responder ahora. Intenta de nuevo.'
  };

  const LIA_IMG = './assets/img/lia-bot.png';

  const launcher = document.createElement('div');
  launcher.className = 'c-chat-launcher';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'c-chat-launcher__btn';
  btn.title = copy.title;
  btn.style.backgroundImage = `url("${LIA_IMG}")`;

  const tooltip = document.createElement('div');
  tooltip.className = 'c-chat-launcher__tooltip';
  tooltip.textContent = copy.tooltip;

  const panel = document.createElement('section');
  panel.className = 'c-chat';
  panel.setAttribute('aria-live', 'polite');
  panel.hidden = true;

  const header = document.createElement('header');
  header.className = 'c-chat__header';
  header.innerHTML = `
  <span class="c-chat__title-wrap">
    <img
      src="${LIA_IMG}"
      alt="Lia"
      class="c-chat__avatar"
      width="56"
      height="56"
      loading="lazy"
      decoding="async"
    />
    <span>Hola, soy Lia, tu asistente</span>
  </span>
  <button type="button" class="c-chat__close" aria-label="Cerrar">×</button>
`;

  const endBtn = document.createElement('button');
  endBtn.type = 'button';
  endBtn.className = 'c-chat__end';
  endBtn.textContent = 'Cerrar chat';

  // FIX: cerrar conversación + panel y limpiar estado de hilo
  endBtn.addEventListener('click', () => {
    resetBotConversation();
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
    // mostrar de nuevo el launcher (botón + tooltip)
    showChatLauncher();
  };

  const openPanel = () => {
    panel.hidden = false;
    launcher.classList.add('is-open');
    // ocultar solo el botón/tooltip del launcher para que no solape el panel
    hideChatLauncher();
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

    const typingEl = createBotTypingMessage();
    list.appendChild(typingEl);
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
      const reply = result?.reply || copy.error;

      typingEl.classList.remove('is-typing');
      await typeText(typingEl, reply, 12); // velocidad de escritura
      botHistory.push({ role: 'assistant', content: reply });
      scheduleBotIdle();
    } catch (err) {
      typingEl.classList.remove('is-typing');
      typingEl.innerText = copy.error;
    }

    list.scrollTop = list.scrollHeight;
  });
}

function hideChatLauncher() {
  const btn = document.querySelector('.c-chat-launcher__btn');
  const tooltip = document.querySelector('.c-chat-launcher__tooltip');
  if (btn) btn.style.display = 'none';
  if (tooltip) tooltip.style.display = 'none';
}

function showChatLauncher() {
  const btn = document.querySelector('.c-chat-launcher__btn');
  const tooltip = document.querySelector('.c-chat-launcher__tooltip');
  if (btn) btn.style.display = '';
  if (tooltip) tooltip.style.display = '';
}

const userMenuEl = document.getElementById('user-menu');
const userMenuLoginLink = document.getElementById('user-menu-login');
const userMenuReservationsLink = document.getElementById('user-menu-reservations');
const userMenuLogoutBtn = document.getElementById('user-menu-logout');

function syncUserMenuVisibility() {
  const token = localStorage.getItem('userToken');
  const isLogged = Boolean(token && token.trim());

  // Ícono siempre visible
  if (userMenuEl) userMenuEl.hidden = false;

  // Opciones según sesión
  if (userMenuLoginLink) userMenuLoginLink.hidden = isLogged;
  if (userMenuReservationsLink) userMenuReservationsLink.hidden = !isLogged;
  if (userMenuLogoutBtn) userMenuLogoutBtn.hidden = !isLogged;
}

userMenuLoginLink?.addEventListener('click', (e) => {
  e.preventDefault();
  showView('auth'); // sección registro/login
});

function logoutUserSession() {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userName');
  syncUserMenuVisibility();
  showView('home');
}

userMenuLogoutBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  logoutUserSession();
});

// al iniciar app
syncUserMenuVisibility();

// Inicialización
loadProperties();
setupNavigation();
setupAuthForms();
setupThemeToggle();
setupAdminPanel();
setupBotAssistant();
setupFilters(); // <- FALTABA

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeText(el, text, speed = 14) {
  const safe = String(text || '');
  // Si contiene HTML (firma con imagen), no tipar carácter a carácter para no romper etiquetas
  if (/<[^>]+>/.test(safe)) {
    el.innerHTML = safe;
    return;
  }

  el.innerText = '';
  for (let i = 0; i < safe.length; i += 1) {
    el.innerText += safe[i];
    // scroll al final mientras escribe
    const parent = el.parentElement;
    if (parent) parent.scrollTop = parent.scrollHeight;
    await sleep(speed);
  }
}

function createBotTypingMessage() {
  const el = document.createElement('div');
  el.className = 'c-chat__message c-chat__message--bot is-typing';
  el.innerText = 'Escribiendo...';
  return el;
}

function formatPrice(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}