/* ═══════════════════════════════════════════════════════════════
   CONFIGURACIÓN — edita estos valores antes de publicar
═══════════════════════════════════════════════════════════════ */

const CONFIG = {
    // ── Fecha de la boda ──────────────────────────────────────
    weddingDate: new Date('2026-08-07T16:00:00'),   // ⚠️ Cambia la hora (T16:00:00 = 4PM)

    // ── Clave secreta para invitados VIP (recepción) ──────────
    // URL de invitados VIP: tudominio.com?vip=recepcion2026
    vipKey: 'recepcion2026',                         // ⚠️ Cambia esta clave a algo secreto

    // ── Tu número de WhatsApp (con código de país, sin + ni espacios) ──
    whatsappNumber: '57XXXXXXXXXX',                  // ⚠️ Ej: 573001234567

    // ── Google Forms — Cómo obtener estos valores:
    //    1. Crea tu formulario en forms.google.com
    //    2. En el formulario publicado, clic derecho → "Ver código fuente"
    //    3. Busca: action="https://docs.google.com/forms/d/e/XXXX/formResponse"
    //    4. Copia ese ID (XXXX) en formId
    //    5. Busca cada "entry.XXXXXXXXX" junto a cada campo de tu form
    // ─────────────────────────────────────────────────────────
    googleForms: {
        formId: 'REEMPLAZA_CON_TU_FORM_ID',          // ⚠️ ID del form de Google
        entries: {
            name:      'entry.REEMPLAZA',            // ⚠️ entry ID del campo Nombre
            attending: 'entry.REEMPLAZA',            // ⚠️ entry ID del campo Asistencia
            guests:    'entry.REEMPLAZA',            // ⚠️ entry ID del campo Acompañantes
            whatsapp:  'entry.REEMPLAZA',            // ⚠️ entry ID del campo WhatsApp
            message:   'entry.REEMPLAZA',            // ⚠️ entry ID del campo Mensaje
        }
    }
};

/* ═══════════════════════════════════════════════════════════════
   DETECCIÓN VIP
═══════════════════════════════════════════════════════════════ */
const urlParams = new URLSearchParams(window.location.search);
const isVIP = urlParams.get('vip') === CONFIG.vipKey;

if (isVIP) {
    document.body.classList.add('vip-active');
    // Construir el botón de WhatsApp genérico (sin nombre, por si no han llenado el form)
    setWhatsAppBtn('');
}

/* ═══════════════════════════════════════════════════════════════
   COUNTDOWN TIMER
═══════════════════════════════════════════════════════════════ */
function updateCountdown() {
    const now  = new Date();
    const diff = CONFIG.weddingDate - now;

    if (diff <= 0) {
        document.getElementById('days').textContent    = '00';
        document.getElementById('hours').textContent   = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
        return;
    }

    const pad = n => String(Math.floor(n)).padStart(2, '0');

    document.getElementById('days').textContent    = pad(diff / 86400000);
    document.getElementById('hours').textContent   = pad((diff % 86400000) / 3600000);
    document.getElementById('minutes').textContent = pad((diff % 3600000)  / 60000);
    document.getElementById('seconds').textContent = pad((diff % 60000)    / 1000);
}

updateCountdown();
setInterval(updateCountdown, 1000);

/* ═══════════════════════════════════════════════════════════════
   SCROLL ANIMATIONS
═══════════════════════════════════════════════════════════════ */
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.12 });

document.querySelectorAll('.animate').forEach(el => observer.observe(el));

/* ═══════════════════════════════════════════════════════════════
   RSVP FORM
═══════════════════════════════════════════════════════════════ */
const form       = document.getElementById('rsvp-form');
const formError  = document.getElementById('form-error');
const btnText    = document.getElementById('btn-text');
const btnLoading = document.getElementById('btn-loading');
const submitBtn  = document.getElementById('submit-btn');
const successDiv = document.getElementById('rsvp-success');
const successMsg = document.getElementById('success-message');

// Mostrar/ocultar campo de acompañantes según respuesta
document.querySelectorAll('input[name="attending"]').forEach(radio => {
    radio.addEventListener('change', () => {
        const guestsField = document.getElementById('guests-field');
        guestsField.style.display = radio.value === 'Sí, asistiré' ? 'flex' : 'none';
    });
});

form.addEventListener('submit', async e => {
    e.preventDefault();

    const name      = document.getElementById('name').value.trim();
    const attending = form.querySelector('input[name="attending"]:checked')?.value || '';
    const guests    = document.getElementById('guests').value;
    const whatsapp  = document.getElementById('whatsapp').value.trim();
    const message   = document.getElementById('message').value.trim();

    // Validación básica
    formError.style.display = 'none';
    if (!name) return showError('Por favor ingresa tu nombre completo.');
    if (!attending) return showError('Por favor indica si asistirás.');
    if (!whatsapp) return showError('Por favor ingresa tu número de WhatsApp.');

    // Estado de carga
    setBusy(true);

    // Enviar a Google Forms
    try {
        await submitToGoogleForms({ name, attending, guests, whatsapp, message });
    } catch (_) {
        // no-cors siempre "falla" en fetch, pero los datos llegan igual
    }

    setBusy(false);

    // Mostrar éxito
    form.style.display = 'none';
    successDiv.style.display = 'block';

    if (isVIP) {
        // VIP: Personalizar el mensaje de éxito y redirigir a WhatsApp
        successMsg.textContent =
            `¡Gracias, ${name}! En unos momentos te escribiremos por WhatsApp con los detalles de la recepción.`;

        // Actualizar el botón de WhatsApp en la sección de recepción con el nombre del invitado
        setWhatsAppBtn(name);

        // Abrir WhatsApp automáticamente tras 2 segundos
        setTimeout(() => {
            openWhatsApp(name);
        }, 2000);

    } else {
        successMsg.textContent =
            `¡Gracias, ${name}! Estamos muy emocionados de celebrar contigo este día especial.`;
    }
});

function showError(msg) {
    formError.textContent = msg;
    formError.style.display = 'block';
    formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setBusy(busy) {
    submitBtn.disabled = busy;
    btnText.style.display    = busy ? 'none'   : 'inline';
    btnLoading.style.display = busy ? 'inline' : 'none';
}

/* ═══════════════════════════════════════════════════════════════
   GOOGLE FORMS — ENVÍO
═══════════════════════════════════════════════════════════════ */
async function submitToGoogleForms(data) {
    const { formId, entries } = CONFIG.googleForms;

    // Si el form aún no está configurado, lo ignoramos silenciosamente
    if (formId === 'REEMPLAZA_CON_TU_FORM_ID') return;

    const url = `https://docs.google.com/forms/d/e/${formId}/formResponse`;
    const body = new URLSearchParams();
    body.append(entries.name,      data.name);
    body.append(entries.attending, data.attending);
    body.append(entries.guests,    data.guests);
    body.append(entries.whatsapp,  data.whatsapp);
    if (data.message) body.append(entries.message, data.message);

    // mode: 'no-cors' no devuelve respuesta legible pero sí envía los datos
    await fetch(url, { method: 'POST', mode: 'no-cors', body });
}

/* ═══════════════════════════════════════════════════════════════
   WHATSAPP
═══════════════════════════════════════════════════════════════ */
function buildWhatsAppMessage(name) {
    const text = name
        ? `¡Hola! Soy ${name}. Me confirmé para la boda de Juliana y Juan el 7 de agosto 🎉 Quisiera recibir los detalles de la recepción.`
        : `¡Hola! Me confirmé para la boda de Juliana y Juan el 7 de agosto 🎉 Quisiera recibir los detalles de la recepción.`;
    return encodeURIComponent(text);
}

function openWhatsApp(name) {
    const number = CONFIG.whatsappNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${number}?text=${buildWhatsAppMessage(name)}`, '_blank');
}

function setWhatsAppBtn(name) {
    const btn = document.getElementById('whatsapp-btn');
    if (!btn) return;
    const number = CONFIG.whatsappNumber.replace(/\D/g, '');
    btn.href = `https://wa.me/${number}?text=${buildWhatsAppMessage(name)}`;
    btn.onclick = e => {
        e.preventDefault();
        openWhatsApp(document.getElementById('name')?.value.trim() || name);
    };
}
