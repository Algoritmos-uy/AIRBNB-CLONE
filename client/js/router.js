// Client-side property detail renderer
import { getPropertyById } from './api.js';

const detailContainer = document.getElementById('property-detail');

function getQueryParam(key) {
	const params = new URLSearchParams(window.location.search);
	return params.get(key);
}

function formatPrice(value) {
	if (value == null) return '';
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	}).format(value);
}

async function renderPropertyDetail() {
	if (!detailContainer) return;

	const id = getQueryParam('id');
	if (!id) {
		detailContainer.innerHTML = '<p class="u-text-center">No se indicó una propiedad.</p>';
		return;
	}

	detailContainer.innerHTML = '<p class="u-text-center">Cargando propiedad...</p>';

	const property = await getPropertyById(id);

	if (!property) {
		detailContainer.innerHTML = '<p class="u-text-center">No encontramos esta propiedad.</p>';
		return;
	}

	detailContainer.innerHTML = `
		<section class="c-property-section">
			<article class="c-property-detail">
				<div class="c-property-detail__media">
					<img src="${property.image_url}" alt="${property.title}" />
				</div>
				<div class="c-property-detail__content">
					<header class="c-property-detail__head">
						<div>
							<p class="c-property-detail__location">${property.location || ''}</p>
							<h1 class="c-property-detail__title">${property.title}</h1>
						</div>
						<div class="c-property-detail__price">${formatPrice(property.price_per_night)} <small>/ noche</small></div>
					</header>
					<p class="c-property-detail__description">${property.description || ''}</p>
					<div class="c-property-detail__meta">
						<span>ID #${property.id}</span>
						<span>Publicado: ${new Date(property.created_at).toLocaleDateString('es-ES')}</span>
					</div>
				</div>
			</article>
			<aside class="c-property-video" aria-label="Video de la propiedad">
				<div class="c-property-video__card">
					<h2 class="c-property-video__title">Conoce el espacio</h2>
					<video controls preload="metadata" poster="${property.image_url}">
						<source src="/assets/video/demo.mp4" type="video/mp4" />
						Tu navegador no soporta video HTML5.
					</video>
					<div class="c-property-reserve">
						<a class="c-btn" href="reserve.html?id=${property.id}">Reservar</a>
					</div>
				</div>
			</aside>
		</section>
	`;
}

renderPropertyDetail();
