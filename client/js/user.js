import { getMyReservations } from './api.js';

const reservationsBodyEl = document.getElementById('user-reservations-tbody');
const reservationsFeedbackEl = document.getElementById('user-reservations-feedback');

function setFeedback(msg, ok = true) {
  if (!reservationsFeedbackEl) return;
  reservationsFeedbackEl.textContent = msg || '';
  reservationsFeedbackEl.classList.toggle('is-error', !ok);
}

function renderReservations(rows) {
  if (!reservationsBodyEl) return;
  reservationsBodyEl.innerHTML = (rows || []).map((r) => `
    <tr class="c-table__row">
      <td>${r.id ?? '—'}</td>
      <td>${r.property_title ?? `Propiedad #${r.property_id ?? r.propertyId ?? '—'}`}</td>
      <td>${r.check_in ?? r.checkIn ?? '—'}</td>
      <td>${r.check_out ?? r.checkOut ?? '—'}</td>
      <td>${r.guests ?? '—'}</td>
      <td>${r.created_at ?? r.createdAt ?? '—'}</td>
    </tr>
  `).join('');
}

async function init() {
  const token = localStorage.getItem('userToken');
  if (!token || !token.trim()) {
    setFeedback('No hay sesión activa. Inicia sesión para ver tus reservas.', false);
    return;
  }

  setFeedback('Cargando reservas...');
  const result = await getMyReservations(token);
  if (!result?.ok) {
    setFeedback(result?.error || result?.message || 'No se pudo cargar reservas.', false);
    return;
  }

  const rows = Array.isArray(result.data) ? result.data : [];
  renderReservations(rows);
  setFeedback(rows.length ? `Total: ${rows.length}` : 'Sin reservas registradas.');
}

const THEME_KEY = 'theme'; // misma clave que en main.js

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('theme-dark', isDark);
  document.body.classList.toggle('theme-dark', isDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

function initThemeSync() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);

  // sincroniza cambios desde otras pestañas/vistas
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY) {
      applyTheme(e.newValue || 'light');
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initThemeSync();
  init(); // tu función actual de carga de reservas
});