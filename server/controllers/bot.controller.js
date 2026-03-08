import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { initDB } from '../models/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FAQS_PATH = path.resolve(__dirname, '../../client/assets/data/faqs.json');
const DEFAULT_LOCALE = 'es-419';
const MODEL_NAME = 'deepseek-chat';

let faqsCache = null;
let faqsMtime = null;

const normalizeLocale = (value = '') => {
  const lang = value.toLowerCase();
  if (lang.includes('pt')) return 'pt-BR';
  if (lang.includes('en')) return 'en-US';
  return 'es-419';
};

async function loadFaqs() {
  try {
    const stats = await fs.stat(FAQS_PATH);
    if (faqsCache && faqsMtime && faqsMtime === stats.mtimeMs) {
      return faqsCache;
    }
    const raw = await fs.readFile(FAQS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    faqsCache = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.faqs) ? parsed.faqs : [];
    faqsMtime = stats.mtimeMs;
    return faqsCache;
  } catch (error) {
    console.error('No se pudieron cargar FAQs', error);
    return [];
  }
}

async function loadPropertiesSummary(limit = 15) {
  try {
    const db = await initDB();
    const rows = await db.all('SELECT id, title, location, price_per_night FROM properties LIMIT ?', limit);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      location: r.location,
      price_per_night: Number(r.price_per_night) || 0,
      currency: 'USD'
    }));
  } catch (error) {
    console.error('No se pudieron cargar propiedades para el bot', error);
    return [];
  }
}

function detectDays(text = '', providedDays) {
  if (providedDays && Number(providedDays) > 0) return Number(providedDays);
  const match = text.match(/(\d{1,3})\s*(d[ií]as|dias|noches|days)/i);
  return match ? Number(match[1]) : null;
}

function findPropertyMatch(text = '', properties = []) {
  const normalized = text.toLowerCase();
  return properties.find((p) => normalized.includes(String(p.id)) || normalized.includes(p.title.toLowerCase()));
}

function buildSystemPrompt(locale, properties) {
  const tone = locale === 'en-US'
    ? 'Tone: professional, concise and clear.'
    : locale === 'pt-BR'
      ? 'Tom: formal porém próximo, profissional e claro.'
      : 'Tono: profesional, amable y claro; explica un poco más para usuarios LatAm.';

  const currencyHint = properties?.[0]?.currency || 'USD';

  const catalog = properties
    .map((p) => `- ${p.title} (ID ${p.id}) en ${p.location}: ${p.price_per_night} ${currencyHint} por noche`)
    .join('\n');

  return `Eres Stylo-Bot, asistente de reservas para Staylo.
${tone}
Responde en el idioma del usuario (detecta: es-419, en-US, pt-BR).
Usa la moneda de las publicaciones (${currencyHint}) y no conviertas.
Da presupuestos multiplicando precio_noche * días solicitados; detalla cálculo.
Si no tienes un dato, sé honesto y ofrece alternativas.
Catálogo resumido:
${catalog || 'No hay propiedades cargadas.'}`;
}

function buildUserPrompt({ message, faqs, locale, property, days }) {
  const faqText = (faqs || [])
    .slice(0, 20)
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n');

  const budgetLine = property && days
    ? `Presupuesto sugerido: ${property.price_per_night * days} ${property.currency} para ${days} noches en "${property.title}" (tarifa: ${property.price_per_night} ${property.currency}/noche).`
    : 'No se detectó un presupuesto automático.';

  return `Idioma preferido: ${locale}
${budgetLine}
FAQs:\n${faqText}
Consulta del usuario: ${message}`;
}

export async function chatWithAssistant(req, res) {
  const { message, locale: bodyLocale, days } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: 'Mensaje requerido' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'Falta configurar DEEPSEEK_API_KEY en el servidor.' });
  }

  const locale = normalizeLocale(bodyLocale || req.headers['accept-language'] || DEFAULT_LOCALE);
  const [faqs, properties] = await Promise.all([loadFaqs(), loadPropertiesSummary(15)]);

  const matchedProperty = findPropertyMatch(message, properties);
  const inferredDays = detectDays(message, days);
  const system = buildSystemPrompt(locale, properties);
  const userPrompt = buildUserPrompt({ message, faqs, locale, property: matchedProperty, days: inferredDays });

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        temperature: 0.35,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('DeepSeek error', errText);
      return res.status(502).json({ message: 'No se pudo obtener respuesta del bot.' });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || 'No pude generar respuesta en este momento.';

    return res.json({
      reply,
      locale,
      property: matchedProperty || null,
      days: inferredDays || null
    });
  } catch (error) {
    console.error('Error en chatWithAssistant', error);
    return res.status(500).json({ message: 'Error interno del bot.' });
  }
}
