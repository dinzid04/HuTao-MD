const { cleanNum, resolveTargetJid: _resolveTargetJid } = require('./_helper');

module.exports = {
    name: 'add',
    category: 'group',
    commands: ['add'],

    async execute(ctx) {
        const { Dinz, m, args, isCreator, Reply, usedPrefix } = ctx;
        const resolveTargetJid = () => _resolveTargetJid(m, args);

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin);
        const target = resolveTargetJid();
        if (!target) return Reply(`⚠️ Masukkan nomor yang ingin ditambahkan. Contoh: \`${usedPrefix}add 62812xxx\``);
        try {
            await Dinz.groupParticipantsUpdate(m.chat, [target], 'add');
            return Reply(`✅ Berhasil menambahkan @${cleanNum(target)} ke grup.`, [target]);
        } catch (e) {
            return Reply(`❌ Gagal menambahkan member (mungkin privasi grup aktif): ${e.message}`);
        }
        return true;
    }
};
