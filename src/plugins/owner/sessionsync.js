const moment = require('moment-timezone');
const sessionSync = require('../../services/session-sync');
const { formatCard, toMono, toBoldSans } = require('../../utils/formatter');

module.exports = {
    name: 'sessionsync',
    category: 'owner',
    commands: ['backupsesi', 'backupauth', 'savesesi', 'restoresesi', 'restoreauth', 'syncsesi', 'ceksesi'],

    async execute(ctx) {
        const { Dinz, m, command, quoted, qmsg, isCreator, isMainOwner, Reply, botCtx, prefixMgr, usedPrefix } = ctx;

        if (Dinz.isJadibot || !isMainOwner) {
            return Reply('🔒 Fitur ini khusus Owner Utama bot.');
        }
        if (!isCreator) return Reply(global.mess.owner);

        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : usedPrefix;
        const cmd = String(command || '').toLowerCase();
        const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';

        if (cmd === 'syncsesi' || cmd === 'ceksesi') {
            const localOk = sessionSync.hasValidLocalSession('./session');
            const botNum = String(Dinz.user?.id || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '') || '-';
            return Reply(formatCard({
                icon: '🔐',
                title: 'STATUS SESSION WHATSAPP (LOKAL)',
                rows: [
                    { label: 'Session Lokal', value: localOk ? '🟢 Valid (./session)' : '🔴 Tidak ada' },
                    { label: 'Nomor Aktif', value: `+${botNum}` },
                    { label: 'Simpan ke MongoDB', value: '🔒 OFF (Session Lokal Masing-Masing)' }
                ],
                body:
                    `*${toBoldSans('Cara Pindah Panel Tanpa Pairing Ulang:')}*\n` +
                    `◦ Session WA sengaja *TIDAK* disimpan ke MongoDB agar setiap pengguna script bisa pairing nomornya sendiri tanpa bentrok.\n` +
                    `◦ Jalankan ${toMono(`${pfx}backupsesi`)} (file ZIP dikirim pribadi ke DM Owner), lalu ekstrak ke folder \`session/\` di panel baru atau reply ZIP tersebut dengan ${toMono(`${pfx}restoresesi`)}.`
            }));
        }

        if (cmd === 'backupsesi' || cmd === 'backupauth' || cmd === 'savesesi') {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            try {
                const { buffer, fileCount } = sessionSync.createSessionZipBuffer('./session');
                const botNum = String(Dinz.user?.id || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '') || 'bot';
                const stamp = moment().tz(tz).format('YYYYMMDD-HHmm');
                const fileName = `SessionBackup_${botNum}_${stamp}.zip`;
                const sizeKb = (buffer.length / 1024).toFixed(1);

                const mainOwner = String(botCtx.getMainOwner() || global.owner || '').replace(/[^0-9]/g, '');
                const ownerDmJid = mainOwner ? `${mainOwner}@s.whatsapp.net` : m.sender;

                const caption =
                    `\`🔐 BACKUP SESSION WHATSAPP (LOKAL)\`\n` +
                    `> ◦ *Nomor Bot :* +${botNum}\n` +
                    `> ◦ *Total File :* ${fileCount} file\n` +
                    `> ◦ *Ukuran :* ${sizeKb} KB\n` +
                    `> ◦ *Mode :* 100% Lokal (Tidak di-upload ke MongoDB)\n` +
                    `> ◦ *Waktu :* ${moment().tz(tz).format('DD/MM/YYYY HH:mm:ss [WIB]')}\n\n` +
                    `⚠️ *RAHASIA!* Jangan bagikan file ini ke siapa pun.\n` +
                    `💡 *Pindah Panel:* Selama perangkat belum di-logout di WA, ekstrak ZIP ini ke folder bot (membentuk folder \`session/\`) atau reply ZIP ini dengan \`${pfx}restoresesi\`.`;

                await Dinz.sendMessage(ownerDmJid, {
                    document: buffer,
                    mimetype: 'application/zip',
                    fileName,
                    caption
                });

                if (m.isGroup) {
                    await Reply(`🔐 File backup session (*${sizeKb} KB*, ${fileCount} file) dikirim *secara pribadi ke DM Owner* demi keamanan!`);
                }
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            } catch (err) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Gagal backup session: ${err?.message || err}`);
            }
            return true;
        }

        if (cmd === 'restoresesi' || cmd === 'restoreauth') {
            const isDoc = m.quoted?.type === 'documentMessage' || m.type === 'documentMessage';
            if (!isDoc) {
                return Reply(`\`🔐 Restore Session\`\n> ◦ *Format:* reply file \`SessionBackup_*.zip\` dengan \`${pfx}restoresesi\``);
            }
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            try {
                let zipBuf = null;
                if (typeof qmsg?.download === 'function') zipBuf = await qmsg.download();
                else if (typeof quoted?.download === 'function') zipBuf = await quoted.download();
                else zipBuf = await Dinz.downloadMediaMessage(quoted || m);

                if (!zipBuf || !zipBuf.length) throw new Error('Gagal mengunduh file ZIP session.');
                const info = sessionSync.restoreSessionFromZipBuffer(zipBuf, './session');

                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                await Reply(
                    `✅ *Session berhasil dipulihkan secara lokal!*\n` +
                    `> ◦ Nomor : *+${info.botNumber || '?'}*\n` +
                    `> ◦ File : *${info.fileCount} file*\n` +
                    `> ◦ Status : *Merestart bot dalam 3 detik untuk menghubungkan session...*`
                );
                setTimeout(() => process.exit(0), 3000);
            } catch (err) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Gagal restore session: ${err?.message || err}`);
            }
            return true;
        }
        return true;
    }
};
