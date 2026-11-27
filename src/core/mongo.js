const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const COLLECTION_NAME = 'bot_state';
const DEFAULT_DOC_ID = 'unified_database';

let envLoaded = false;
function loadDotEnvOnce() {
    if (envLoaded) return;
    envLoaded = true;
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) return;
        const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) continue;
            const eqIdx = line.indexOf('=');
            if (eqIdx <= 0) continue;
            const key = line.slice(0, eqIdx).trim();
            let val = line.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            if (key && process.env[key] === undefined) {
                process.env[key] = val;
            }
        }
    } catch (_) {}
}

loadDotEnvOnce();

let client = null;
let dbInstance = null;
let connectPromise = null;
let warnedMissingDriver = false;
let warnedConnError = false;

function getMongoUri() {
    loadDotEnvOnce();
    return String(process.env.MONGO_URI || process.env.MONGODB_URI || global.mongoUri || '').trim();
}

function getMongoDbName() {
    loadDotEnvOnce();
    return String(process.env.MONGO_DB_NAME || global.mongoDbName || 'shiki_ai').trim() || 'shiki_ai';
}

function getMongoDocId() {
    loadDotEnvOnce();
    return String(process.env.MONGO_DOC_ID || global.mongoDocId || DEFAULT_DOC_ID).trim() || DEFAULT_DOC_ID;
}

function isConfigured() {
    return getMongoUri().length > 0;
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
    const db = await getDb();
    if (!db) return { connected: false, payload: null };

    try {
        const doc = await db.collection(COLLECTION_NAME).findOne({ _id: getMongoDocId() });
        if (!doc) {
            return { connected: true, payload: null };
        }
        if (typeof doc.payload === 'string') {
            return { connected: true, payload: JSON.parse(doc.payload || '{}') };
        }
        if (doc.data && typeof doc.data === 'object') {
            return { connected: true, payload: doc.data };
        }
        return { connected: true, payload: null };
    } catch (err) {
        console.warn(chalk.yellow(`[MongoDB] Gagal membaca data (${err.message}).`));
        return { connected: false, payload: null };
    }
}

async function savePayload(jsonString) {
    const db = await getDb();
    if (!db) return false;

    try {
        await db.collection(COLLECTION_NAME).updateOne(
            { _id: getMongoDocId() },
            {
                $set: {
                    payload: jsonString,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
        return true;
    } catch (err) {
        console.warn(chalk.yellow(`[MongoDB] Gagal menyimpan data (${err.message}). Data tetap aman di lokal.`));
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
    loadDotEnvOnce,
    isConfigured,
    getDb,
    loadPayload,
    savePayload,
    close
};
