const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const chalk = require('chalk');
const mongo = require('../core/mongo');

const SNAPSHOT_COLLECTION = 'bot_session_snapshot';
const PUSH_MIN_INTERVAL_MS = 3 * 60 * 1000; // throttle 3 menit agar 0 delay & hemat MongoDB

const lastPushByKey = new Map();
const pushTimers = new Map();
const pushInFlight = new Map();

// CRC32 tabel standar untuk ZIP murni Node.js (jalan di Termux, Railway, Linux, Windows tanpa butuh binary zip/unzip!)
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
        local.writeUInt16LE(8, 8); // deflate
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
    // Cari End of Central Directory (0x06054b50) dari belakang
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
        if (f.startsWith('app-state-sync-version-')) continue; // skip transient app-state versions
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

/**
 * Backup snapshot folder session (terkompresi gzip) ke MongoDB Cloud.
 * Runtime tetap 100% lokal (0ms latency); jika panel down/pindah panel baru dengan folder session kosong,
 * session otomatis ter-restore selama perangkat di WhatsApp belum di-logout!
 */
async function pushSessionSnapshotToCloud(slotKey = 'main', sessionDir = './session', force = false) {
    if (!mongo.isConfigured()) return { ok: false, reason: 'no-mongo' };
    if (!hasValidLocalSession(sessionDir)) return { ok: false, reason: 'no-valid-creds' };

    const now = Date.now();
    const prev = lastPushByKey.get(slotKey) || 0;
    if (!force && (now - prev) < PUSH_MIN_INTERVAL_MS) {
        return { ok: true, skipped: true };
    }
    if (pushInFlight.has(slotKey)) return pushInFlight.get(slotKey);

    const task = (async () => {
        try {
            const db = await mongo.getDb();
            if (!db) return { ok: false, reason: 'db-unavailable' };

            const filesMap = collectSessionFiles(sessionDir);
            if (!filesMap['creds.json']) return { ok: false, reason: 'missing-creds' };

            const credsObj = JSON.parse(filesMap['creds.json']);
            const botNum = String(credsObj?.me?.id || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
            const jsonStr = JSON.stringify(filesMap);
            const gzBuf = zlib.gzipSync(Buffer.from(jsonStr, 'utf8'), { level: 6 });

            // MongoDB doc limit 16MB — jaga agar selalu ringan (<10MB)
            if (gzBuf.length > 10 * 1024 * 1024) {
                // Fallback simpan creds + pre-key + app-state-sync-key + sender-key saja
                const essential = {};
                for (const [k, v] of Object.entries(filesMap)) {
                    if (k === 'creds.json' || k.startsWith('pre-key-') || k.startsWith('app-state-sync-key-') || k.startsWith('sender-key-')) {
                        essential[k] = v;
                    }
                }
                const slimGz = zlib.gzipSync(Buffer.from(JSON.stringify(essential), 'utf8'), { level: 6 });
                await db.collection(SNAPSHOT_COLLECTION).updateOne(
                    { _id: slotKey },
                    {
                        $set: {
                            gzipBase64: slimGz.toString('base64'),
                            fileCount: Object.keys(essential).length,
                            sizeBytes: slimGz.length,
                            botNumber: botNum,
                            updatedAt: new Date()
                        }
                    },
                    { upsert: true }
                );
                lastPushByKey.set(slotKey, Date.now());
                return { ok: true, fileCount: Object.keys(essential).length, sizeBytes: slimGz.length, botNumber: botNum };
            }

            await db.collection(SNAPSHOT_COLLECTION).updateOne(
                { _id: slotKey },
                {
                    $set: {
                        gzipBase64: gzBuf.toString('base64'),
                        fileCount: Object.keys(filesMap).length,
                        sizeBytes: gzBuf.length,
                        botNumber: botNum,
                        updatedAt: new Date()
                    }
                },
                { upsert: true }
            );
            lastPushByKey.set(slotKey, Date.now());
            return { ok: true, fileCount: Object.keys(filesMap).length, sizeBytes: gzBuf.length, botNumber: botNum };
        } catch (err) {
            console.warn(chalk.yellow(`[SessionSync:${slotKey}] Gagal sync ke cloud:`), err.message);
            return { ok: false, reason: err.message };
        } finally {
            pushInFlight.delete(slotKey);
        }
    })();

    pushInFlight.set(slotKey, task);
    return task;
}

function scheduleCloudSessionPush(slotKey = 'main', sessionDir = './session', delayMs = 20000) {
    if (!mongo.isConfigured()) return;
    if (pushTimers.has(slotKey)) return;
    const t = setTimeout(() => {
        pushTimers.delete(slotKey);
        pushSessionSnapshotToCloud(slotKey, sessionDir, false).catch(() => {});
    }, delayMs);
    if (typeof t.unref === 'function') t.unref();
    pushTimers.set(slotKey, t);
}

/**
 * Jika folder session lokal kosong (habis pindah panel / Railway restart / Termux baru),
 * otomatis tarik snapshot terakhir dari MongoDB Cloud!
 */
async function restoreSessionFromCloudIfMissing(slotKey = 'main', sessionDir = './session') {
    if (hasValidLocalSession(sessionDir)) return { restored: false, reason: 'local-exists' };
    if (!mongo.isConfigured()) return { restored: false, reason: 'no-mongo' };

    try {
        const db = await mongo.getDb();
        if (!db) return { restored: false, reason: 'db-unavailable' };

        const doc = await db.collection(SNAPSHOT_COLLECTION).findOne({ _id: slotKey });
        if (!doc || typeof doc.gzipBase64 !== 'string') {
            return { restored: false, reason: 'no-cloud-snapshot' };
        }

        const gzBuf = Buffer.from(doc.gzipBase64, 'base64');
        const filesMap = JSON.parse(zlib.gunzipSync(gzBuf).toString('utf8'));
        if (!filesMap || !filesMap['creds.json']) {
            return { restored: false, reason: 'invalid-snapshot' };
        }

        const credsCheck = JSON.parse(filesMap['creds.json']);
        if (!credsCheck?.registered || !credsCheck?.me?.id) {
            return { restored: false, reason: 'unregistered-snapshot' };
        }

        fs.mkdirSync(sessionDir, { recursive: true });
        let count = 0;
        for (const [fname, content] of Object.entries(filesMap)) {
            const safeName = path.basename(fname);
            if (!safeName.endsWith('.json')) continue;
            fs.writeFileSync(path.join(sessionDir, safeName), content, 'utf8');
            count++;
        }
        console.log(
            chalk.green(
                `[SessionSync:${slotKey}] Session otomatis dipulihkan dari MongoDB Cloud (${count} file, nomor +${doc.botNumber || '?'}) — langsung reconnect tanpa pairing!`
            )
        );
        return { restored: true, fileCount: count, botNumber: doc.botNumber || '' };
    } catch (err) {
        console.warn(chalk.yellow(`[SessionSync:${slotKey}] Gagal restore dari cloud:`), err.message);
        return { restored: false, reason: err.message };
    }
}

/**
 * Hapus snapshot cloud saat bot benar-benar di-logout (kode 401 / loggedOut dari WA Linked Devices).
 */
async function clearCloudSession(slotKey = 'main') {
    if (!mongo.isConfigured()) return false;
    try {
        const db = await mongo.getDb();
        if (!db) return false;
        await db.collection(SNAPSHOT_COLLECTION).deleteOne({ _id: slotKey });
        lastPushByKey.delete(slotKey);
        return true;
    } catch (_) {
        return false;
    }
}

async function getCloudSessionStatus(slotKey = 'main') {
    if (!mongo.isConfigured()) return { configured: false, exists: false };
    try {
        const db = await mongo.getDb();
        if (!db) return { configured: true, connected: false, exists: false };
        const doc = await db.collection(SNAPSHOT_COLLECTION).findOne(
            { _id: slotKey },
            { projection: { fileCount: 1, sizeBytes: 1, botNumber: 1, updatedAt: 1 } }
        );
        if (!doc) return { configured: true, connected: true, exists: false };
        return {
            configured: true,
            connected: true,
            exists: true,
            fileCount: doc.fileCount || 0,
            sizeBytes: doc.sizeBytes || 0,
            botNumber: doc.botNumber || '',
            updatedAt: doc.updatedAt || null
        };
    } catch (_) {
        return { configured: true, connected: false, exists: false };
    }
}

/**
 * Buat file ZIP portable berisi folder session untuk dipindahkan ke panel baru / Termux / Railway.
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
 * Restore folder session dari buffer ZIP hasil .backupsesi.
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
