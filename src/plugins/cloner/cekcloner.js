const { formatCard, toMono, requireClonerOwner, getCloneMediaDir } = require('./_helper');

module.exports = {
    name: 'cekcloner',
    category: 'cloner',
    commands: ['cekcloner', 'cekclone', 'clonesetup', 'infoclone'],

    async execute(ctx) {
        const cloneNum = requireClonerOwner(ctx);
        if (!cloneNum) return true;
        const { Reply, botCtx, fs, path, usedPrefix } = ctx;

        const id = botCtx.getJadibotIdentity(cloneNum);
        const mediaDir = getCloneMediaDir(cloneNum, botCtx);
        const hasAudio = ['menu.ogg', 'menu.mp3', 'menu.m4a'].some((f) => fs.existsSync(path.join(mediaDir, f)));
        const hasLocalThumb = ['menu.jpg', 'menu.png', 'menu.jpeg'].some((f) => fs.existsSync(path.join(mediaDir, f)));

        return Reply(formatCard({
            icon: '🤖',
            title: 'KONFIGURASI BOT CLONE (TERISOLASI)',
            rows: [
                { label: 'Nomor Clone', value: toMono(cloneNum) },
                { label: 'Nama Bot', value: id.botname || '-' },
                { label: 'No Owner', value: toMono(id.owner || '-') },
                { label: 'Nama Owner', value: id.namaOwner || '-' },
                { label: 'Packname', value: id.packname || '-' },
                { label: 'ASCII Name', value: `${id.asciiName || id.botname || '-'} (${id.asciiFont || 'ANSI Shadow'})` },
                { label: 'Audio Menu', value: `${id.audiomenu !== false ? '🟢 Aktif (ON)' : '🔴 Nonaktif (OFF)'} • Custom: ${hasAudio ? 'Ada' : 'Default'}` },
                { label: 'Thumb / Menu Img', value: `${id.image?.menu || '-'} (${hasLocalThumb ? 'Lokal Clone' : 'URL'})` },
                { label: 'QRIS Img', value: id.image?.qris || id.payment?.qris || '-' },
                { label: 'Dana', value: toMono(id.payment?.dana || '-') },
                { label: 'GoPay', value: toMono(id.payment?.gopay || '-') },
                { label: 'Atas Nama', value: id.payment?.an || '-' },
                { label: 'Isolasi Data', value: '🔒 100% Terpisah dari Bot Utama' }
            ],
            footer: `Ketik ${usedPrefix}menu cloner untuk melihat semua perintah ubah config clone`
        }));
    }
};
