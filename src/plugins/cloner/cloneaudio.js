const {
    formatCard,
    requireClonerOwner,
    getCloneMediaDir,
    clearCloneCaches,
    patchCloneConfig
} = require('./_helper');

module.exports = {
    name: 'cloneaudio',
    category: 'cloner',
    commands: ['cloneaudio', 'cloneaudiomenu', 'clonesetaudio'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, args, Reply, fs, path, botCtx, jadibotMgr, toPTT, usedPrefix } = ctx;

        const qMsg = m.quoted ? m.quoted : m;
        const mimeType = (qMsg.msg || qMsg).mimetype || '';
        const isAudio = /audio|video/.test(mimeType);
        const mediaDir = getCloneMediaDir(cloneNum, botCtx);

        if (isAudio) {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            Reply(global.mess.wait);
            try {
                const buffer = await qMsg.download();
                let oggBuffer = buffer;
                const savedAs = 'menu.ogg';
                try {
                    const srcExt = (mimeType.split('/')[1] || 'mp3').split(';')[0].replace('x-m4a', 'm4a').replace('mp4', 'm4a');
                    oggBuffer = await toPTT(buffer, srcExt);
                } catch (convErr) {
                    console.log('cloneaudio convert fallback:', convErr.message);
                    oggBuffer = buffer;
                }

                for (const old of ['menu.mp3', 'menu.m4a', 'menu.ogg']) {
                    const p = path.join(mediaDir, old);
                    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
                }
                fs.writeFileSync(path.join(mediaDir, savedAs), oggBuffer);

                if (!global.db.settings) global.db.settings = {};
                global.db.settings.audiomenu = true;
                patchCloneConfig(cloneNum, { audiomenu: true }, botCtx, jadibotMgr);
                botCtx.saveJadibotMemoryDb(cloneNum, global.db);
                clearCloneCaches(mediaDir);

                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(formatCard({
                    icon: '🎵',
                    title: 'AUDIO MENU CLONE DIUBAH',
                    rows: [
                        { label: 'Status', value: '🟢 Aktif (ON)' },
                        { label: 'File', value: `data/jadibot-media/${cloneNum}/media/${savedAs}` },
                        { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
                    ]
                }));
            } catch (err) {
                return Reply(`❌ Gagal memproses audio clone: ${err.message}`);
            }
        }

        const value = (args[0] || '').toLowerCase();
        if (['on', 'aktif', 'enable', '1'].includes(value)) {
            if (!global.db.settings) global.db.settings = {};
            global.db.settings.audiomenu = true;
            patchCloneConfig(cloneNum, { audiomenu: true }, botCtx, jadibotMgr);
            botCtx.saveJadibotMemoryDb(cloneNum, global.db);
            return Reply(formatCard({
                icon: '🎵',
                title: 'AUDIO MENU CLONE',
                rows: [
                    { label: 'Status', value: '🟢 Aktif (ON)' },
                    { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
                ]
            }));
        }

        if (['off', 'mati', 'disable', '0'].includes(value)) {
            if (!global.db.settings) global.db.settings = {};
            global.db.settings.audiomenu = false;
            patchCloneConfig(cloneNum, { audiomenu: false }, botCtx, jadibotMgr);
            botCtx.saveJadibotMemoryDb(cloneNum, global.db);
            return Reply(formatCard({
                icon: '🔇',
                title: 'AUDIO MENU CLONE',
                rows: [
                    { label: 'Status', value: '🔴 Nonaktif (OFF)' },
                    { label: 'Scope', value: `Khusus Clone ${cloneNum} (Bot Utama Aman)` }
                ]
            }));
        }

        const id = botCtx.getJadibotIdentity(cloneNum);
        const hasCustom = ['menu.ogg', 'menu.mp3', 'menu.m4a'].some((f) => fs.existsSync(path.join(mediaDir, f)));
        return Reply(formatCard({
            icon: '🎵',
            title: 'PENGATURAN AUDIO MENU CLONE',
            rows: [
                { label: 'Status Saat Ini', value: id.audiomenu !== false ? '🟢 Aktif (ON)' : '🔴 Nonaktif (OFF)' },
                { label: 'Audio Custom', value: hasCustom ? 'Ada (Lokal Clone)' : 'Belum ada (pakai default)' }
            ],
            body:
                `📌 *Cara Penggunaan:*\n` +
                `> 1. \`${usedPrefix}cloneaudio on\` (Aktifkan audio menu clone)\n` +
                `> 2. \`${usedPrefix}cloneaudio off\` (Matikan audio menu clone)\n` +
                `> 3. Kirim / reply VN / Audio / Video dengan caption \`${usedPrefix}cloneaudio\``
        }));
    }
};
