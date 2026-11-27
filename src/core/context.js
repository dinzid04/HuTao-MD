const fs = require('fs');
const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');
const mongo = require('./mongo');

const als = new AsyncLocalStorage();

const DATA_DIR = path.join(process.cwd(), 'data');
const JADIBOT_MEDIA_ROOT = path.join(DATA_DIR, 'jadibot-media');
const MAIN_MEDIA_DIR = path.join(process.cwd(), 'assets', 'media');
const MAIN_LIST_MEDIA_DIR = path.join(DATA_DIR, 'media-list');

const DEFAULT_BADWORDS = [
    'kontol', 'memek', 'mmk', 'meki',
    'peler', 'pler', 'ngentot', 'ngntot', 'ngewe', 'jembut',
    'pepek', 'titit'
];

const STORE_DEFAULTS = {
    owner: () => [],
    premium: () => [],
    lists: () => ({}),
    list_settings: () => ({}),
    welcome: () => ({}),
    left: () => ({}),
    badwords: () => ({ words: [...DEFAULT_BADWORDS] }),
    sewagrup: () => [],
    sewa_notified: () => ({}),
    sistemsewa: () => ({ enabled: false }),
    afk: () => ({}),
    claim: () => ({}),
    limit_config: () => ({ defaultLimit: 25, users: {} }),
    limit_usage: () => [],
    limit_bonus: () => ({}),
    amroles: () => ({ pts: {}, resellers: {} }),
    lid_cache: () => ({ lidToPhone: {}, phoneToLid: {}, names: {} }),
    clans: () => ({}),
    clan_invites: () => ({}),
    giveaways: () => ({}),
    confess: () => ({}),
    couples: () => ({})
};

function createDefaultStore(isJadibot = false) {
    const store = {};
    for (const [key, factory] of Object.entries(STORE_DEFAULTS)) {
        store[key] = factory(isJadibot);
    }
    return store;
}

function createDefaultBotData(isJadibot = false) {
    return {
        users: {},
        groups: {},
        database: {},
        settings: {
            autoread: false,
            autotyping: false,
            isPublic: true,
            prefixMode: 'multi',
            prefix: '.',
            audiomenu: true,
            menuStyle: 1,
            levelupNotif: false,
            notifUpdate: false,
            callQuality: '480p',
            callAudioQuality: 'clear'
        },
        cpanel: {
            servers: {},
            v1: { reseller: [] },
            v2: { reseller: [] },
            v3: { reseller: [] }
        },
        store: createDefaultStore(isJadibot)
    };
}

function normalizeBotData(raw, isJadibot = false) {
    const defaults = createDefaultBotData(isJadibot);
    const src = raw && typeof raw === 'object' ? raw : {};
    const merged = {
        ...defaults,
        ...src,
        users: src.users && typeof src.users === 'object' ? src.users : defaults.users,
        groups: src.groups && typeof src.groups === 'object' ? src.groups : defaults.groups,
        database: src.database && typeof src.database === 'object' ? src.database : defaults.database,
        settings: {
            ...defaults.settings,
            ...(src.settings && typeof src.settings === 'object' ? src.settings : {})
        },
        cpanel: {
            ...defaults.cpanel,
            ...(src.cpanel && typeof src.cpanel === 'object' ? src.cpanel : {})
        },
        store: {
            ...defaults.store,
            ...(src.store && typeof src.store === 'object' ? src.store : {})
        }
    };

    if (typeof merged.settings.audiomenu === 'undefined' || merged.settings.audiomenu === null) {
        merged.settings.audiomenu = true;
    }
    if (typeof merged.settings.levelupNotif !== 'boolean') {
        merged.settings.levelupNotif = false;
    }
    if (typeof merged.settings.notifUpdate !== 'boolean') {
        merged.settings.notifUpdate = false;
    }
    if (!merged.settings.callQuality || typeof merged.settings.callQuality !== 'string') {
        merged.settings.callQuality = '480p';
    }
    if (!merged.settings.callAudioQuality || typeof merged.settings.callAudioQuality !== 'string') {
        merged.settings.callAudioQuality = 'clear';
    }
    if (!Number.isInteger(merged.settings.menuStyle) || merged.settings.menuStyle < 1 || merged.settings.menuStyle > 20) {
        const parsedStyle = parseInt(merged.settings.menuStyle, 10);
        merged.settings.menuStyle = (parsedStyle >= 1 && parsedStyle <= 20) ? parsedStyle : 1;
    }
    if (typeof merged.settings.antidelete !== 'boolean') {
        merged.settings.antidelete = false;
    }
    if (merged.settings.anticall !== 'block' && merged.settings.anticall !== 'reject' && typeof merged.settings.anticall !== 'boolean') {
        merged.settings.anticall = false;
    }
    if (typeof merged.settings.autobio !== 'boolean') {
        merged.settings.autobio = false;
    }
    if (typeof merged.settings.autoreactsw !== 'boolean' && typeof merged.settings.autoreactsw !== 'string') {
        merged.settings.autoreactsw = false;
    }

    for (const [key, factory] of Object.entries(STORE_DEFAULTS)) {
        if (typeof merged.store[key] === 'undefined' || merged.store[key] === null) {
            merged.store[key] = factory(isJadibot);
        }
    }

    if (
        merged.store.sistemsewa &&
        merged.store.sistemsewa.enabled === true &&
        merged.store.sistemsewa.explicit !== true
    ) {
        merged.store.sistemsewa = { enabled: false, explicit: false };
    }

    return merged;
}

function normalizeRootDb(raw) {
    const base = normalizeBotData(raw, false);
    const rawJadibot = raw && typeof raw.jadibot === 'object' && raw.jadibot ? raw.jadibot : {};
    const registry = rawJadibot.registry && typeof rawJadibot.registry === 'object' ? rawJadibot.registry : {};
    const rawClones = rawJadibot.clones && typeof rawJadibot.clones === 'object' ? rawJadibot.clones : {};
    const clones = {};

    for (const [num, cloneData] of Object.entries(rawClones)) {
        const normClone = normalizeBotData(cloneData, true);
        // lid_cache dibagikan di root store agar tidak diduplikasi ratusan KB per clone
        if (normClone.store && normClone.store.lid_cache) {
            normClone.store.lid_cache = { lidToPhone: {}, phoneToLid: {}, names: {} };
        }
        clones[num] = normClone;
    }

    base.jadibot = { registry, clones };
    if (raw && raw._meta && typeof raw._meta === 'object') {
        base._meta = { updatedAt: Number(raw._meta.updatedAt) || 0 };
    } else {
        base._meta = { updatedAt: 0 };
    }
    return base;
}

function getDatabasePath() {
    const filename = String(global.tempatDB || 'database.json').trim() || 'database.json';
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    return path.join(DATA_DIR, filename);
}

function loadRootDbFromDisk() {
    const dbFile = getDatabasePath();
    let parsed = {};
    if (fs.existsSync(dbFile)) {
        try {
            parsed = JSON.parse(fs.readFileSync(dbFile, 'utf8') || '{}');
        } catch (e) {
            console.error('[Database] Gagal membaca database.json, menggunakan struktur default:', e.message);
            parsed = {};
        }
    }
    const normalized = normalizeRootDb(parsed);
    if (!fs.existsSync(dbFile)) {
        writeRootDbToDisk(normalized);
    }
    return normalized;
}

let activeStorageMode = 'local';
let lastDiskSerialized = '';
let lastMongoSerialized = '';
let diskWriteTimer = null;
let diskWriteInFlight = false;
let mongoPushTimer = null;
let mongoPushInFlight = null;
let lastMongoPushAt = 0;
const MONGO_MIN_INTERVAL_MS = 60 * 1000;

function writeRootDbToDisk(rootObj, force = false) {
    const dbFile = getDatabasePath();
    const dir = path.dirname(dbFile);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (rootObj && typeof rootObj === 'object') {
        rootObj._meta = { updatedAt: Date.now() };
    }
    // Gunakan JSON compact (tanpa indentasi 2 spasi) -> ~40% lebih kecil & 3x lebih cepat di-stringify!
    const payload = JSON.stringify(rootObj);
    if (!force && payload === lastDiskSerialized && fs.existsSync(dbFile)) {
        return { dbFile, payload, changed: false };
    }
    const tmpFile = `${dbFile}.tmp`;
    if (force) {
        try {
            fs.writeFileSync(tmpFile, payload, 'utf8');
            fs.renameSync(tmpFile, dbFile);
        } catch (e) {
            try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
            fs.writeFileSync(dbFile, payload, 'utf8');
        }
        lastDiskSerialized = payload;
        return { dbFile, payload, changed: true };
    }

    // Penulisan disk ASYNC agar event loop tidak pernah macet saat menulis file >1MB
    lastDiskSerialized = payload;
    if (!diskWriteInFlight) {
        diskWriteInFlight = true;
        fs.promises.writeFile(tmpFile, payload, 'utf8')
            .then(() => fs.promises.rename(tmpFile, dbFile))
            .catch(async () => {
                try { await fs.promises.unlink(tmpFile); } catch (_) {}
                try { await fs.promises.writeFile(dbFile, payload, 'utf8'); } catch (_) {}
            })
            .finally(() => {
                diskWriteInFlight = false;
            });
    }
    return { dbFile, payload, changed: true };
}

function scheduleDiskWrite() {
    if (diskWriteTimer) return;
    diskWriteTimer = setTimeout(() => {
        diskWriteTimer = null;
        try { writeRootDbToDisk(getRootDb(), false); } catch (_) {}
    }, 15000);
    if (typeof diskWriteTimer.unref === 'function') diskWriteTimer.unref();
}

async function pushRootDbToMongo(force = false, preSerialized = null) {
    if (!mongo.isConfigured()) {
        activeStorageMode = 'local';
        return false;
    }
    const now = Date.now();
    if (!force && (now - lastMongoPushAt) < MONGO_MIN_INTERVAL_MS) {
        scheduleMongoPush();
        return true;
    }
    if (mongoPushTimer) {
        clearTimeout(mongoPushTimer);
        mongoPushTimer = null;
    }

    const payload = typeof preSerialized === 'string' ? preSerialized : JSON.stringify(getRootDb());
    if (!force && payload === lastMongoSerialized) {
        return true;
    }

    if (mongoPushInFlight) {
        if (!force) return true;
        try { await mongoPushInFlight; } catch (_) {}
    }

    const latestPayload = force ? JSON.stringify(getRootDb()) : payload;
    if (!force && latestPayload === lastMongoSerialized) {
        return true;
    }

    mongoPushInFlight = (async () => {
        const ok = await mongo.savePayload(latestPayload);
        if (ok) {
            lastMongoSerialized = latestPayload;
            lastMongoPushAt = Date.now();
            activeStorageMode = 'mongodb';
        }
        return ok;
    })();

    try {
        return await mongoPushInFlight;
    } finally {
        mongoPushInFlight = null;
    }
}

function scheduleMongoPush() {
    if (!mongo.isConfigured()) return;
    if (mongoPushTimer) return;
    const elapsed = Date.now() - lastMongoPushAt;
    const waitMs = Math.max(5000, MONGO_MIN_INTERVAL_MS - elapsed);
    mongoPushTimer = setTimeout(() => {
        mongoPushTimer = null;
        pushRootDbToMongo(false).catch(() => {});
    }, waitMs);
    if (typeof mongoPushTimer.unref === 'function') mongoPushTimer.unref();
}

function getStorageMode() {
    return activeStorageMode;
}

async function initStorage() {
    const localDb = loadRootDbFromDisk();
    if (!mongo.isConfigured()) {
        activeStorageMode = 'local';
        global._mainDb = localDb;
        return { mode: 'local', data: global._mainDb };
    }

    const { connected, payload } = await mongo.loadPayload();
    if (!connected) {
        activeStorageMode = 'local';
        global._mainDb = localDb;
        return { mode: 'local', data: global._mainDb };
    }

    activeStorageMode = 'mongodb';
    if (payload && typeof payload === 'object' && Object.keys(payload).length > 0) {
        const cloudNorm = normalizeRootDb(payload);
        const localTs = Number(localDb?._meta?.updatedAt || 0);
        const cloudTs = Number(cloudNorm?._meta?.updatedAt || 0);
        const localSettingsTs = Number(localDb?.settings?._updatedAt || localTs);
        const cloudSettingsTs = Number(cloudNorm?.settings?._updatedAt || cloudTs);

        // Jika settings lokal di disk lebih baru (misal habis .setmenu 8 lalu langsung .updatesc / restart panel
        // sebelum antrean MongoDB 60 detik sempat jalan), pertahankan settings lokal & langsung sinkronkan ke MongoDB!
        if (localSettingsTs > cloudSettingsTs && localDb?.settings) {
            cloudNorm.settings = { ...cloudNorm.settings, ...localDb.settings };
        }
        if (localTs > cloudTs && cloudTs > 0) {
            global._mainDb = localDb;
            writeRootDbToDisk(global._mainDb, true);
            await pushRootDbToMongo(true);
            return { mode: 'mongodb', source: 'local_newer_synced', data: global._mainDb };
        }

        const rawBefore = JSON.stringify(payload);
        global._mainDb = cloudNorm;
        const normAfter = JSON.stringify(global._mainDb);
        writeRootDbToDisk(global._mainDb, true);
        if (normAfter !== rawBefore || localSettingsTs > cloudSettingsTs) {
            await pushRootDbToMongo(true);
        } else {
            lastMongoSerialized = normAfter;
        }
        return { mode: 'mongodb', source: 'cloud', data: global._mainDb };
    }

    global._mainDb = localDb;
    await pushRootDbToMongo(true);
    return { mode: 'mongodb', source: 'migrated_from_local', data: global._mainDb };
}

async function flushStorage(force = false) {
    const root = getRootDb();
    const res = writeRootDbToDisk(root, force);
    if (mongo.isConfigured()) {
        if (force) {
            await pushRootDbToMongo(true, res.payload);
        } else if (res.changed) {
            await pushRootDbToMongo(false, res.payload);
        }
    }
    return getDatabasePath();
}

global._mainConfig = global._mainConfig || {
    owner: '628990936282',
    namaOwner: 'DinzID',
    packname: 'HuTao - MD',
    botname: 'HuTao - MD',
    asciiName: 'HuTao - MD',
    asciiFont: 'ANSI Shadow',
    audiomenu: true,
    image: {
        menu: 'https://image2url.com/r2/default/images/1773625179709-bccac35a-f5a7-4722-88a3-d2fe955d8526.jpg',
        qris: ''
    },
    payment: {
        qris: '',
        dana: '6285187652117',
        gopay: '6285187652117',
        an: 'HuTao - MD'
    }
};

if (!global._mainDb || !global._mainDb.store || !global._mainDb.jadibot) {
    global._mainDb = loadRootDbFromDisk();
}

function getRootDb() {
    if (!global._mainDb || !global._mainDb.store || !global._mainDb.jadibot) {
        global._mainDb = normalizeRootDb(global._mainDb);
    }
    return global._mainDb;
}

function reloadRootDb() {
    global._mainDb = loadRootDbFromDisk();
    return global._mainDb;
}

function saveRootDb() {
    scheduleDiskWrite();
    scheduleMongoPush();
    return getDatabasePath();
}

async function saveSettingsNow() {
    const root = getRootDb();
    if (!root.settings || typeof root.settings !== 'object') root.settings = {};
    root.settings._updatedAt = Date.now();
    return flushStorage(true);
}

function normalizeNumber(raw) {
    return String(raw || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function getActiveStore(Dinz) {
    if (Dinz && typeof Dinz === 'object' && Dinz.isJadibot && Dinz.jadibotNumber) {
        return { isJadibot: true, number: normalizeNumber(Dinz.jadibotNumber), Dinz };
    }
    if (Dinz && typeof Dinz === 'string') {
        const asNum = normalizeNumber(Dinz);
        if (asNum && asNum.length >= 8) {
            return { isJadibot: true, number: asNum, Dinz: null };
        }
    }
    if (Dinz && typeof Dinz === 'object' && Dinz.jadibotNumber) {
        return { isJadibot: true, number: normalizeNumber(Dinz.jadibotNumber), Dinz };
    }
    const store = als.getStore();
    if (store && store.isJadibot && store.number) {
        return store;
    }
    return { isJadibot: false, number: null, Dinz: Dinz || store?.Dinz || null };
}

function isJadibotContext(Dinz) {
    return getActiveStore(Dinz).isJadibot;
}

function getJadibotNumber(Dinz) {
    return getActiveStore(Dinz).number;
}

function normalizeSectionName(name) {
    return String(name || '').replace(/\.json$/i, '').trim();
}

function getTargetBotData(Dinz) {
    const ctx = getActiveStore(Dinz);
    if (ctx.isJadibot && ctx.number) {
        return ensureJadibotData(ctx.number);
    }
    return getRootDb();
}

function getSection(sectionName, Dinz) {
    const key = normalizeSectionName(sectionName);
    const ctx = getActiveStore(Dinz);
    const target = getTargetBotData(Dinz);
    if (!target.store) {
        target.store = createDefaultStore(ctx.isJadibot);
    }
    if (typeof target.store[key] === 'undefined' || target.store[key] === null) {
        const factory = STORE_DEFAULTS[key];
        target.store[key] = factory ? factory(ctx.isJadibot) : {};
    }
    return target.store[key];
}

function setSection(sectionName, data, Dinz) {
    const key = normalizeSectionName(sectionName);
    const ctx = getActiveStore(Dinz);
    const target = getTargetBotData(Dinz);
    if (!target.store) {
        target.store = createDefaultStore(ctx.isJadibot);
    }
    target.store[key] = data;
    saveRootDb();
    return data;
}

function getMainSection(sectionName) {
    const key = normalizeSectionName(sectionName);
    const root = getRootDb();
    if (!root.store) {
        root.store = createDefaultStore(false);
    }
    if (typeof root.store[key] === 'undefined' || root.store[key] === null) {
        const factory = STORE_DEFAULTS[key];
        root.store[key] = factory ? factory(false) : {};
    }
    return root.store[key];
}

function setMainSection(sectionName, data) {
    const key = normalizeSectionName(sectionName);
    const root = getRootDb();
    if (!root.store) {
        root.store = createDefaultStore(false);
    }
    root.store[key] = data;
    saveRootDb();
    return data;
}

function getJadibotRegistry() {
    const root = getRootDb();
    if (!root.jadibot) root.jadibot = { registry: {}, clones: {} };
    if (!root.jadibot.registry || typeof root.jadibot.registry !== 'object') {
        root.jadibot.registry = {};
    }
    return root.jadibot.registry;
}

function saveJadibotRegistry(reg) {
    const root = getRootDb();
    if (!root.jadibot) root.jadibot = { registry: {}, clones: {} };
    root.jadibot.registry = reg && typeof reg === 'object' ? reg : {};
    saveRootDb();
    return root.jadibot.registry;
}

function updateRegistryCache(reg) {
    const root = getRootDb();
    if (!root.jadibot) root.jadibot = { registry: {}, clones: {} };
    root.jadibot.registry = reg && typeof reg === 'object' ? reg : {};
}

function getJadibotMediaDir(number) {
    number = normalizeNumber(number);
    return path.join(JADIBOT_MEDIA_ROOT, number || 'default');
}

function ensureJadibotData(number, ownerNum) {
    number = normalizeNumber(number);
    const root = getRootDb();
    if (!number) return root;

    if (!root.jadibot) root.jadibot = { registry: {}, clones: {} };
    if (!root.jadibot.clones) root.jadibot.clones = {};

    if (!root.jadibot.clones[number]) {
        const clone = createDefaultBotData(true);
        const cleanOwner = normalizeNumber(ownerNum);
        clone.store.owner = [...new Set([number, cleanOwner].filter(Boolean))];
        root.jadibot.clones[number] = clone;
        saveRootDb();
    } else {
        root.jadibot.clones[number] = normalizeBotData(root.jadibot.clones[number], true);
        if (ownerNum) {
            const cleanOwner = normalizeNumber(ownerNum);
            const owners = Array.isArray(root.jadibot.clones[number].store.owner)
                ? root.jadibot.clones[number].store.owner
                : [];
            if (cleanOwner && !owners.includes(cleanOwner)) {
                owners.push(cleanOwner);
                root.jadibot.clones[number].store.owner = [...new Set([number, ...owners].filter(Boolean))];
                saveRootDb();
            }
        }
    }

    return root.jadibot.clones[number];
}

function hasJadibotData(number) {
    number = normalizeNumber(number);
    if (!number) return false;
    const root = getRootDb();
    return Boolean(root.jadibot?.clones?.[number] || fs.existsSync(getJadibotMediaDir(number)));
}

function getJadibotMemoryDb(number) {
    number = normalizeNumber(number);
    if (!number) return getRootDb();
    return ensureJadibotData(number);
}

function setJadibotMemoryDb(number, data) {
    number = normalizeNumber(number);
    const root = getRootDb();
    if (!number) {
        // Jika objek sudah merupakan root DB aktif di memori, tidak perlu deep-clone/normalize ulang!
        if (!data || data === global._mainDb) return;
        const merged = normalizeRootDb({
            ...(data && typeof data === 'object' ? data : {}),
            store: data?.store || root.store,
            jadibot: data?.jadibot || root.jadibot
        });
        global._mainDb = merged;
        return;
    }
    const existing = ensureJadibotData(number);
    if (data === existing) return;
    root.jadibot.clones[number] = normalizeBotData({
        ...(data && typeof data === 'object' ? data : {}),
        store: data?.store || existing.store
    }, true);
}

function saveJadibotMemoryDb(number, data) {
    if (data && number) {
        setJadibotMemoryDb(number, data);
    }
    saveRootDb();
}

function saveAllJadibotMemoryDbs() {
    saveRootDb();
}

function deleteJadibotData(number) {
    number = normalizeNumber(number);
    if (!number) return;
    const root = getRootDb();
    if (root.jadibot?.clones?.[number]) {
        delete root.jadibot.clones[number];
        saveRootDb();
    }
    const mediaDir = getJadibotMediaDir(number);
    try {
        if (fs.existsSync(mediaDir)) {
            fs.rmSync(mediaDir, { recursive: true, force: true });
        }
    } catch (e) {}
}

function getAudioMenuDir(Dinz) {
    const ctx = getActiveStore(Dinz);
    if (ctx.isJadibot && ctx.number) {
        const dir = path.join(getJadibotMediaDir(ctx.number), 'media');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        return dir;
    }
    if (!fs.existsSync(MAIN_MEDIA_DIR)) fs.mkdirSync(MAIN_MEDIA_DIR, { recursive: true });
    return MAIN_MEDIA_DIR;
}

function getListMediaDir(Dinz) {
    const ctx = getActiveStore(Dinz);
    if (ctx.isJadibot && ctx.number) {
        const dir = path.join(getJadibotMediaDir(ctx.number), 'media_list');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        return dir;
    }
    if (!fs.existsSync(MAIN_LIST_MEDIA_DIR)) fs.mkdirSync(MAIN_LIST_MEDIA_DIR, { recursive: true });
    return MAIN_LIST_MEDIA_DIR;
}

function getJadibotIdentity(number) {
    number = normalizeNumber(number);
    const reg = getJadibotRegistry();
    const entry = reg[number] || {};
    const cfg = entry.config || {};

    const rawBotname = cfg.botname ? String(cfg.botname).trim() : '';
    const isDefaultMainBotname = !rawBotname || ['shiki', 'shiki ai'].includes(rawBotname.toLowerCase());
    const botname = !isDefaultMainBotname ? rawBotname : `Bot ${number}`;

    const owner = normalizeNumber(cfg.owner) || normalizeNumber(entry.requester) || number;

    const rawNamaOwner = cfg.namaOwner ? String(cfg.namaOwner).trim() : '';
    const isDefaultMainOwner = !rawNamaOwner || ['shiki', 'shiki ai'].includes(rawNamaOwner.toLowerCase());
    const namaOwner = !isDefaultMainOwner ? rawNamaOwner : botname;

    const rawPackname = cfg.packname ? String(cfg.packname).trim() : '';
    const isDefaultMainPack = !rawPackname || ['shiki', 'shiki ai'].includes(rawPackname.toLowerCase());
    const packname = !isDefaultMainPack ? rawPackname : botname;

    const asciiName = cfg.asciiName ? String(cfg.asciiName).trim() : botname;
    const asciiFont = cfg.asciiFont ? String(cfg.asciiFont).trim() : (global._mainConfig?.asciiFont || 'ANSI Shadow');

    let audiomenu = true;
    if (typeof cfg.audiomenu === 'boolean') {
        audiomenu = cfg.audiomenu;
    } else {
        const cloneDb = getRootDb()?.jadibot?.clones?.[number];
        if (cloneDb && cloneDb.settings && typeof cloneDb.settings.audiomenu === 'boolean') {
            audiomenu = cloneDb.settings.audiomenu;
        }
    }

    const defaultMenuImg = global._mainConfig?.image?.menu || 'https://image2url.com/r2/default/images/1773625179709-bccac35a-f5a7-4722-88a3-d2fe955d8526.jpg';
    const defaultQrisImg = global._mainConfig?.image?.qris || '';

    const hasCustomMenuImage = Boolean(cfg.image?.menu && cfg.image.menu !== defaultMenuImg);
    const image = {
        menu: cfg.image?.menu || defaultMenuImg,
        qris: cfg.payment?.qris || cfg.image?.qris || defaultQrisImg
    };

    const payment = {
        qris: cfg.payment?.qris || cfg.image?.qris || defaultQrisImg,
        dana: (cfg.payment?.dana && cfg.payment.dana !== '6285187652117') ? cfg.payment.dana : owner,
        gopay: (cfg.payment?.gopay && cfg.payment.gopay !== '6285187652117') ? cfg.payment.gopay : owner,
        an: (cfg.payment?.an && !['shiki', 'rizki', 'shiki ai'].includes(String(cfg.payment.an).toLowerCase())) ? cfg.payment.an : namaOwner
    };

    return {
        isJadibot: true,
        number,
        botname,
        namaOwner,
        owner,
        packname,
        asciiName,
        asciiFont,
        audiomenu,
        hasCustomMenuImage,
        image,
        payment
    };
}

function getBotIdentity(Dinz) {
    const ctx = getActiveStore(Dinz);
    if (ctx.isJadibot && ctx.number) {
        return getJadibotIdentity(ctx.number);
    }
    return {
        isJadibot: false,
        number: normalizeNumber(global._mainConfig.owner),
        botname: global._mainConfig.botname || 'HuTao - MD',
        namaOwner: global._mainConfig.namaOwner || 'DinzID',
        owner: global._mainConfig.owner || '628990936282',
        packname: global._mainConfig.packname || 'HuTao - MD',
        asciiName: global._mainConfig.asciiName || global._mainConfig.botname || 'HuTao - MD',
        asciiFont: global._mainConfig.asciiFont || 'ANSI Shadow',
        audiomenu: typeof global._mainConfig.audiomenu === 'boolean' ? global._mainConfig.audiomenu : true,
        hasCustomMenuImage: false,
        image: global._mainConfig.image || {},
        payment: global._mainConfig.payment || {}
    };
}

function getMainOwner() {
    return global._mainConfig.owner || '628990936282';
}

function getMainConfig() {
    return global._mainConfig;
}

function runWithBotContext(Dinz, fn) {
    if (Dinz && Dinz.isJadibot && Dinz.jadibotNumber) {
        const number = normalizeNumber(Dinz.jadibotNumber);
        return als.run({ isJadibot: true, number, Dinz }, fn);
    }
    return als.run({ isJadibot: false, number: null, Dinz }, fn);
}

function installGlobalContextProps() {
    const defineCtxProp = (prop, getFromIdentity, setOnMain) => {
        Object.defineProperty(global, prop, {
            configurable: true,
            enumerable: true,
            get() {
                const store = als.getStore();
                if (store && store.isJadibot && store.number) {
                    return getFromIdentity(getJadibotIdentity(store.number), store.number);
                }
                return global._mainConfig[prop];
            },
            set(val) {
                const store = als.getStore();
                if (store && store.isJadibot && store.number) {
                    return;
                }
                if (setOnMain) setOnMain(val);
                else global._mainConfig[prop] = val;
            }
        });
    };

    defineCtxProp('botname', (id) => id.botname);
    defineCtxProp('namaOwner', (id) => id.namaOwner);
    defineCtxProp('packname', (id) => id.packname);
    defineCtxProp('owner', (id) => id.owner);
    defineCtxProp('asciiName', (id) => id.asciiName);
    defineCtxProp('asciiFont', (id) => id.asciiFont);
    defineCtxProp('audiomenu', (id) => id.audiomenu);
    defineCtxProp('image', (id) => id.image);
    defineCtxProp('payment', (id) => id.payment);

    Object.defineProperty(global, 'db', {
        configurable: true,
        enumerable: true,
        get() {
            const store = als.getStore();
            if (store && store.isJadibot && store.number) {
                return getJadibotMemoryDb(store.number);
            }
            return getRootDb();
        },
        set(val) {
            const store = als.getStore();
            if (store && store.isJadibot && store.number) {
                setJadibotMemoryDb(store.number, val);
                return;
            }
            setJadibotMemoryDb(null, val);
        }
    });
}

installGlobalContextProps();

module.exports = {
    als,
    DATA_DIR,
    MAIN_MEDIA_DIR,
    getDatabasePath,
    getStorageMode,
    initStorage,
    flushStorage,
    getRootDb,
    reloadRootDb,
    saveRootDb,
    saveSettingsNow,
    runWithBotContext,
    isJadibotContext,
    getJadibotNumber,
    getSection,
    setSection,
    getMainSection,
    setMainSection,
    getJadibotRegistry,
    saveJadibotRegistry,
    updateRegistryCache,
    ensureJadibotData,
    hasJadibotData,
    getJadibotMediaDir,
    getJadibotMemoryDb,
    setJadibotMemoryDb,
    saveJadibotMemoryDb,
    saveAllJadibotMemoryDbs,
    deleteJadibotData,
    deleteJadibotDbDir: deleteJadibotData,
    ensureJadibotDb: ensureJadibotData,
    getAudioMenuDir,
    getListMediaDir,
    getJadibotIdentity,
    getBotIdentity,
    getMainOwner,
    getMainConfig,
    installGlobalContextProps
};
