import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'invitados.md');
const idsFile = join(root, 'data', 'invitados-uuids.json');
const guestsDir = join(root, 'data', 'guests');
const urlsDoc = join(root, 'invitados-urls.md');

const BASE_URL = (process.env.BODA_BASE_URL || 'index.html').replace(/\/$/, '');

function slugify(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function parseInvitados(markdown) {
    return markdown
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('|') && !line.includes(':---'))
        .slice(1)
        .map(line => {
            const cells = line.split('|').map(c => c.trim()).filter(Boolean);
            const nombre = cells[0];
            const cantidad = parseInt(cells[1], 10);
            if (!nombre || Number.isNaN(cantidad)) return null;
            return { slug: slugify(nombre), nombre, cantidad };
        })
        .filter(Boolean);
}

function loadUuidMap() {
    if (!existsSync(idsFile)) return {};
    return JSON.parse(readFileSync(idsFile, 'utf8'));
}

function saveUuidMap(map) {
    mkdirSync(dirname(idsFile), { recursive: true });
    writeFileSync(idsFile, JSON.stringify(map, null, 4) + '\n', 'utf8');
}

function buildVipUrl(uuid) {
    const separator = BASE_URL.includes('?') ? '&' : '?';
    return `${BASE_URL}${separator}${uuid}`;
}

const markdown = readFileSync(source, 'utf8');
const invitados = parseInvitados(markdown);
const uuidMap = loadUuidMap();
const usedUuids = new Set(Object.values(uuidMap));

for (const guest of invitados) {
    if (!uuidMap[guest.slug]) {
        let uuid;
        do {
            uuid = randomUUID();
        } while (usedUuids.has(uuid));
        uuidMap[guest.slug] = uuid;
        usedUuids.add(uuid);
    }
    guest.uuid = uuidMap[guest.slug];
}

const knownSlugs = new Set(invitados.map(g => g.slug));
for (const slug of Object.keys(uuidMap)) {
    if (!knownSlugs.has(slug)) delete uuidMap[slug];
}

saveUuidMap(uuidMap);

mkdirSync(guestsDir, { recursive: true });

const activeUuids = new Set();

for (const guest of invitados) {
    const payload = {
        uuid: guest.uuid,
        nombre: guest.nombre,
        cantidad: guest.cantidad
    };
    const filePath = join(guestsDir, `${guest.uuid}.json`);
    writeFileSync(filePath, JSON.stringify(payload, null, 4) + '\n', 'utf8');
    activeUuids.add(`${guest.uuid}.json`);
}

for (const fileName of readdirSync(guestsDir)) {
    if (!fileName.endsWith('.json')) continue;
    if (!activeUuids.has(fileName)) {
        unlinkSync(join(guestsDir, fileName));
    }
}

const now = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
const urlRows = invitados.map(guest => {
    const url = buildVipUrl(guest.uuid);
    return `| ${guest.nombre} | ${guest.cantidad} | \`${url}\` |`;
});

const md = `# Enlaces VIP de invitados

> Generado: ${now}
> Base URL: \`${BASE_URL}\`
> Para cambiar el dominio: \`BODA_BASE_URL=https://tudominio.com node scripts/generate-invitados.mjs\`

| Invitado | Cantidad máx. | URL |
| :--- | :---: | :--- |
${urlRows.join('\n')}
`;

writeFileSync(urlsDoc, md, 'utf8');

console.log(`✓ ${invitados.length} invitados → data/guests/*.json`);
console.log(`✓ Enlaces → invitados-urls.md`);
