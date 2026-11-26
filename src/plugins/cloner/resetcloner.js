const {
    formatCard,
    requireClonerOwner,
    getCloneMediaDir,
    clearCloneCaches
} = require('./_helper');

module.exports = {
    name: 'resetcloner',
    category: 'cloner',
    commands: ['resetcloner', 'resetclone'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Dinz, m, args, Reply, fs, path, botCtx, jadibotMgr, usedPrefix } = ctx;

        const confirm = (args[0] || '').toLowerCase();
        if (confirm !== 'confirm' && confirm !== 'ya' && confirm !== 'yes') {
            return Reply(formatCard({
                icon: '⚠️',
                title: 'KONFIRMASI RESET BOT CLONE',
                body:
                    `Ini akan mengembalikan seluruh identitas, thumbnail, payment, dan audio custom khusus untuk clone *${cloneNum}* ke default.\n` +
                    `Data bot utama & clone lain TIDAK akan terpengaruh.\n\n` +
                    `Ketik \`${usedPrefix}resetcloner confirm\` untuk melanjutkan.`
            }));
        }

        const mediaDir = getCloneMediaDir(cloneNum, botCtx);
        const prevId = botCtx.getJadibotIdentity(cloneNum);
        clearCloneCaches(mediaDir, prevId.image?.menu);

        for (const f of ['menu.jpg', 'menu.png', 'menu.jpeg', 'menu.ogg', 'menu.mp3', 'menu.m4a']) {
            const fp = path.join(mediaDir, f);
            try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
        }

        const reg = botCtx.getJadibotRegistry();
        const requester = reg[cloneNum]?.requester || cloneNum;
        const defaultName = `Bot ${cloneNum}`;
        if (reg[cloneNum]) {
            reg[cloneNum].config = {
                botname: defaultName,
                packname: defaultName,
                namaOwner: defaultName,
                owner: requester,
                asciiName: defaultName,
                asciiFont: global._mainConfig?.asciiFont || 'ANSI Shadow',
                audiomenu: true,
                owners: [...new Set([cloneNum, requester].filter(Boolean))]
            };
            botCtx.saveJadibotRegistry(reg);
        }

        if (!global.db.settings) global.db.settings = {};
        global.db.settings.audiomenu = true;
        botCtx.saveJadibotMemoryDb(cloneNum, global.db);

        if (jadibotMgr && typeof jadibotMgr.getJadibotConfig === 'function') {
            const freshCfg = jadibotMgr.getJadibotConfig(cloneNum);
            if (freshCfg) Dinz.jadibotConfig = freshCfg;
        }

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🔄',
            title: 'KONFIGURASI CLONE DIRESET',
            rows: [
                { label: 'Nomor Clone', value: cloneNum },
                { label: 'Nama Bot', value: defaultName },
                { label: 'Audio Menu', value: '🟢 Aktif (Default)' },
                { label: 'Scope', value: 'Khusus Clone Ini (Bot Utama Aman)' }
            ]
        }));
    }
};
