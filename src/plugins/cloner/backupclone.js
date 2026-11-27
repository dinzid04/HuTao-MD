const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const sessionSync = require('../../services/session-sync');
const { formatCard, toMono, toBoldSans } = require('../../utils/formatter');

const EXCLUDED_DIRS = new Set([
    'node_modules',
    '.git',
    '.npm',
    '.cache',
    '.config',
    '.local',
    'session',
    'jadibot-session',
    'bin',
    'tmp'
]);

const EXCLUDED_REL_PREFIXES = [
    'data/jadibot-media/',
    'data/media-list/',
    'data/backups/'
];

const EXCLUDED_REL_FILES = new Set([
    'settings.js',
    'data/database.json',
    'data/cookies.txt',
    'data/viewonce-cache.json',
    'data/audio-stickers.json',
    'package-lock.json'
]);

function escapeJsStr(val) {
    return JSON.stringify(String(val ?? ''));
}

/**
 * Buat file settings.js mandiri yang 100% memakai identitas hasil rename clone jadibot,
 * bersih dari kredensial privat bot utama (mongoUri, pterodactyl, apikey privat).
 */
function buildStandaloneCloneSettings(identity) {
    const owner = String(identity.owner || '').replace(/[^0-9]/g, '') || '628xxxxxxxxxx';
    const namaOwner = identity.namaOwner || identity.botname || 'Owner';
    const botname = identity.botname || 'MyBot - MD';
    const packname = identity.packname || botname;
    const asciiName = identity.asciiName || botname;
    const asciiFont = identity.asciiFont || 'ANSI Shadow';
    const audiomenu = identity.audiomenu !== false;
    const imgMenu = identity.image?.menu || 'https://image2url.com/r2/default/images/1773625179709-bccac35a-f5a7-4722-88a3-d2fe955d8526.jpg';
    const imgQris = identity.image?.qris || identity.payment?.qris || 'https://db.lamora.my.id/uploads/logo_file-1790541121093.jpg';
    const payQris = identity.payment?.qris || imgQris;
    const payDana = identity.payment?.dana || owner;
    const payGopay = identity.payment?.gopay || owner;
    const payAn = identity.payment?.an || namaOwner;

    return `/*
 * Konfigurasi Utama Bot (Standalone Clone Export)
 * Dihasilkan otomatis dari konfigurasi hasil rename Jadibot.
 */

process.env.FORCE_COLOR = '3';
const fs = require('fs');
const chalk = require('chalk');
chalk.level = 3;

const { version } = require('./package.json');
const botCtx = require('./src/core/context');
botCtx.installGlobalContextProps();

// ===================================================
// 1. IDENTITAS BOT & OWNER
// ===================================================
global.owner = ${escapeJsStr(owner)};
global.versi = version;
global.namaOwner = ${escapeJsStr(namaOwner)};
global.packname = ${escapeJsStr(packname)};
global.botname = ${escapeJsStr(botname)};
global.asciiName = ${escapeJsStr(asciiName)};
global.asciiFont = ${escapeJsStr(asciiFont)};

// ===================================================
// 2. KONEKSI & DATABASE (LOKAL + MONGODB OPSIONAL)
// ===================================================
global.pairing_code = true;
global.custompairing = '12345678';
global.tempatDB = 'database.json';

// Isi URI MongoDB Atlas pribadi kamu (atau lewat env MONGO_URI) jika ingin cloud sync
global.mongoUri = process.env.MONGO_URI || '';
global.mongoDbName = process.env.MONGO_DB_NAME || 'bot_clone';
global.mongoSession = false;

// ===================================================
// 3. INTEGRASI API
// ===================================================
global.apiDinz = 'https://docs.lamora.my.id';
global.ApikeyDinz = 'alipaiapikeybaru';

global.amApiBase = 'https://am.gadingkencana04.workers.dev';
global.amApiKey = '';

// ===================================================
// 4. MEDIA & PEMBAYARAN
// ===================================================
global.audiomenu = ${audiomenu ? 'true' : 'false'};

global.image = {
\tmenu: ${escapeJsStr(imgMenu)},
\tqris: ${escapeJsStr(imgQris)}
};

global.payment = {
\tqris: ${escapeJsStr(payQris)},
\tdana: ${escapeJsStr(payDana)},
\tgopay: ${escapeJsStr(payGopay)},
\tan: ${escapeJsStr(payAn)}
};

// ===================================================
// 5. SERVER PANEL PTERODACTYL (CPANEL)
// ===================================================
global.pterodactyl = {
\tserver1: { domain: '', apikey: '', capikey: '', egg: '15', nestid: '5', location: '1' },
\tserver2: { domain: '', apikey: '', capikey: '', egg: '15', nestid: '5', location: '1' },
\tserver3: { domain: '', apikey: '', capikey: '', egg: '15', nestid: '5', location: '1' }
};

global.cpanelEmail = {
\tdefaultEmail: '',
\tapiUrl: \`\${global.apiDinz}/tools/send-mail\`,
\tapiKey: global.ApikeyDinz
};

// ===================================================
// 6. PESAN RESPON BAWAAN
// ===================================================
global.mess = {
\towner: \`\\\`𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗\\\`\\n> sᴛᴀᴛᴜs : ɢᴀɢᴀʟ\\n> ɪɴғᴏ : ғɪᴛᴜʀ ᴋʜᴜsᴜs 𝗼𝘄𝗻𝗲𝗿 𝗯𝗼𝘁\`,
\tadmin: \`\\\`𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗\\\`\\n> sᴛᴀᴛᴜs : ɢᴀɢᴀʟ\\n> ɪɴғᴏ : ғɪᴛᴜʀ ᴋʜᴜsᴜs 𝗮𝗱𝗺𝗶𝗻 𝗴𝗿𝘂𝗽\`,
\tbotAdmin: \`\\\`𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗\\\`\\n> sᴛᴀᴛᴜs : ɢᴀɢᴀʟ\\n> ɪɴғᴏ : ʙᴏᴛ ʜᴀʀᴜs ᴍᴇɴᴊᴀᴅɪ 𝗮𝗱𝗺𝗶𝗻 𝗴𝗿𝘂𝗽\`,
\tgroup: \`\\\`𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗\\\`\\n> sᴛᴀᴛᴜs : ɢᴀɢᴀʟ\\n> ɪɴғᴏ : ғɪᴛᴜʀ ᴋʜᴜsᴜs ᴅɪ ᴅᴀʟᴀᴍ 𝗴𝗿𝘂𝗽\`,
\twait: \`\\\`𝗣𝗥𝗢𝗖𝗘𝗦𝗦𝗜𝗡𝗚\\\`\\n> sᴛᴀᴛᴜs : ᴍᴏʜᴏɴ ᴛᴜɴɢɢᴜ...\\n> ɪɴғᴏ : ᴘᴇʀᴍɪɴᴛᴀᴀɴ sᴇᴅᴀɴɢ ᴅɪᴘʀᴏsᴇs\`,
\terror: \`\\\`𝗘𝗥𝗥𝗢𝗥\\\`\\n> sᴛᴀᴛᴜs : ɢᴀɢᴀʟ\\n> ɪɴғᴏ : ᴛᴇʀᴊᴀᴅɪ ᴋᴇsᴀʟᴀʜᴀɴ sɪsᴛᴇᴍ\`,
\tdone: \`\\\`𝗦𝗨𝗖𝗖𝗘𝗦𝗦\\\`\\n> sᴛᴀᴛᴜs : ʙᴇʀʜᴀsɪʟ\\n> ɪɴғᴏ : ᴘʀᴏsᴇs sᴇʟᴇsᴀɪ ᴅᴇɴɢᴀɴ sᴜᴋsᴇs\`,
\tprem: \`\\\`𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗\\\`\\n> sᴛᴀᴛᴜs : ɢᴀɢᴀʟ\\n> ɪɴғᴏ : ғɪᴛᴜʀ ɪɴɪ ᴋʜᴜsᴜs 𝗽𝗿𝗲𝗺𝗶𝘂𝗺 (𝘃𝗶𝗽)\`,
\tlimit: \`\\\`𝗟𝗜𝗠𝗜𝗧 𝗛𝗔𝗕𝗜𝗦\\\`\\n> sᴛᴀᴛᴜs : ʟɪᴍɪᴛ ʜᴀʀɪᴀɴ ʜᴀʙɪs\\n> ɪɴғᴏ : ʙᴀᴛᴀs ᴘᴇɴɢɢᴜɴᴀᴀɴ ʜᴀʀɪ ɪɴɪ ᴛᴇʀᴄᴀᴘᴀɪ. ʀᴇsᴇᴛ ᴊᴀᴍ 𝟶𝟶:𝟶𝟶 ᴡɪʙ.\\n> ᴛɪᴘs : ᴋᴇᴛɪᴋ \\\`claim\\\` ᴜɴᴛᴜᴋ ᴋʟᴀɪᴍ +𝟻 ʙᴏɴᴜs ʟɪᴍɪᴛ ɢʀᴀᴛɪs.\`
};

let file = require.resolve(__filename);
fs.unwatchFile(file);
fs.watchFile(file, () => {
\tfs.unwatchFile(file);
\tconsole.log(chalk.redBright(\`Update \${__filename}\`));
\tdelete require.cache[file];
\trequire(file);
});
`;
}

function walkProjectFiles(rootDir, relDir = '', out = []) {
    const absDir = relDir ? path.join(rootDir, relDir) : rootDir;
    let items = [];
    try {
        items = fs.readdirSync(absDir, { withFileTypes: true });
    } catch (_) {
        return out;
    }

    for (const item of items) {
        if (item.name.startsWith('.') && item.name !== '.gitignore') continue;
        const rel = relDir ? `${relDir}/${item.name}` : item.name;
        if (item.isDirectory()) {
            if (EXCLUDED_DIRS.has(item.name)) continue;
            if (EXCLUDED_REL_PREFIXES.some((p) => (rel + '/').startsWith(p))) continue;
            walkProjectFiles(rootDir, rel, out);
        } else if (item.isFile()) {
            if (EXCLUDED_REL_FILES.has(rel)) continue;
            if (/\.(zip|tar\.gz|tgz|bak|log|tmp|db|db-shm|db-wal)$/i.test(item.name)) continue;
            if (rel.startsWith('data/caller-session')) continue;
            out.push({ rel, abs: path.join(rootDir, rel) });
        }
    }
    return out;
}

function buildStandaloneCloneZip(cloneNumber, botCtx) {
    const rootDir = process.cwd();
    const identity = botCtx.getJadibotIdentity(cloneNumber);
    const cloneMemDb = botCtx.getJadibotMemoryDb(cloneNumber);

    // Clone's custom local media (menu.jpg / menu.ogg / menu.mp3) menimpa assets/media bawaan bot utama!
    const cloneMediaDir = path.join(botCtx.getJadibotMediaDir(cloneNumber), 'media');
    const customMediaOverrides = new Map();
    if (fs.existsSync(cloneMediaDir)) {
        try {
            for (const f of fs.readdirSync(cloneMediaDir)) {
                const fp = path.join(cloneMediaDir, f);
                if (fs.statSync(fp).isFile()) {
                    customMediaOverrides.set(`assets/media/${f}`, fp);
                }
            }
        } catch (_) {}
    }

    const hasCustomMenuImg = ['menu.jpg', 'menu.png', 'menu.jpeg'].some((n) => customMediaOverrides.has(`assets/media/${n}`));
    const hasCustomAudio = ['menu.ogg', 'menu.mp3', 'menu.m4a'].some((n) => customMediaOverrides.has(`assets/media/${n}`));

    const files = walkProjectFiles(rootDir);
    const zipEntries = [];

    for (const f of files) {
        // Jika clone punya custom menu image/audio sendiri, skip bawaan bot utama agar tidak bentrok
        if (hasCustomMenuImg && /^assets\/media\/menu\.(jpg|jpeg|png)$/i.test(f.rel)) continue;
        if (hasCustomAudio && /^assets\/media\/menu\.(ogg|mp3|m4a)$/i.test(f.rel)) continue;
        try {
            zipEntries.push({
                name: f.rel,
                data: fs.readFileSync(f.abs)
            });
        } catch (_) {}
    }

    // Masukkan custom media milik clone ke assets/media/
    for (const [relTarget, absSrc] of customMediaOverrides.entries()) {
        try {
            zipEntries.push({
                name: relTarget,
                data: fs.readFileSync(absSrc)
            });
        } catch (_) {}
    }

    // Generate settings.js hasil rename clone (tanpa rahasia bot utama!)
    const cloneSettingsSrc = buildStandaloneCloneSettings(identity);
    zipEntries.push({
        name: 'settings.js',
        data: Buffer.from(cloneSettingsSrc, 'utf8')
    });

    // Generate data/database.json terisolasi khusus clone ini saja (standalone!)
    const standaloneDb = {
        users: cloneMemDb?.users || {},
        groups: cloneMemDb?.groups || {},
        database: cloneMemDb?.database || {},
        settings: { ...(cloneMemDb?.settings || {}) },
        cpanel: { servers: {}, v1: { reseller: [] }, v2: { reseller: [] }, v3: { reseller: [] } },
        store: { ...(cloneMemDb?.store || {}) },
        jadibot: { registry: {}, clones: {} }
    };
    zipEntries.push({
        name: 'data/database.json',
        data: Buffer.from(JSON.stringify(standaloneDb), 'utf8')
    });

    const buffer = sessionSync.buildZipBuffer(zipEntries);
    return {
        buffer,
        fileCount: zipEntries.length,
        identity,
        customMediaCount: customMediaOverrides.size
    };
}

module.exports = {
    name: 'backupclone',
    category: 'cloner',
    commands: ['backupclone', 'backupscclone', 'getscclone', 'clonesc', 'exportclone', 'backupsc'],

    async execute(ctx) {
        const { Dinz, m, args, isCreator, isMainOwner, Reply, botCtx, jadibotMgr, prefixMgr, usedPrefix } = ctx;
        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : usedPrefix;

        let targetCloneNum = '';

        if (Dinz.isJadibot && Dinz.jadibotNumber) {
            // Dijalankan langsung dari dalam bot clone -> hanya Owner clone itu sendiri!
            if (!isCreator) return Reply(global.mess.owner);
            const allowCloneBackup = botCtx.getRootDb()?.settings?.allowCloneBackup !== false;
            if (!allowCloneBackup && !isMainOwner) {
                return Reply('🔒 Backup SC mandiri untuk cloner sedang dinonaktifkan oleh Owner Utama.');
            }
            targetCloneNum = String(Dinz.jadibotNumber).replace(/[^0-9]/g, '');
        } else {
            // Dijalankan dari Bot Utama -> hanya Main Owner, wajib pilih nomor jadibot (atau auto pilih jika cuma 1)
            if (!isMainOwner && !isCreator) return Reply(global.mess.owner);
            const reg = botCtx.getJadibotRegistry() || {};
            const allNums = Object.keys(reg);
            const argNum = String(args[0] || '').replace(/[^0-9]/g, '');
            if (argNum && reg[argNum]) {
                targetCloneNum = argNum;
            } else if (!argNum && allNums.length === 1) {
                targetCloneNum = allNums[0];
            } else {
                const list = allNums.length
                    ? allNums.map((n) => `◦ ${toMono(`${pfx}backupclone ${n}`)} (*${reg[n]?.config?.botname || `Bot ${n}`}*)`).join('\n')
                    : '_(belum ada jadibot terdaftar)_';
                return Reply(formatCard({
                    icon: '📦',
                    title: 'BACKUP SC CLONE JADIBOT',
                    body:
                        `Ekspor full SC standalone dengan identitas hasil rename milik Jadibot (fungsi 100% utuh, tanpa data/rahasia Bot Utama).\n\n` +
                        `*${toBoldSans('Daftar Clone Tersedia:')}*\n${list}`,
                    footer: `Atau ketik ${pfx}backupclone langsung dari dalam bot Jadibot-nya`
                }));
            }
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        await Reply(`⏳ Sedang mempaketkan *Full SC Standalone* versi clone (*${targetCloneNum}*) beserta hasil rename & database terisolasinya...`);

        try {
            const { buffer, fileCount, identity, customMediaCount } = buildStandaloneCloneZip(targetCloneNum, botCtx);
            const safeName = String(identity.botname || `Clone_${targetCloneNum}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
            const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';
            const stamp = moment().tz(tz).format('YYYYMMDD-HHmm');
            const fileName = `SC_Clone_${safeName}_${stamp}.zip`;
            const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);

            const caption =
                `\`📦 BACKUP SC STANDALONE (VERSI CLONE)\`\n` +
                `> ◦ *Nama Bot :* ${identity.botname}\n` +
                `> ◦ *Owner :* ${identity.namaOwner} (${identity.owner})\n` +
                `> ◦ *Packname :* ${identity.packname}\n` +
                `> ◦ *Total File :* ${fileCount} file (${customMediaCount} media custom)\n` +
                `> ◦ *Ukuran :* ${sizeMb} MB\n` +
                `> ◦ *Fitur :* 100% Full (tidak ada yang dikurangi)\n` +
                `> ◦ *Keamanan :* Database & settings terisolasi khusus clone ini (tanpa session/kredensial Bot Utama)\n\n` +
                `💡 *Cara Pakai:* Ekstrak ZIP ini di panel baru / Termux / Railway → jalankan \`npm install && npm start\` → langsung jalan dengan identitas *${identity.botname}*!`;

            await Dinz.sendMessage(m.chat, {
                document: buffer,
                mimetype: 'application/zip',
                fileName,
                caption
            }, { quoted: m });

            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('[BackupClone Error]', err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal membuat backup SC clone: ${err?.message || err}`);
        }
        return true;
    }
};
