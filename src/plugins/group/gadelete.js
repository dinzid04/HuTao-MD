module.exports = {
    name: 'gadelete',
    category: 'group',
    commands: ['gadelete', 'hapusgiveaway', 'giveawaydelete'],

    async execute(ctx) {
        const { Dinz, m, command, args, isCreator, Reply, botCtx, usedPrefix } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        const id = (args[0] || '').trim().toUpperCase();
        if (!id) return Reply(`⚠️ Masukkan ID giveaway. Contoh: \`${usedPrefix}${command} GA-XXXXXX\``);
        const giveaways = botCtx.getSection('giveaways', Dinz) || {};
        if (!giveaways[id]) return Reply('❌ Giveaway tidak ditemukan.');
        delete giveaways[id];
        botCtx.setSection('giveaways', giveaways, Dinz);
        return Reply(`🗑️ Giveaway \`${id}\` berhasil dihapus.`);
    }
};
