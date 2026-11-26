const {
    formatCard,
    requireMainSetupAccess,
    updateSettingsScalar,
    clearMediaCaches
} = require('./_helper');

module.exports = {
    name: 'setaudiomenu',
    category: 'setup',
    commands: ['setaudiomenu', 'setaudio', 'audiomenu'],

    async execute(ctx) {
        if (!requireMainSetupAccess(ctx)) return true;
        const { Dinz, m, args, Reply, fs, path, database, toPTT, usedPrefix } = ctx;

        const qMsg = m.quoted ? m.quoted : m;
        const mimeType = (qMsg.msg || qMsg).mimetype || '';
        const isAudio = /audio|video/.test(mimeType);

        if (isAudio) {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            Reply(global.mess.wait);
            try {
                const buffer = await qMsg.download();
                const mediaDir = path.join(process.cwd(), 'assets', 'media');
                if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

                let oggBuffer = buffer;
                const savedAs = 'menu.ogg';
                try {
                    const srcExt = (mimeType.split('/')[1] || 'mp3').split(';')[0].replace('x-m4a', 'm4a').replace('mp4', 'm4a');
                    oggBuffer = await toPTT(buffer, srcExt);
                } catch (convErr) {
                    console.log('setaudiomenu convert fallback:', convErr.message);
                    oggBuffer = buffer;
                }

                for (const old of ['menu.mp3', 'menu.m4a', 'menu.ogg']) {
                    const p = path.join(mediaDir, old);
                    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
                }
                fs.writeFileSync(path.join(mediaDir, savedAs), oggBuffer);

                if (!global.db.settings) global.db.settings = {};
                global.db.settings.audiomenu = true;
                updateSettingsScalar('audiomenu', true, { isBoolean: true });
                clearMediaCaches();
                try { await database.write(global.db); } catch (_) {}

                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(formatCard({
                    icon: '🎵',
                    title: 'AUDIO MENU BOT UTAMA DIUBAH',
                    rows: [
                        { label: 'Status', value: '🟢 Aktif (ON)' },
                        { label: 'File', value: `assets/media/${savedAs}` },
                        { label: 'Penyimpanan', value: 'Permanen (Bot Utama)' }
                    ]
                }));
            } catch (err) {
                return Reply(`❌ Gagal memproses audio: ${err.message}`);
            }
        }

        const value = (args[0] || '').toLowerCase();
        if (['on', 'aktif', 'enable', '1'].includes(value)) {
            if (!global.db.settings) global.db.settings = {};
            global.db.settings.audiomenu = true;
            updateSettingsScalar('audiomenu', true, { isBoolean: true });
            try { await database.write(global.db); } catch (_) {}
            return Reply(formatCard({
                icon: '🎵',
                title: 'AUDIO MENU BOT UTAMA',
                rows: [
                    { label: 'Status', value: '🟢 Aktif (ON)' },
                    { label: 'Info', value: 'Audio menu akan dikirim setiap kali menu utama dibuka' }
                ]
            }));
        }

        if (['off', 'mati', 'disable', '0'].includes(value)) {
            if (!global.db.settings) global.db.settings = {};
            global.db.settings.audiomenu = false;
            updateSettingsScalar('audiomenu', false, { isBoolean: true });
            try { await database.write(global.db); } catch (_) {}
            return Reply(formatCard({
                icon: '🔇',
                title: 'AUDIO MENU BOT UTAMA',
                rows: [
                    { label: 'Status', value: '🔴 Nonaktif (OFF)' },
                    { label: 'Info', value: 'Audio menu dimatikan' }
                ]
            }));
        }

        const curFlag = (typeof global.db?.settings?.audiomenu === 'boolean')
            ? global.db.settings.audiomenu
            : (global._mainConfig?.audiomenu !== false);
        return Reply(formatCard({
            icon: '🎵',
            title: 'PENGATURAN AUDIO MENU BOT UTAMA',
            rows: [
                { label: 'Status Saat Ini', value: curFlag ? '🟢 Aktif (ON)' : '🔴 Nonaktif (OFF)' }
            ],
            body:
                `📌 *Cara Penggunaan:*\n` +
                `> 1. \`${usedPrefix}setaudiomenu on\` (Aktifkan audio menu)\n` +
                `> 2. \`${usedPrefix}setaudiomenu off\` (Matikan audio menu)\n` +
                `> 3. Kirim / reply VN / Audio / Video dengan caption \`${usedPrefix}setaudiomenu\``
        }));
    }
};
