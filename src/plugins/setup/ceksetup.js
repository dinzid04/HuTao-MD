const { formatCard, toMono, requireMainSetupAccess } = require('./_helper');

module.exports = {
    name: 'ceksetup',
    category: 'setup',
    commands: ['ceksetup', 'infobot', 'setuplist', 'cekconfig'],

    async execute(ctx) {
        if (!requireMainSetupAccess(ctx)) return true;
        const { Reply, botCtx, fs, path, usedPrefix } = ctx;
        const cfg = botCtx.getMainConfig();
        const mediaDir = path.join(process.cwd(), 'assets', 'media');
        const hasAudioFile = ['menu.ogg', 'menu.mp3', 'menu.m4a'].some((f) => fs.existsSync(path.join(mediaDir, f)));
        const audioOn = (typeof global.db?.settings?.audiomenu === 'boolean')
            ? global.db.settings.audiomenu
            : (cfg.audiomenu !== false);

        return Reply(formatCard({
            icon: '⚙️',
            title: 'KONFIGURASI BOT UTAMA',
            rows: [
                { label: 'Nama Bot', value: cfg.botname || '-' },
                { label: 'No Owner', value: toMono(cfg.owner || '-') },
                { label: 'Nama Owner', value: cfg.namaOwner || '-' },
                { label: 'Packname', value: cfg.packname || '-' },
                { label: 'ASCII Name', value: `${cfg.asciiName || cfg.botname || '-'} (${cfg.asciiFont || 'ANSI Shadow'})` },
                { label: 'Audio Menu', value: `${audioOn ? '🟢 Aktif (ON)' : '🔴 Nonaktif (OFF)'} • File: ${hasAudioFile ? 'Ada' : 'Kosong'}` },
                { label: 'Thumb / Menu Img', value: cfg.image?.menu || '-' },
                { label: 'QRIS Img', value: cfg.image?.qris || cfg.payment?.qris || '-' },
                { label: 'Dana', value: toMono(cfg.payment?.dana || '-') },
                { label: 'GoPay', value: toMono(cfg.payment?.gopay || '-') },
                { label: 'Atas Nama', value: cfg.payment?.an || '-' }
            ],
            footer: `Ketik ${usedPrefix}menu setup untuk melihat daftar perintah ubah config bot utama`
        }));
    }
};
