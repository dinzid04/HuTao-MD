const { getGroupObj } = require('./_helper');

module.exports = {
    name: 'hapusabsen',
    category: 'group',
    commands: ['hapusabsen', 'stopabsen'],

    async execute(ctx) {
        const { m, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        const g = getGroupObj(m.chat);
        if (!g.absen) return Reply('❌ Tidak ada sesi absen aktif.');
        delete g.absen;
        return Reply('🗑️ Sesi absen di grup ini telah dihapus.');
    }
};
