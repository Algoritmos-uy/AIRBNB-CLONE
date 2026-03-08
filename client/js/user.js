import { getMyProfile, updateMyProfile, getMyReservations } from './api.js';

const token = localStorage.getItem('userToken');

const firstNameEl = document.getElementById('user-first-name');
const lastNameEl = document.getElementById('user-last-name');
const emailEl = document.getElementById('user-email');
const phoneEl = document.getElementById('user-phone');
const countryEl = document.getElementById('user-country');
const cityEl = document.getElementById('user-city');
const formEl = document.getElementById('user-profile-form');
const profileFeedbackEl = document.getElementById('user-profile-feedback');

const reservationsBodyEl = document.getElementById('user-reservations-tbody');
const reservationsFeedbackEl = document.getElementById('user-reservations-feedback');

function setFeedback(el, msg, ok = true) {
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('is-error', !ok);
}

function requireAuth() {
  if (!token) {
    window.location.href = '/';
    return false;
  }
  return true;
}

function renderReservations(rows) {
  if (!reservationsBodyEl) return;
  reservationsBodyEl.innerHTML = (rows || []).map((r) => `
    <tr>
      <td>${r.id}</td>
      <td>${r.property_title ?? '—'}</td>
      <td>${r.check_in ?? '—'}</td>
      <td>${r.check_out ?? '—'}</td>
      <td>${r.guests ?? '—'}</td>
      <td>${r.created_at ?? '—'}</td>
    </tr>
  `).join('');
}

async function loadProfile() {
  const result = await getMyProfile(token);
  if (!result?.ok || !result?.data) {
    setFeedback(profileFeedbackEl, result?.error || 'No se pudo cargar tu perfil.', false);
    return;
  }

  const u = result.data;
  firstNameEl.value = u.first_name ?? '';
  lastNameEl.value = u.last_name ?? '';
  emailEl.value = u.email ?? '';
  phoneEl.value = u.phone ?? '';
  countryEl.value = u.country ?? '';
  cityEl.value = u.city ?? '';
}

async function loadReservations() {
  setFeedback(reservationsFeedbackEl, 'Cargando reservas...');
  const result = await getMyReservations(token);
  if (!result?.ok) {
    setFeedback(reservationsFeedbackEl, result?.error || 'No se pudo cargar reservas.', false);
    return;
  }
  const rows = Array.isArray(result.data) ? result.data : [];
  renderReservations(rows);
  setFeedback(reservationsFeedbackEl, rows.length ? `Total: ${rows.length}` : 'Sin reservas registradas.');
}

formEl?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    email: emailEl.value.trim(),
    phone: phoneEl.value.trim(),
    country: countryEl.value.trim(),
    city: cityEl.value.trim()
  };
  const result = await updateMyProfile(token, payload);
  if (!result?.ok) {
    setFeedback(profileFeedbackEl, result?.error || 'No se pudo guardar.', false);
    return;
  }
  setFeedback(profileFeedbackEl, 'Datos actualizados correctamente.');
});

(async function init() {
  if (!requireAuth()) return;
  await loadProfile();
  await loadReservations();
})();