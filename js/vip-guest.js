(function () {
    const GUESTS_BASE = 'data/guests';
    const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    let cachedInvitado = null;

    function isUuid(value) {
        return UUID_V4_RE.test(String(value).trim().toLowerCase());
    }

    function getInviteId() {
        const hash = window.location.hash.slice(1).split(/[?&]/)[0];
        if (isUuid(hash)) return hash.trim().toLowerCase();

        for (const [key] of new URLSearchParams(window.location.search)) {
            if (isUuid(key)) return key.trim().toLowerCase();
        }

        return null;
    }

    async function loadInvitadoFromUrl() {
        if (cachedInvitado) return cachedInvitado;

        const uuid = getInviteId();
        if (!uuid) return null;

        try {
            const response = await fetch(`${GUESTS_BASE}/${uuid}.json`, { cache: 'no-store' });
            if (!response.ok) return null;

            const guest = await response.json();
            if (!guest || guest.uuid !== uuid) return null;

            cachedInvitado = guest;
            return cachedInvitado;
        } catch {
            return null;
        }
    }

    function getInvitado() {
        return cachedInvitado;
    }

    function populateGuestsSelect(cantidadMaxima) {
        const select = document.getElementById('guests');
        if (!select || cantidadMaxima < 1) return;

        select.innerHTML = '';

        for (let i = 1; i <= cantidadMaxima; i++) {
            const option = document.createElement('option');
            option.value = String(i);
            option.textContent = String(i);
            select.appendChild(option);
        }
    }

    window.VipGuest = {
        ready: loadInvitadoFromUrl(),
        getInvitado,
        loadInvitadoFromUrl,
        populateGuestsSelect
    };
})();
