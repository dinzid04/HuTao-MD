module.exports = {
    name: 'restartjadibot',
    category: 'jadibot',
    commands: ['restartjadibot', 'restartjbot'],

    async execute(ctx) {
        const { Dinz, m, args, text, isCreator, Reply, example, jadibotMgr } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!jadibotMgr.claimCommandExecution(m.key.id)) return;
        const arg = (args[0] || '').toLowerCase();
        if (!arg) return Reply(example("62812xxxx / all"));

        await Dinz.sendMessage(m.chat, { react: { text: '🔄', key: m.key } }).catch(() => {});

        if (arg === 'all') {
            const reg = jadibotMgr.loadRegistry();
            const numbers = Object.keys(reg);
            if (!numbers.length) return Reply("Belum ada jadibot");
            const results = [];
            for (const n of numbers) {
                const r = await jadibotMgr.restartJadibot(n);
                results.push(`${n}: ${r.ok ? '✅' : '❌'} ${r.message}`);
            }
            return Reply(`🔄 *Restart semua jadibot*\n\n${results.join('\n')}`);
        }

        const target = jadibotMgr.normalizeNumber(arg);
        if (!jadibotMgr.isValidNumber(target)) return Reply("❌ Format nomor tidak valid");
        const res = await jadibotMgr.restartJadibot(target);
        Reply(res.ok ? `✅ ${res.message}` : `❌ ${res.message}`);
        return true;
    }
};
