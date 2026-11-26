module.exports = {
    name: 'deljadibot',
    category: 'jadibot',
    commands: ['deljadibot', 'deljbot'],

    async execute(ctx) {
        const { Dinz, m, args, text, isCreator, Reply, example, jadibotMgr } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!jadibotMgr.claimCommandExecution(m.key.id)) return;
        const arg = (args[0] || '').toLowerCase();
        if (!arg) return Reply(example("62812xxxx / all"));

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        if (arg === 'all') {
            const res = await jadibotMgr.deleteAllJadibot();
            return Reply(`🗑️ *Hapus semua jadibot*\n${res.message}`);
        }

        const target = jadibotMgr.normalizeNumber(arg);
        if (!jadibotMgr.isValidNumber(target)) return Reply("❌ Format nomor tidak valid");
        const res = await jadibotMgr.deleteJadibot(target);
        Reply(res.ok ? `✅ ${res.message}` : `❌ ${res.message}`);
        return true;
    }
};
