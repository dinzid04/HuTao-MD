module.exports = {
    name: 'savedb',
    category: 'owner',
    commands: ['savedb', 'syncdb'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, botCtx, database } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        try {
            const t0 = Date.now();
            await database.write(global.db, true);
            const elapsed = Date.now() - t0;
            const mode = String(botCtx.getStorageMode ? botCtx.getStorageMode() : 'local').toUpperCase();
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(
                `\`⌜ Database Tersimpan ⌟\`\n` +
                `> ◦ *Status :* Berhasil disimpan & disinkronkan\n` +
                `> ◦ *Mode :* ${mode === 'MONGODB' ? 'MongoDB Cloud + Lokal JSON' : 'Lokal JSON (data/database.json)'}\n` +
                `> ◦ *Waktu :* ${elapsed} ms`
            );
        } catch (e) {
            return Reply(`❌ Gagal menyimpan database: ${e.message}`);
        }
        return true;
    }
};
