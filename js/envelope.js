(function () {
    const MUSIC = {
        src: 'audio/ed-sheeran-thinking-out-loud.mp3'
    };

    const intro      = document.getElementById('envelope-intro');
    const envelope   = document.getElementById('envelope-open');
    const hint       = document.getElementById('envelope-hint');
    const siteShell  = document.getElementById('site-shell');
    const guestEl    = document.getElementById('envelope-guest');
    const audioEl    = document.getElementById('bg-audio');
    const controlsEl = document.getElementById('music-controls');
    const toggleBtn  = document.getElementById('music-toggle');
    const volumeEl   = document.getElementById('music-volume');

    if (!intro || !envelope) return;

    const params = new URLSearchParams(window.location.search);
    const guestName = params.get('invitado') || params.get('guest');
    if (guestName && guestEl) {
        guestEl.textContent = decodeURIComponent(guestName.replace(/\+/g, ' '));
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const defaultVolume = 0.85;

    if (audioEl) {
        audioEl.src = MUSIC.src;
        audioEl.loop = true;
        audioEl.volume = defaultVolume;
    }

    if (volumeEl) {
        volumeEl.value = String(Math.round(defaultVolume * 100));
    }

    function showControls() {
        if (controlsEl) controlsEl.hidden = false;
    }

    function setPausedUI(paused) {
        if (!controlsEl || !toggleBtn) return;
        controlsEl.classList.toggle('is-paused', paused);
        toggleBtn.setAttribute('aria-label', paused ? 'Reproducir música' : 'Pausar música');
    }

    function playMusic() {
        if (!audioEl) return;

        showControls();

        const playAttempt = audioEl.play();
        if (playAttempt?.catch) {
            playAttempt.catch(() => {
                audioEl.load();
                audioEl.play().catch(() => {});
            });
        }
    }

    function togglePlayback() {
        if (!audioEl) return;

        if (audioEl.paused) {
            audioEl.play().catch(() => {});
        } else {
            audioEl.pause();
        }
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', togglePlayback);
    }

    if (volumeEl && audioEl) {
        volumeEl.addEventListener('input', () => {
            audioEl.volume = volumeEl.value / 100;
        });
    }

    if (audioEl) {
        audioEl.addEventListener('play', () => setPausedUI(false));
        audioEl.addEventListener('pause', () => setPausedUI(true));
    }

    function revealSite() {
        document.body.classList.remove('envelope-locked');
        intro.classList.add('envelope-intro--done');
        intro.setAttribute('aria-hidden', 'true');
        if (siteShell) siteShell.removeAttribute('aria-hidden');
        setTimeout(() => intro.remove(), 900);
    }

    function openEnvelope() {
        if (intro.classList.contains('envelope-intro--opening')) return;

        playMusic();

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
