(function () {
    const data = window.INVITADOS_DATA || [];
    const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    function findInvitado(uuid) {
        if (!uuid || !data.length) return null;

        const normalized = String(uuid).trim().toLowerCase();
        if (!isUuid(normalized)) return null;

        return data.find(guest => guest.uuid === normalized) || null;
    }

    function findInvitadoFromUrl() {
        return findInvitado(getInviteId());
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
        findInvitado,
        findInvitadoFromUrl,
        populateGuestsSelect
    };
})();
