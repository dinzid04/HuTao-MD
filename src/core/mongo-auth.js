const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const mongo = require('./mongo');

const DEFAULT_COLLECTION = 'bot_auth_session';

async function useMongoAuthState(prefix = 'main', localSessionDir = 'session') {
    const db = await mongo.getDb();
    if (!db) return null;

    const col = db.collection(DEFAULT_COLLECTION);
    const makeId = (key) => `${prefix}:${key}`;

    const readData = async (key) => {
        try {
            const doc = await col.findOne({ _id: makeId(key) });
            if (!doc || typeof doc.data !== 'string') return null;
            return JSON.parse(doc.data, BufferJSON.reviver);
        } catch (e) {
            return null;
        }
    };

    const writeData = async (key, value) => {
        try {
            const serialized = JSON.stringify(value, BufferJSON.replacer);
            await col.updateOne(
                { _id: makeId(key) },
                { $set: { data: serialized, updatedAt: new Date() } },
                { upsert: true }
            );
        } catch (e) {
            console.error(chalk.yellow(`[MongoAuth] Gagal menulis key ${key}:`), e.message);
        }
    };

    const removeData = async (key) => {
        try {
            await col.deleteOne({ _id: makeId(key) });
        } catch (_) {}
    };

    const clearSession = async () => {
        try {
            const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            await col.deleteMany({ _id: { $regex: `^${escaped}:` } });
        } catch (_) {}
    };

    let creds = await readData('creds');
    if (!creds && localSessionDir && fs.existsSync(path.join(localSessionDir, 'creds.json'))) {
        try {
            const files = fs.readdirSync(localSessionDir).filter((f) => f.endsWith('.json'));
            let migrated = 0;
            for (const f of files) {
                const raw = fs.readFileSync(path.join(localSessionDir, f), 'utf8');
                const parsed = JSON.parse(raw, BufferJSON.reviver);
                const keyName = f.replace(/\.json$/, '');
                await writeData(keyName, parsed);
                migrated++;
            }
            creds = await readData('creds');
            if (migrated > 0) {
                console.log(chalk.cyan(`[MongoAuth] Migrasi otomatis ${migrated} file session lokal ke MongoDB.`));
            }
        } catch (e) {
            console.warn(chalk.yellow('[MongoAuth] Gagal migrasi session lokal:'), e.message);
        }
    }

    if (!creds) {
        creds = initAuthCreds();
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            tasks.push(value ? writeData(key, value) : removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => writeData('creds', creds),
        clearSession,
        mode: 'mongodb'
    };
}

module.exports = { useMongoAuthState };
