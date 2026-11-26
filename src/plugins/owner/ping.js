module.exports = {
    name: 'ping',
    category: 'owner',
    commands: ['ping'],

    async execute(ctx) {
        const { Dinz, m, text, Reply } = ctx;

        const start = Date.now();
        await Dinz.sendMessage(m.chat, { react: { text: '🏓', key: m.key } }).catch(() => {});
        const end = Date.now();
        const speed = end - start;
        Reply(`\`⌜ Ping ⌟\`\n> ◦ Kecepatan : *${speed} ms*\n> ◦ Status : *${speed < 500 ? 'Sangat Cepat' : speed < 1000 ? 'Normal' : 'Lambat'}*`);
        return true;
    }
};
