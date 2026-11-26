module.exports = {
    name: 'jadibot',
    category: 'jadibot',
    commands: ['jadibot'],

    async execute(ctx) {
        const { Dinz, m, args, text, senderNumber, isCreator, Reply, example, jadibotMgr } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!jadibotMgr.claimCommandExecution(m.key.id)) return;
        const target = jadibotMgr.normalizeNumber(args[0] || '');
        if (!target) return Reply(example("6281234567890"));
        if (!jadibotMgr.isValidNumber(target)) return Reply("❌ Format nomor tidak valid. Gunakan 62xxxxxxxxxx");

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(`⏳ Membuat pairing untuk *${target}*...`);

        const chatId = m.chat;
        const result = await jadibotMgr.startJadibot(target, {
            chatId,
            requester: senderNumber,
            pairing: true,
            onNotify: async (text) => {
                try {
                    const sock = global.socket || Dinz;
                    await sock.sendMessage(chatId, { text });
                } catch (e) {
                    console.error('[Jadibot notify error]', e.message);
                }
            }
        });

        if (!result.ok) {
            return Reply(`❌ ${result.message}`);
        }
        return true;
    }
};
