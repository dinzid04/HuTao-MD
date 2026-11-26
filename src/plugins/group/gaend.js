const { finalizeGiveaway } = require('./_helper');

module.exports = {
    name: 'gaend',
    category: 'group',
    commands: ['gaend', 'selesaigiveaway', 'gareroll', 'ulangigiveaway', 'giveawayreroll'],

    async execute(ctx) {
        const { Dinz, m, command, args, isCreator, Reply, botCtx, usedPrefix } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        const id = (args[0] || '').trim().toUpperCase();
        if (!id) return Reply(`⚠️ Masukkan ID giveaway. Contoh: \`${usedPrefix}${command} GA-XXXXXX\``);
        const isReroll = command.includes('reroll') || command.includes('ulangi');
        const res = await finalizeGiveaway(Dinz, botCtx, id, isReroll);
        if (!res) return Reply('❌ ID Giveaway tidak ditemukan.');
        return;
        return true;
    }
};
