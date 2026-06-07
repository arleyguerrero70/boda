const CONFIG = {
    weddingDate: new Date('2026-08-07T14:30:00'),   // ⚠️ Cambia la hora (T16:00:00 = 4PM)

    // ── Google Apps Script — verificación de duplicados + envío
    //    1. Sigue las instrucciones en google-apps-script/Code.gs
    //    2. Despliega la app web y pega aquí la URL /exec
    // ─────────────────────────────────────────────────────────
    rsvpApiUrl: 'https://script.google.com/macros/s/AKfycbw59b3iNePXdYZFff3mnTwtCo-iceAT2YH-ebLCxWtR1CJDrQPZ68rn557EW0doF5-h/exec',

    ceremony: {
        title      : 'Boda Juan Andres & Juliana — Ceremonia',
        start      : '2026-08-07T14:30:00',
        end        : '2026-08-07T16:00:00',
        location   : 'Parroquia Nuestra Señora de La Peña, Bogotá, Colombia',
        description: 'Ceremonia religiosa de la boda de Juan Andres y Juliana.',
        mapsUrl    : 'https://share.google/9GTFovjgIm96LINzW'
    },

    reception: {
        title      : 'Boda Juan Andres & Juliana — Recepción',
        start      : '2026-08-07T19:00:00',
        end        : '2026-08-07T23:30:00',
        dateLabel  : 'Viernes, 7 de agosto de 2026',
        timeLabel  : '7:00 p.m.',
        venue      : 'Centro de Servicios Culturales y Recreativos Nueva Santafe',
        location   : 'Centro de Servicios Culturales y Recreativos Nueva Santafe, Bogotá, Colombia',
        description: 'Recepción, cena y celebración con nuestros invitados especiales.',
        mapsUrl    : 'https://maps.app.goo.gl/pqWMXQd3QwdJEbtc8',
        mapsEmbed  : 'Centro+de+Servicios+Culturales+y+Recreativos+Nueva+Santafe+Bogotá+Colombia'
    }
};

/* ═══════════════════════════════════════════════════════════════
   DETECCIÓN VIP
═══════════════════════════════════════════════════════════════ */
let guestName = '';

window.VipGuest?.ready.then(async invitado => {
    if (!invitado) return;

    guestName = invitado.nombre?.trim() || '';
    document.body.classList.add('vip-active');
    window.VipGuest.populateGuestsSelect(invitado.cantidad);

    if (guestName && isRsvpApiConfigured()) {
        try {
            const already = await checkRsvpAlreadySubmitted(guestName);
            if (already) showRsvpAlreadyAnswered();
        } catch (_) {}
    }
});

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
   CITA MÁGICA — Nuestra historia
═══════════════════════════════════════════════════════════════ */
(function initMagicInk() {
    const quote = document.getElementById('magic-quote');
    const sign  = document.getElementById('magic-sign');
    if (!quote) return;

    const lines = [];
    for (let i = 1; quote.dataset[`line${i}`] !== undefined; i++) {
        const text = quote.dataset[`line${i}`];
        if (text) lines.push(text);
    }
    if (!lines.length) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const charDelay = 75;
    const totalChars = () => lines.reduce((sum, line) => sum + line.length, 0);

    function buildLine(text, startIndex) {
        const line = document.createElement('span');
        line.className = 'magic-ink__line';

        let charIndex = startIndex;
        const tokens = text.split(/(\s+)/);

        tokens.forEach(token => {
            if (!token) return;

            if (/^\s+$/.test(token)) {
                [...token].forEach(() => {
                    const span = document.createElement('span');
                    span.className = 'magic-ink__char magic-ink__char--space';
                    span.style.setProperty('--char-i', charIndex);
                    span.textContent = '\u00A0';
                    span.setAttribute('aria-hidden', 'true');
                    line.appendChild(span);
                    charIndex++;
                });
                return;
            }

            const word = document.createElement('span');
            word.className = 'magic-ink__word';

            [...token].forEach(char => {
                const span = document.createElement('span');
                span.className = 'magic-ink__char';
                span.style.setProperty('--char-i', charIndex);
                span.textContent = char;
                span.setAttribute('aria-hidden', 'true');
                word.appendChild(span);
                charIndex++;
            });

            line.appendChild(word);
        });

        return line;
    }

    function renderStatic() {
        quote.textContent = '';
        lines.forEach((text, i) => {
            if (i > 0) quote.appendChild(document.createElement('br'));
            quote.appendChild(document.createTextNode(text));
        });
        if (sign) sign.classList.add('is-visible');
    }

    function startWriting() {
        if (quote.classList.contains('magic-ink--writing')) return;

        if (prefersReduced) {
            renderStatic();
            return;
        }

        quote.textContent = '';
        let charIndex = 0;
        lines.forEach(line => {
            quote.appendChild(buildLine(line, charIndex));
            charIndex += line.length;
        });

        quote.classList.add('magic-ink--writing');

        const totalMs = totalChars() * charDelay + 900;
        setTimeout(() => {
            if (sign) sign.classList.add('is-visible');
        }, totalMs);
    }

    const inkObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                startWriting();
                inkObserver.disconnect();
            }
        });
    }, {
        root      : null,
        // Solo cuenta cuando la cita cruza la franja central del viewport
        rootMargin: '-38% 0px -38% 0px',
        threshold : 0.35
    });

    inkObserver.observe(quote);
})();

/* ═══════════════════════════════════════════════════════════════
   AGREGAR AL CALENDARIO — Ceremonia y recepción
═══════════════════════════════════════════════════════════════ */
(function initCalendarButtons() {
    function toCalendarDate(isoLocal) {
        const [date, time] = isoLocal.split('T');
        const [y, m, d] = date.split('-');
        const [hh, mm] = time.split(':');
        return `${y}${m}${d}T${hh}${mm}00`;
    }

    function buildGoogleCalendarUrl(event) {
        const details = event.mapsUrl
            ? `${event.description}\n${event.mapsUrl}`
            : event.description;

        const params = new URLSearchParams({
            action  : 'TEMPLATE',
            text    : event.title,
            dates   : `${toCalendarDate(event.start)}/${toCalendarDate(event.end)}`,
            details : details,
            location: event.location,
            ctz     : 'America/Bogota'
        });

        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }

    const ceremonyLink = document.getElementById('btn-add-calendar');
    if (ceremonyLink && CONFIG.ceremony) {
        ceremonyLink.href = buildGoogleCalendarUrl(CONFIG.ceremony);
    }

    const receptionLink = document.getElementById('btn-add-reception-calendar');
    if (receptionLink && CONFIG.reception) {
        receptionLink.href = buildGoogleCalendarUrl(CONFIG.reception);
    }
})();

/* ═══════════════════════════════════════════════════════════════
   RECEPCIÓN — detalles del evento
═══════════════════════════════════════════════════════════════ */
(function initReceptionDetails() {
    const r = CONFIG.reception;
    if (!r) return;

    const venueEl = document.getElementById('reception-venue');
    const dateEl  = document.getElementById('reception-date');
    const timeEl  = document.getElementById('reception-time');
    const mapsEl  = document.getElementById('reception-maps-link');
    const iframe  = document.getElementById('reception-map');

    if (venueEl) venueEl.textContent = r.venue;
    if (dateEl)  dateEl.textContent  = r.dateLabel;
    if (timeEl)  timeEl.textContent  = r.timeLabel;

    if (mapsEl && r.mapsUrl) {
        mapsEl.href = r.mapsUrl;
    }

    if (iframe && r.mapsEmbed) {
        iframe.src = `https://maps.google.com/maps?q=${r.mapsEmbed}&output=embed&z=16`;
    }
})();

/* ═══════════════════════════════════════════════════════════════
   RSVP FORM
═══════════════════════════════════════════════════════════════ */
const form       = document.getElementById('rsvp-form');
const formError  = document.getElementById('form-error');
const btnText    = document.getElementById('btn-text');
const btnLoading = document.getElementById('btn-loading');
const submitBtn  = document.getElementById('submit-btn');
const successDiv = document.getElementById('rsvp-success');
const alreadyDiv = document.getElementById('rsvp-already');
const successMsg = document.getElementById('success-message');

function isRsvpApiConfigured() {
    const url = CONFIG.rsvpApiUrl;
    return url && !url.includes('REEMPLAZA');
}

function showRsvpSuccess(name) {
    form.style.display = 'none';
    if (alreadyDiv) alreadyDiv.style.display = 'none';
    successDiv.style.display = 'block';
    successMsg.textContent =
        `¡Gracias, ${name}! Estamos muy emocionados de celebrar contigo este día especial.`;
}

function showRsvpAlreadyAnswered() {
    form.style.display = 'none';
    successDiv.style.display = 'none';
    formError.style.display = 'none';
    if (alreadyDiv) alreadyDiv.style.display = 'block';
}

/** JSONP — evita CORS en la verificación (GET) */
function rsvpJsonp(params) {
    return new Promise((resolve, reject) => {
        const callback = '_rsvpCb_' + Date.now();
        const url = new URL(CONFIG.rsvpApiUrl);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
        url.searchParams.set('callback', callback);

        window[callback] = data => {
            delete window[callback];
            script.remove();
            resolve(data);
        };

        const script = document.createElement('script');
        script.src = url.toString();
        script.onerror = () => {
            delete window[callback];
            script.remove();
            reject(new Error('jsonp failed'));
        };
        document.head.appendChild(script);
    });
}

async function checkRsvpAlreadySubmitted(name) {
    const data = await rsvpJsonp({ action: 'check', name });
    return data.alreadySubmitted === true;
}

/**
 * POST con URLSearchParams (petición "simple", sin preflight).
 * Si CORS sigue bloqueando la lectura de la respuesta, reintenta en no-cors
 * (el servidor ya validó duplicados en doPost).
 */
async function submitRsvp(data) {
    const body = new URLSearchParams();
    body.append('payload', JSON.stringify({ action: 'submit', ...data }));

    try {
        const res = await fetch(CONFIG.rsvpApiUrl, { method: 'POST', body });
        if (!res.ok) throw new Error('submit failed');
        return res.json();
    } catch {
        await fetch(CONFIG.rsvpApiUrl, { method: 'POST', mode: 'no-cors', body });
        return { ok: true };
    }
}

if (form) {
    // Mostrar/ocultar campo de acompañantes según respuesta
    document.querySelectorAll('input[name="attending"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const guestsField = document.getElementById('guests-field');
            guestsField.style.display = radio.value === 'Sí, asistiré' ? 'flex' : 'none';
        });
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const name      = guestName || window.VipGuest?.getInvitado()?.nombre?.trim() || '';
        const attending = form.querySelector('input[name="attending"]:checked')?.value || '';
        const guests    = document.getElementById('guests').value;
        const message   = document.getElementById('message').value.trim();

        formError.style.display = 'none';
        if (!name) return showError('No pudimos identificar tu invitación. Usa el enlace personal que te enviamos.');
        if (!attending) return showError('Por favor indica si asistirás.');
        if (!isRsvpApiConfigured()) {
            return showError('El formulario aún no está configurado. Contacta a los novios.');
        }

        setBusy(true);

        try {
            if (await checkRsvpAlreadySubmitted(name)) {
                showRsvpAlreadyAnswered();
                return;
            }

            const result = await submitRsvp({ name, attending, guests, message });

            if (result.alreadySubmitted) {
                showRsvpAlreadyAnswered();
                return;
            }

            if (!result.ok) {
                showError('No se pudo enviar tu confirmación. Intenta de nuevo.');
                return;
            }

            showRsvpSuccess(name);
        } catch (_) {
            showError('No se pudo conectar con el servidor. Intenta de nuevo.');
        } finally {
            setBusy(false);
        }
    });
}

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
