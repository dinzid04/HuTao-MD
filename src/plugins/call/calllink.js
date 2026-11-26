const { callEngine, formatCard, toMono, toBoldSans } = require('./_helper');

module.exports = {
    name: 'calllink',
    category: 'call',
    commands: ['calllink', 'vclink'],

    async execute(ctx) {
        const { Dinz, m, args, text, body, Reply, prefixMgr, usedPrefix } = ctx;
        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : (usedPrefix || '.');

        const mediaArg = (args[0] || '').toLowerCase();
        const media = ['audio', 'voice', 'suara'].includes(mediaArg) ? 'audio' : 'video';
        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            const res = await callEngine.createBaileysCallLink(Dinz, media);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(formatCard({
                icon: media === 'video' ? '📹' : '📞',
                title: 'WHATSAPP CALL LINK',
                rows: [
                    { label: 'Tipe', value: toBoldSans(media === 'video' ? 'Video Call' : 'Voice Call') },
                    { label: 'Engine', value: toMono('Baileys Native') }
                ],
                body: res.url,
                footer: `untuk streaming video yt di call, gunakan ${pfx}playcall video <judul>`
            }));
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal membuat call link via Baileys: ${err.message}`);
        }
        return true;
    }
};
