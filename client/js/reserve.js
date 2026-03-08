import { getPropertyById, createReservation, getAvailability } from './api.js';

const summaryEl = document.getElementById('reserve-summary');
const form = document.getElementById('reserve-form');
const feedbackEl = document.getElementById('reserve-feedback');
const propertyIdInput = document.getElementById('property-id');
const checkInInput = document.getElementById('input-check-in');
const checkOutInput = document.getElementById('input-check-out');
const loginAlert = document.getElementById('login-alert');

function isUserLogged() {
	return Boolean(localStorage.getItem('userToken'));
}

function fillUserFields() {
	const name = localStorage.getItem('userName');
	if (name && form?.elements?.full_name) {
		form.elements.full_name.value = name;
	}
}

function getQueryParam(key) {
	const params = new URLSearchParams(window.location.search);
	return params.get(key);
}

function setFeedback(message, ok = false) {
	if (!feedbackEl) return;
	feedbackEl.textContent = message;
	feedbackEl.classList.toggle('is-error', !ok);
	feedbackEl.classList.toggle('is-success', ok);
}

function isValidDateRange(checkIn, checkOut) {
	const inDate = new Date(checkIn);
	const outDate = new Date(checkOut);
	if (Number.isNaN(inDate) || Number.isNaN(outDate)) return false;
	return outDate > inDate;
}

async function loadProperty() {
	const id = getQueryParam('id');
	if (!id) {
		summaryEl.textContent = 'No se indicó una propiedad.';
		return;
	}
	const property = await getPropertyById(id);
	if (!property) {
		summaryEl.textContent = 'No encontramos esta propiedad.';
		return;
	}
	propertyIdInput.value = property.id;
	summaryEl.innerHTML = `
		<strong>${property.title}</strong><br>
		Ubicación: ${property.location || 'Sin ubicación'}<br>
		Precio: $${property.price_per_night} / noche
	`;

	setupCalendars(property.id);
}

function ensureLoggedForReserve() {
	if (isUserLogged()) {
		loginAlert?.setAttribute('hidden', 'true');
		return true;
	}
	if (loginAlert) {
		loginAlert.hidden = false;
	} else {
		alert('Debes iniciar sesión para reservar.');
	}
	return false;
}

function toFlatpickrRanges(bookings = []) {
	return bookings.map((b) => ({ from: b.start, to: b.end }));
}

async function setupCalendars(propertyId) {
	if (!checkInInput || !checkOutInput) return;
	const availability = await getAvailability(propertyId);
	const disabledRanges = toFlatpickrRanges(availability);

	const commonConfig = {
		dateFormat: 'Y-m-d',
		minDate: 'today',
		disable: disabledRanges,
		disabledMobile: true,
		locale: {
			rangeSeparator: ' a ',
			firstDayOfWeek: 1
		}
	};

	const checkInPicker = flatpickr(checkInInput, {
		...commonConfig,
		onChange: (selectedDates) => {
			if (selectedDates[0]) {
				checkOutPicker.set('minDate', selectedDates[0]);
			}
		}
	});

	const checkOutPicker = flatpickr(checkOutInput, {
		...commonConfig,
		onChange: (selectedDates) => {
			if (selectedDates[0]) {
				checkInPicker.set('maxDate', selectedDates[0]);
			}
		}
	});

	// Visual enfatizar días deshabilitados
	setTimeout(() => {
		const disabledDays = document.querySelectorAll('.flatpickr-day.disabled');
		disabledDays.forEach((el) => {
			el.classList.add('is-reserved');
		});
	}, 100);
}

form?.addEventListener('submit', async (e) => {
	e.preventDefault();
	if (!ensureLoggedForReserve()) return;
	const data = new FormData(form);
	const checkIn = data.get('check_in');
	const checkOut = data.get('check_out');
	if (!isValidDateRange(checkIn, checkOut)) {
		setFeedback('La fecha de salida debe ser posterior a la de entrada.', false);
		return;
	}

	const payload = {
		property_id: data.get('property_id'),
		full_name: data.get('full_name'),
		email: data.get('email'),
		phone: data.get('phone'),
		check_in: checkIn,
		check_out: checkOut,
		guests: Number(data.get('guests'))
	};

	const submitBtn = form.querySelector('button[type="submit"]');
	if (submitBtn) {
		submitBtn.disabled = true;
		submitBtn.textContent = 'Enviando...';
	}

	const result = await createReservation(payload);

	if (submitBtn) {
		submitBtn.disabled = false;
		submitBtn.textContent = 'Confirmar reserva';
	}

	if (!result.ok) {
			if (result.message?.toLowerCase().includes('autoriz')) {
				ensureLoggedForReserve();
			}
		setFeedback(result.message || 'No se pudo registrar la reserva.', false);
		return;
	}

	setFeedback('Reserva registrada. El administrador recibirá los datos y te contactará para confirmar.', true);
	form.reset();
});

loadProperty();
ensureLoggedForReserve();
fillUserFields();
