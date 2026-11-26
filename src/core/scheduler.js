const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const chalk = require('chalk');
const botCtx = require('./context');
const { cleaningSession, cleaningAllJadibotSessions, cleanTempFiles } = require('./session');
const jadibotMgr = require('../handlers/jadibot');

const BACKUP_DIR = path.join(botCtx.DATA_DIR || path.join(process.cwd(), 'data'), 'backups');
const MIN_BACKUP_INTERVAL_MS = 10 * 60 * 1000;
const MAX_BACKUP_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

if (!global.sewaProcessing) {
    global.sewaProcessing = {};
}

const lastExecutedAuto = {};

function isSistemSewaEnabled(sock) {
    try {
        const cfg = botCtx.getSection('sistemsewa', sock);
        return cfg?.enabled === true;
    } catch (_) {
        return true;
    }
}

async function checkSewaGroupForSocket(sock) {
    try {
        if (!sock || !isSistemSewaEnabled(sock)) return;

        const botKey = sock.isJadibot && sock.jadibotNumber ? sock.jadibotNumber : 'main';
        const sewaList = botCtx.getSection('sewagrup', sock);
        if (!Array.isArray(sewaList) || sewaList.length === 0) return;

        const identity = botCtx.getBotIdentity(sock);
        const ownerNumber = identity.owner || global.owner;
        const now = Date.now();
        let sewaChanged = false;

        const notified = botCtx.getSection('sewa_notified', sock) || {};
        let notifiedChanged = false;

        for (let i = sewaList.length - 1; i >= 0; i--) {
            const item = sewaList[i];
            const remaining = item.expired - now;
            const groupJid = item.jid;

            if (!notified[groupJid]) {
                notified[groupJid] = {};
            }

            if (remaining <= 0) {
                const expiredKey = `${botKey}_expired_${groupJid}`;
                if (!notified[groupJid].expiredNotified && !global.sewaProcessing[expiredKey]) {
                    global.sewaProcessing[expiredKey] = true;
                    try {
                        await sock.sendMessage(groupJid, {
                            text:
                                '`⌜ Verification Group ⌟`\n> ◦ Status : *Sewa Berakhir*\n> ◦ Hubungi : *wa.me/' +
                                ownerNumber +
                                '*\n> ◦ Info : *Masa sewa bot telah habis. Bot akan keluar dari grup dalam 5 detik.*'
                        });
                    } catch (e) {
                        console.error(`[Sewa] Gagal mengirim pesan expired ke ${groupJid}:`, e.message);
                    }
                    notified[groupJid].expiredNotified = true;
                    notifiedChanged = true;

                    setTimeout(async () => {
                        try {
                            await sock.groupLeave(groupJid);
                        } catch (e) {
                            console.error(`[Sewa] Gagal keluar grup ${groupJid}:`, e.message);
                        }
                        try {
                            const latestList = botCtx.getSection('sewagrup', sock);
                            if (Array.isArray(latestList)) {
                                const idx = latestList.findIndex((entry) => entry.jid === groupJid);
                                if (idx !== -1) {
                                    latestList.splice(idx, 1);
                                    botCtx.setSection('sewagrup', latestList, sock);
                                }
                            }
                        } catch (_) {}
                        delete global.sewaProcessing[expiredKey];
                    }, 5000);
                }
            } else if (remaining <= 259200000 && remaining > 0) {
                const daysLeft = Math.ceil(remaining / 86400000);
                const warnKey = `${botKey}_warn_${groupJid}`;

                if (notified[groupJid].expiredNotified) {
                    notified[groupJid].expiredNotified = false;
                    notifiedChanged = true;
                }

                if (notified[groupJid].lastWarnedDaysLeft !== daysLeft && !global.sewaProcessing[warnKey]) {
                    global.sewaProcessing[warnKey] = true;
                    try {
                        await sock.sendMessage(groupJid, {
                            text:
                                '`⌜ Verification Group ⌟`\n> ◦ Status : *Sewa Hampir Habis*\n> ◦ Sisa Waktu : *' +
                                daysLeft +
                                ' Hari*\n> ◦ Hubungi : *wa.me/' +
                                ownerNumber +
                                '*\n> ◦ Info : *Segera perpanjang sewa agar bot tetap aktif di grup ini.*'
                        });
                        notified[groupJid].lastWarnedDaysLeft = daysLeft;
                        notifiedChanged = true;
                        item.lastWarnedDaysLeft = daysLeft;
                        item.warningSent = true;
                        sewaChanged = true;
                    } catch (e) {
                        console.error(`[Sewa] Gagal mengirim warning ke ${groupJid}:`, e.message);
                    } finally {
                        setTimeout(() => {
                            delete global.sewaProcessing[warnKey];
                        }, 60000);
                    }
                }
            }
        }

        if (sewaChanged) {
            botCtx.setSection('sewagrup', sewaList, sock);
        }
        if (notifiedChanged) {
            botCtx.setSection('sewa_notified', notified, sock);
        }
    } catch (e) {
        console.error('[Sewa] Error dalam checkSewaGroup:', e);
    }
}

async function checkSewaGroup() {
    if (global.socket) {
        await checkSewaGroupForSocket(global.socket);
    }
    try {
        const jadibotSockets = jadibotMgr.getRunningJadibotSockets();
        for (const jSock of jadibotSockets) {
            await botCtx.runWithBotContext(jSock, () => checkSewaGroupForSocket(jSock));
        }
    } catch (_) {}
}

async function checkAutoOpenCloseForSocket(sock) {
    try {
        const db =
            sock && sock.isJadibot && sock.jadibotNumber
                ? botCtx.getJadibotMemoryDb(sock.jadibotNumber)
                : global.db;
        if (!db?.groups || !sock) return;

        const botKey = sock.isJadibot && sock.jadibotNumber ? sock.jadibotNumber : 'main';
        const currentTime = moment().tz('Asia/Jakarta').format('HH:mm');
        const currentDate = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');

        for (const [groupJid, groupData] of Object.entries(db.groups)) {
            if (!groupJid.endsWith('@g.us') || !groupData) continue;

            if (groupData.autoOpen === true && groupData.autoOpenTime === currentTime) {
                const execKey = `${botKey}_${groupJid}_open_${currentDate}_${currentTime}`;
                if (!lastExecutedAuto[execKey]) {
                    lastExecutedAuto[execKey] = true;
                    try {
                        await sock.groupSettingUpdate(groupJid, 'not_announcement');
                        await sock.sendMessage(groupJid, {
                            text:
                                '`⌜ Auto Open Group ⏰ ⌟`\n> ◦ *Status :* Grup Berhasil Dibuka (Open)\n> ◦ *Waktu :* ' +
                                currentTime +
                                ' WIB\n> ◦ *Info :* Semua peserta sekarang dapat mengirim pesan kembali. Selamat beraktivitas!'
                        });
                    } catch (e) {
                        console.error(`[Auto Open] Gagal buka grup ${groupJid}:`, e.message);
                    }
                }
            }

            if (groupData.autoClose === true && groupData.autoCloseTime === currentTime) {
                const execKey = `${botKey}_${groupJid}_close_${currentDate}_${currentTime}`;
                if (!lastExecutedAuto[execKey]) {
                    lastExecutedAuto[execKey] = true;
                    try {
                        await sock.groupSettingUpdate(groupJid, 'announcement');
                        await sock.sendMessage(groupJid, {
                            text:
                                '`⌜ Auto Close Group ⏰ ⌟`\n> ◦ *Status :* Grup Berhasil Ditutup (Close)\n> ◦ *Waktu :* ' +
                                currentTime +
                                ' WIB\n> ◦ *Info :* Hanya admin yang dapat mengirim pesan. Selamat beristirahat!'
                        });
                    } catch (e) {
                        console.error(`[Auto Close] Gagal tutup grup ${groupJid}:`, e.message);
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Auto Open/Close Error]', err.message);
    }
}

async function checkAutoOpenClose(sock) {
    await checkAutoOpenCloseForSocket(sock);
    try {
        const jadibotSockets = jadibotMgr.getRunningJadibotSockets();
        for (const jSock of jadibotSockets) {
            await botCtx.runWithBotContext(jSock, () => checkAutoOpenCloseForSocket(jSock));
        }
    } catch (_) {}
}

function formatDurationLabel(ms) {
    const totalMin = Math.round(ms / 60000);
    if (totalMin % (24 * 60) === 0) return `${totalMin / (24 * 60)} hari`;
    if (totalMin % 60 === 0) return `${totalMin / 60} jam`;
    if (totalMin >= 60) {
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${h} jam ${m} menit`;
    }
    return `${totalMin} menit`;
}

function parseBackupInterval(raw) {
    const clean = String(raw || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!clean) return null;
    const match = clean.match(/^(\d+)(m|min|menit|j|jam|h|hr|hour|d|day|hari)?$/);
    if (!match) return null;
    const val = parseInt(match[1], 10);
    if (!Number.isFinite(val) || val <= 0) return null;
    const unit = match[2] || 'j';
    let ms = 0;
    if (['m', 'min', 'menit'].includes(unit)) ms = val * 60 * 1000;
    else if (['j', 'jam', 'h', 'hr', 'hour'].includes(unit)) ms = val * 60 * 60 * 1000;
    else if (['d', 'day', 'hari'].includes(unit)) ms = val * 24 * 60 * 60 * 1000;
    if (ms < MIN_BACKUP_INTERVAL_MS) {
        return { error: 'Minimal interval auto-backup adalah *10 menit* (contoh: `10m`, `30m`, `1j`, `6j`, `1d`).' };
    }
    if (ms > MAX_BACKUP_INTERVAL_MS) {
        return { error: 'Maksimal interval auto-backup adalah *30 hari*.' };
    }
    return { ms, label: formatDurationLabel(ms) };
}

function getAutoBackupConfig() {
    const rootDb = botCtx.getRootDb();
    if (!rootDb.settings || typeof rootDb.settings !== 'object') rootDb.settings = {};
    const cur = rootDb.settings.autoBackup || {};
    const intervalMs = Number(cur.intervalMs) >= MIN_BACKUP_INTERVAL_MS ? Number(cur.intervalMs) : DEFAULT_BACKUP_INTERVAL_MS;
    const keepLocal = Math.min(20, Math.max(1, parseInt(cur.keepLocal, 10) || 5));
    return {
        enabled: cur.enabled === true,
        intervalMs,
        intervalLabel: cur.intervalLabel || formatDurationLabel(intervalMs),
        sendToOwner: cur.sendToOwner !== false,
        keepLocal,
        lastBackupAt: Number(cur.lastBackupAt) || 0,
        nextBackupAt: Number(cur.nextBackupAt) || 0
    };
}

function saveAutoBackupConfig(patch = {}) {
    const rootDb = botCtx.getRootDb();
    if (!rootDb.settings || typeof rootDb.settings !== 'object') rootDb.settings = {};
    const next = {
        ...getAutoBackupConfig(),
        ...patch
    };
    rootDb.settings.autoBackup = next;
    botCtx.saveRootDb();
    return next;
}

function listLocalBackups() {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs.readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((name) => {
            const full = path.join(BACKUP_DIR, name);
            const stat = fs.statSync(full);
            return { name, full, size: stat.size, mtimeMs: stat.mtimeMs };
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

async function executeDatabaseBackup(opts = {}) {
    const cfg = getAutoBackupConfig();
    try {
        botCtx.saveRootDb();
    } catch (_) {}

    const dbPath = botCtx.getDatabasePath();
    if (!fs.existsSync(dbPath)) {
        return { ok: false, message: 'File database.json tidak ditemukan.' };
    }

    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';
    const stamp = String(moment().tz(tz).format('YYYYMMDD-HHmmss') || Date.now()).replace(/[^0-9A-Za-z_-]/g, '') || String(Date.now());
    const fileName = `db-backup-${stamp}.json`;
    const destPath = path.join(BACKUP_DIR, fileName);
    const buf = fs.readFileSync(dbPath);
    fs.writeFileSync(destPath, buf);

    const allBackups = listLocalBackups();
    if (allBackups.length > cfg.keepLocal) {
        for (const old of allBackups.slice(cfg.keepLocal)) {
            try { fs.unlinkSync(old.full); } catch (_) {}
        }
    }
    const localCount = listLocalBackups().length;

    const now = Date.now();
    const nextBackupAt = cfg.enabled ? (now + cfg.intervalMs) : 0;
    saveAutoBackupConfig({ lastBackupAt: now, nextBackupAt });

    const rootDb = botCtx.getRootDb();
    const totalUsers = Object.keys(rootDb.users || {}).length;
    const totalGroups = Object.keys(rootDb.groups || {}).length;
    const totalClones = Object.keys(rootDb.jadibot?.clones || {}).length;
    const sizeKb = (buf.length / 1024).toFixed(1);

    const shouldSendWa = opts.forceSendWa === true ? true : (opts.sendToOwner !== undefined ? opts.sendToOwner : cfg.sendToOwner);
    const sock = opts.sock || global.socket;
    let sentWa = false;

    if (shouldSendWa && sock && typeof sock.sendMessage === 'function') {
        const mainOwner = String(botCtx.getMainOwner() || global.owner || '').replace(/[^0-9]/g, '');
        const targetJid = opts.targetJid || (mainOwner ? `${mainOwner}@s.whatsapp.net` : '');
        if (targetJid) {
            const timeStr = moment(now).tz(tz).format('DD/MM/YYYY HH:mm:ss [WIB]');
            const nextStr = cfg.enabled ? moment(nextBackupAt).tz(tz).format('DD/MM/YYYY HH:mm [WIB]') : 'Nonaktif';
            const modeLabel = opts.manual ? 'Manual Backup' : `Auto-Backup (${cfg.intervalLabel})`;
            const caption =
                `\`⌜ Database Backup ⌟\`\n` +
                `> ◦ *Mode :* ${modeLabel}\n` +
                `> ◦ *File :* ${fileName}\n` +
                `> ◦ *Ukuran :* ${sizeKb} KB\n` +
                `> ◦ *Data :* ${totalUsers} User | ${totalGroups} Grup | ${totalClones} Cloner\n` +
                `> ◦ *Backup Lokal :* ${localCount}/${cfg.keepLocal} file\n` +
                `> ◦ *Waktu :* ${timeStr}\n` +
                `> ◦ *Jadwal Berikutnya :* ${nextStr}`;
            try {
                await sock.sendMessage(
                    targetJid,
                    {
                        document: buf,
                        mimetype: 'application/json',
                        fileName,
                        caption
                    },
                    opts.quoted ? { quoted: opts.quoted } : {}
                );
                sentWa = true;
            } catch (e) {
                console.error('[AutoBackup] Gagal kirim ke WA Owner:', e.message);
            }
        }
    }

    return {
        ok: true,
        fileName,
        filePath: destPath,
        sizeKb,
        totalUsers,
        totalGroups,
        totalClones,
        localCount,
        keepLocal: cfg.keepLocal,
        sentWa,
        timestamp: now,
        nextBackupAt
    };
}

function syncAutoBackupTimer() {
    if (global._autoBackupTimer) {
        clearTimeout(global._autoBackupTimer);
        global._autoBackupTimer = null;
    }

    const cfg = getAutoBackupConfig();
    if (!cfg.enabled) {
        if (cfg.nextBackupAt !== 0) {
            saveAutoBackupConfig({ nextBackupAt: 0 });
        }
        return cfg;
    }

    const now = Date.now();
    let delayMs = cfg.intervalMs;
    if (cfg.lastBackupAt > 0) {
        const elapsed = now - cfg.lastBackupAt;
        delayMs = elapsed >= cfg.intervalMs ? 15000 : Math.max(15000, cfg.intervalMs - elapsed);
    }
    const nextAt = now + delayMs;
    saveAutoBackupConfig({ nextBackupAt: nextAt });

    const timer = setTimeout(async () => {
        global._autoBackupTimer = null;
        try {
            const latest = getAutoBackupConfig();
            if (!latest.enabled) return;
            await executeDatabaseBackup({ manual: false });
        } catch (e) {
            console.error('[AutoBackup] Error:', e.message);
        } finally {
            if (getAutoBackupConfig().enabled) {
                syncAutoBackupTimer();
            }
        }
    }, Math.min(delayMs, 2147483000));

    if (typeof timer.unref === 'function') timer.unref();
    global._autoBackupTimer = timer;
    return getAutoBackupConfig();
}

function startSchedulers(database) {
    if (!global._autoSaveIntervalStarted) {
        setInterval(async () => {
            try {
                await database.write(global.db);
            } catch (e) {
                console.error(chalk.red('[Database] Auto-save gagal:'), e.message);
            }
        }, 10000);
        global._autoSaveIntervalStarted = true;
    }

    if (!global.cleanIntervalStarted) {
        cleaningSession('./session');
        cleaningAllJadibotSessions('./jadibot-session');
        cleanTempFiles();
        setInterval(() => {
            cleaningSession('./session');
            cleaningAllJadibotSessions('./jadibot-session');
            cleanTempFiles();
        }, 3600000);
        global.cleanIntervalStarted = true;
    }

    if (!global.sewaIntervalStarted) {
        setInterval(checkSewaGroup, 60000);
        global.sewaIntervalStarted = true;
    }

    if (!global.autoOpenCloseIntervalStarted) {
        setInterval(() => {
            if (global.socket) checkAutoOpenClose(global.socket);
        }, 20000);
        global.autoOpenCloseIntervalStarted = true;
    }

    if (!global.cpanelExpiredIntervalStarted) {
        setInterval(async () => {
            try {
                if (!global.socket) return;
                const { CPANEL } = require('../services/cpanel');
                await CPANEL.checkExpiredServers(global.socket);
            } catch (e) {
                console.error('[CPanel Expired Error]', e.message);
            }
        }, 300000);
        global.cpanelExpiredIntervalStarted = true;
    }

    syncAutoBackupTimer();
}

module.exports = {
    startSchedulers,
    checkSewaGroup,
    checkAutoOpenClose,
    BACKUP_DIR,
    getAutoBackupConfig,
    saveAutoBackupConfig,
    parseBackupInterval,
    formatDurationLabel,
    listLocalBackups,
    executeDatabaseBackup,
    syncAutoBackupTimer
};
