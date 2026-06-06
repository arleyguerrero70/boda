(function () {
    const intro     = document.getElementById('envelope-intro');
    const envelope  = document.getElementById('envelope-open');
    const hint      = document.getElementById('envelope-hint');
    const siteShell = document.getElementById('site-shell');
    const guestEl   = document.getElementById('envelope-guest');

    if (!intro || !envelope) return;

    const params = new URLSearchParams(window.location.search);
    const guestName = params.get('invitado') || params.get('guest');
    if (guestName && guestEl) {
        guestEl.textContent = decodeURIComponent(guestName.replace(/\+/g, ' '));
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function revealSite() {
        document.body.classList.remove('envelope-locked');
        intro.classList.add('envelope-intro--done');
        intro.setAttribute('aria-hidden', 'true');
        if (siteShell) siteShell.removeAttribute('aria-hidden');
        setTimeout(() => intro.remove(), 900);
    }

    function openEnvelope() {
        if (intro.classList.contains('envelope-intro--opening')) return;

        envelope.disabled = true;
        intro.classList.add('envelope-intro--opening');
        if (hint) hint.textContent = 'Abriendo…';

        if (prefersReducedMotion) {
            revealSite();
            return;
        }

        setTimeout(() => intro.classList.add('envelope-intro--revealing'), 1100);
        setTimeout(revealSite, 1900);
    }

    envelope.addEventListener('click', openEnvelope);

    envelope.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openEnvelope();
        }
    });
})();
