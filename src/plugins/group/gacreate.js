const { formatCard, parseDurationMs, genGiveawayId } = require('./_helper');

module.exports = {
    name: 'gacreate',
    category: 'group',
    commands: ['gacreate', 'buatgiveaway', 'giveawaycreate'],

    async execute(ctx) {
        const { Dinz, m, text, body, isCreator, Reply, moment, botCtx, usedPrefix } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        const parts = text.split('|').map((s) => s.trim());
        if (parts.length < 4) {
            return Reply(`⚠️ Format: \`${usedPrefix}gacreate Judul | Durasi(10m/1h/1d) | JumlahPemenang | Hadiah\`\nContoh: \`${usedPrefix}gacreate Event Jumat | 1h | 2 | Saldo 25k\``);
        }
        const [title, durStr, winStr, prize] = parts;
        const durMs = parseDurationMs(durStr);
        const winners = parseInt(winStr, 10);
        if (!durMs || durMs < 10000) return Reply('❌ Durasi tidak valid. Gunakan format seperti `30s`, `15m`, `2h`, atau `1d`.');
        if (!winners || winners < 1 || winners > 20) return Reply('❌ Jumlah pemenang harus 1 sampai 20.');

        const giveaways = botCtx.getSection('giveaways', Dinz) || {};
        const id = genGiveawayId();
        const endTime = Date.now() + durMs;
        giveaways[id] = {
            id,
            chatId: m.chat,
            title,
            prize,
            winners,
            endTime,
            ended: false,
            participants: [],
            winnerList: [],
            createdBy: m.sender,
            createdAt: Date.now()
        };
        botCtx.setSection('giveaways', giveaways, Dinz);

        return Reply(formatCard({
            icon: '🎉',
            title: 'GIVEAWAY DIBUKA!',
            rows: [
                { label: 'ID', value: `\`${id}\`` },
                { label: 'Judul', value: title },
                { label: 'Hadiah', value: prize },
                { label: 'Pemenang', value: `${winners} orang` },
                { label: 'Berakhir', value: moment(endTime).tz('Asia/Jakarta').format('DD MMM YYYY HH:mm [WIB]') }
            ],
            body: `Ketik \`${usedPrefix}gajoin ${id}\` untuk ikut berpartisipasi!`
        }));
    }
};
