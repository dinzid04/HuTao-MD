const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const COLLECTION_NAME = 'bot_state';

let client = null;
let dbInstance = null;
let connectPromise = null;
let warnedMissingDriver = false;
let warnedConnError = false;
let activeBotNumber = '';

function normalizePhoneDigits(raw) {
    if (!raw) return '';
    let num = String(raw).split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
    if (num.startsWith('08')) num = '62' + num.slice(1);
    return num.length >= 6 ? num : '';
}

function readPairedBotNumberFromSession() {
    try {
        const credsPath = path.join(process.cwd(), 'session', 'creds.json');
        if (!fs.existsSync(credsPath)) return '';
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        if (!creds || !creds.me?.id) return '';
        return normalizePhoneDigits(creds.me.id);
    } catch (_) {
        return '';
    }
}

function setActiveBotNumber(rawNum) {
    activeBotNumber = normalizePhoneDigits(rawNum);
    return activeBotNumber;
}

function getActiveBotNumber() {
    if (activeBotNumber) return activeBotNumber;
    const fromSession = readPairedBotNumberFromSession();
    if (fromSession) activeBotNumber = fromSession;
    return activeBotNumber;
}

function getMongoUri() {
    return String(global.mongoUri || process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();
}

function getMongoDbName() {
    return String(global.mongoDbName || process.env.MONGO_DB_NAME || 'shiki_ai').trim() || 'shiki_ai';
}

/**
 * Isolasi dokumen MongoDB otomatis PER NOMOR WA YANG DIPAIRING (contoh: bot_6283856943872).
 * Jika bot belum pairing (session/creds.json belum ada), kembalikan '' agar tidak menimpa DB nomor lain!
 */
function getMongoDocId() {
    const botNum = getActiveBotNumber();
    if (!botNum) return '';
    return `bot_${botNum}`;
}

function isConfigured() {
    return getMongoUri().length > 0;
}

function isReadyForSync() {
    return isConfigured() && getMongoDocId().length > 0;
}

async function getDb() {
    if (!isConfigured()) return null;
    if (dbInstance) return dbInstance;
    if (connectPromise) return connectPromise;

    connectPromise = (async () => {
        let MongoClient;
        try {
            ({ MongoClient } = require('mongodb'));
        } catch (_) {
            if (!warnedMissingDriver) {
                warnedMissingDriver = true;
                console.warn(
                    chalk.yellow(
                        "[MongoDB] Paket 'mongodb' belum terinstal. Jalankan 'npm install' agar sinkronisasi MongoDB aktif. Sementara pakai lokal."
                    )
                );
            }
            return null;
        }

        try {
            client = new MongoClient(getMongoUri(), {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000
            });
            await client.connect();
            dbInstance = client.db(getMongoDbName());
            warnedConnError = false;
            return dbInstance;
        } catch (err) {
            if (!warnedConnError) {
                warnedConnError = true;
                console.warn(
                    chalk.yellow(`[MongoDB] Gagal terhubung (${err.message}). Sementara pakai data/database.json lokal.`)
                );
            }
            try { if (client) await client.close(); } catch (_) {}
            client = null;
            dbInstance = null;
            return null;
        } finally {
            connectPromise = null;
        }
    })();

    return connectPromise;
}

async function loadPayload() {
    const docId = getMongoDocId();
    if (!docId) return { connected: false, payload: null, reason: 'unpaired' };
    const db = await getDb();
    if (!db) return { connected: false, payload: null };

    try {
        const doc = await db.collection(COLLECTION_NAME).findOne({ _id: docId });
        if (!doc) {
            return { connected: true, payload: null, docId };
        }
        if (typeof doc.payload === 'string') {
            return { connected: true, payload: JSON.parse(doc.payload || '{}'), docId };
        }
        if (doc.data && typeof doc.data === 'object') {
            return { connected: true, payload: doc.data, docId };
        }
        return { connected: true, payload: null, docId };
    } catch (err) {
        console.warn(chalk.yellow(`[MongoDB:${docId}] Gagal membaca data (${err.message}).`));
        return { connected: false, payload: null };
    }
}

async function savePayload(jsonString) {
    const docId = getMongoDocId();
    if (!docId) return false;
    const db = await getDb();
    if (!db) return false;

    try {
        await db.collection(COLLECTION_NAME).updateOne(
            { _id: docId },
            {
                $set: {
                    payload: jsonString,
                    botNumber: getActiveBotNumber(),
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
        return true;
    } catch (err) {
        console.warn(chalk.yellow(`[MongoDB:${docId}] Gagal menyimpan data (${err.message}). Data tetap aman di lokal.`));
        return false;
    }
}

async function close() {
    if (client) {
        try { await client.close(); } catch (_) {}
    }
    client = null;
    dbInstance = null;
    connectPromise = null;
}

module.exports = {
    isConfigured,
    isReadyForSync,
    setActiveBotNumber,
    getActiveBotNumber,
    getMongoDocId,
    getDb,
    loadPayload,
    savePayload,
    close
};
