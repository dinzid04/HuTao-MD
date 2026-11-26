const { formatCard, toMono, toBoldSans } = require('../../utils/formatter');

module.exports = {
    name: 'totalfitur',
    category: 'menu',
    commands: ['totalfitur', 'totalfiturs', 'totalcommand', 'totalcase'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, validCommandsList, botCtx } = ctx;

        const totalFitur = validCommandsList.length || 0;
        const identity = botCtx.getBotIdentity(Dinz);
        await Dinz.sendMessage(m.chat, { react: { text: '📊', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '📊',
            title: 'TOTAL FITUR BOT',
            rows: [
                { label: 'Bot Name', value: toBoldSans(identity.botname) },
                { label: 'Versi', value: toMono(global.versi || '1.0.0') },
                { label: 'Total Fitur', value: `${toMono(totalFitur)} Fitur` },
                { label: 'Status', value: '🟢 Aktif & Siap Digunakan' }
            ]
        }));
    }
};
