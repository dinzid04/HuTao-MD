const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 tabel standar untuk ZIP murni Node.js (jalan di Termux, Railway, Linux, Windows tanpa binary zip/unzip)
const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c >>> 0;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

/**
 * Buat file ZIP (DEFLATE) murni dari array { name, data: Buffer } tanpa dependensi eksternal.
 */
function buildZipBuffer(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of entries) {
        const nameBuf = Buffer.from(String(entry.name || '').replace(/\\/g, '/'), 'utf8');
        const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data || '');
        const crc = crc32(raw);
        const compressed = zlib.deflateRawSync(raw, { level: 6 });

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x0800, 6);
        local.writeUInt16LE(8, 8);
        local.writeUInt16LE(0, 10);
        local.writeUInt16LE(0, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(raw.length, 22);
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28);

        localParts.push(local, nameBuf, compressed);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(8, 10);
        central.writeUInt16LE(0, 12);
        central.writeUInt16LE(0, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(compressed.length, 20);
        central.writeUInt32LE(raw.length, 24);
        central.writeUInt16LE(nameBuf.length, 28);
        central.writeUInt16LE(0, 30);
        central.writeUInt16LE(0, 32);
        central.writeUInt16LE(0, 34);
        central.writeUInt16LE(0, 36);
        central.writeUInt32LE(0, 38);
        central.writeUInt32LE(offset, 42);

        centralParts.push(central, nameBuf);
        offset += local.length + nameBuf.length + compressed.length;
    }

    const centralBuf = Buffer.concat(centralParts);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralBuf.length, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralBuf, eocd]);
}

/**
 * Ekstrak ZIP murni Node.js (mendukung metode STORED=0 dan DEFLATE=8).
 */
function parseZipBuffer(zipBuf) {
    if (!Buffer.isBuffer(zipBuf) || zipBuf.length < 22) {
        throw new Error('File ZIP tidak valid.');
    }
    let eocdPos = -1;
    const minSearch = Math.max(0, zipBuf.length - 65557);
    for (let i = zipBuf.length - 22; i >= minSearch; i--) {
        if (zipBuf.readUInt32LE(i) === 0x06054b50) {
            eocdPos = i;
            break;
        }
    }
    if (eocdPos < 0) throw new Error('Struktur ZIP rusak (EOCD tidak ditemukan).');

    const totalEntries = zipBuf.readUInt16LE(eocdPos + 10);
    let cdOffset = zipBuf.readUInt32LE(eocdPos + 16);
    const files = [];

    for (let i = 0; i < totalEntries; i++) {
        if (cdOffset + 46 > zipBuf.length || zipBuf.readUInt32LE(cdOffset) !== 0x02014b50) {
            break;
        }
        const method = zipBuf.readUInt16LE(cdOffset + 10);
        const compSize = zipBuf.readUInt32LE(cdOffset + 20);
        const nameLen = zipBuf.readUInt16LE(cdOffset + 28);
        const extraLen = zipBuf.readUInt16LE(cdOffset + 30);
        const commentLen = zipBuf.readUInt16LE(cdOffset + 32);
        const localOffset = zipBuf.readUInt32LE(cdOffset + 42);
        const name = zipBuf.subarray(cdOffset + 46, cdOffset + 46 + nameLen).toString('utf8');
        cdOffset += 46 + nameLen + extraLen + commentLen;

        if (name.endsWith('/')) continue;
        if (localOffset + 30 > zipBuf.length || zipBuf.readUInt32LE(localOffset) !== 0x04034b50) continue;

        const lNameLen = zipBuf.readUInt16LE(localOffset + 26);
        const lExtraLen = zipBuf.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + lNameLen + lExtraLen;
        const compSlice = zipBuf.subarray(dataStart, dataStart + compSize);

        let data;
        if (method === 0) data = Buffer.from(compSlice);
        else if (method === 8) data = zlib.inflateRawSync(compSlice);
        else continue;

        files.push({ name, data });
    }
    return files;
}

function collectSessionFiles(sessionDir = './session') {
    if (!fs.existsSync(sessionDir)) return {};
    const out = {};
    const files = fs.readdirSync(sessionDir);
    for (const f of files) {
        if (!f.endsWith('.json')) continue;
        if (f.startsWith('app-state-sync-version-')) continue;
        const fp = path.join(sessionDir, f);
        try {
            const st = fs.statSync(fp);
            if (!st.isFile() || st.size === 0 || st.size > 512 * 1024) continue;
            out[f] = fs.readFileSync(fp, 'utf8');
        } catch (_) {}
    }
    return out;
}

function hasValidLocalSession(sessionDir = './session') {
    try {
        const credsPath = path.join(sessionDir, 'creds.json');
        if (!fs.existsSync(credsPath)) return false;
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        return Boolean(creds && creds.registered && creds.me?.id);
    } catch (_) {
        return false;
    }
}

// Session WA TIDAK disimpan ke MongoDB (100% lokal per device/panel agar tiap user pairing sendiri-sendiri)
function isCloudSessionSyncEnabled() {
    return false;
}
async function pushSessionSnapshotToCloud() {
    return { ok: false, reason: 'local-only-session' };
}
function scheduleCloudSessionPush() {}
async function restoreSessionFromCloudIfMissing() {
    return { restored: false, reason: 'local-only-session' };
}
async function clearCloudSession() {
    return false;
}
async function getCloudSessionStatus() {
    return { configured: false, enabled: false, exists: false };
}

/**
 * Buat file ZIP portable berisi folder session LOKAL untuk dipindahkan ke panel baru / Termux / Railway.
 */
function createSessionZipBuffer(sessionDir = './session') {
    const filesMap = collectSessionFiles(sessionDir);
    if (!filesMap['creds.json']) {
        throw new Error('File session/creds.json tidak ditemukan.');
    }
    const entries = Object.entries(filesMap).map(([name, content]) => ({
        name: `session/${name}`,
        data: Buffer.from(content, 'utf8')
    }));
    return {
        buffer: buildZipBuffer(entries),
        fileCount: entries.length
    };
}

/**
 * Restore folder session LOKAL dari buffer ZIP hasil .backupsesi.
 */
function restoreSessionFromZipBuffer(zipBuf, sessionDir = './session') {
    const entries = parseZipBuffer(zipBuf);
    const jsonFiles = [];
    let hasValidCreds = false;
    let botNumber = '';

    for (const e of entries) {
        const base = path.basename(e.name);
        if (!base.endsWith('.json')) continue;
        if (base === 'creds.json') {
            const parsed = JSON.parse(e.data.toString('utf8'));
            if (parsed && parsed.registered && parsed.me?.id) {
                hasValidCreds = true;
                botNumber = String(parsed.me.id).split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
            }
        }
        jsonFiles.push({ base, data: e.data });
    }

    if (!hasValidCreds) {
        throw new Error('File ZIP tidak berisi creds.json yang valid/terdaftar.');
    }

    fs.rmSync(sessionDir, { recursive: true, force: true });
    fs.mkdirSync(sessionDir, { recursive: true });
    for (const f of jsonFiles) {
        fs.writeFileSync(path.join(sessionDir, f.base), f.data);
    }

    return { fileCount: jsonFiles.length, botNumber };
}

module.exports = {
    isCloudSessionSyncEnabled,
    buildZipBuffer,
    parseZipBuffer,
    hasValidLocalSession,
    pushSessionSnapshotToCloud,
    scheduleCloudSessionPush,
    restoreSessionFromCloudIfMissing,
    clearCloudSession,
    getCloudSessionStatus,
    createSessionZipBuffer,
    restoreSessionFromZipBuffer
};
