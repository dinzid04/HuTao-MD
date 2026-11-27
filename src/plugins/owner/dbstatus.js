module.exports = {
    name: 'dbstatus',
    category: 'owner',
    commands: ['dbstatus', 'cekdb', 'infodb'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, fs, botCtx, pluginLoader, prefixMgr } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        try {
            const dbFile = botCtx.getDatabasePath();
            const fileSizeBytes = fs.existsSync(dbFile) ? fs.statSync(dbFile).size : 0;
            const fileSizeLabel = fileSizeBytes >= 1024 * 1024
                ? `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                : `${(fileSizeBytes / 1024).toFixed(1)} KB`;

            const mode = String(botCtx.getStorageMode ? botCtx.getStorageMode() : 'local').toUpperCase();
            const isMongo = mode === 'MONGODB';
            const mongoSlot = typeof botCtx.getMongoSlotId === 'function' ? botCtx.getMongoSlotId() : '';
            const rootDb = botCtx.getRootDb();
            const totalUsers = Object.keys(rootDb.users || {}).length;
            const totalGroups = Object.keys(rootDb.groups || {}).length;
            const totalOwners = Array.isArray(rootDb.store?.owner) ? rootDb.store.owner.length : 0;
            const totalPrem = Array.isArray(rootDb.store?.premium)
                ? rootDb.store.premium.filter((u) => u && u.expired > Date.now()).length
                : 0;
            const totalSewa = Array.isArray(rootDb.store?.sewagrup)
                ? rootDb.store.sewagrup.filter((g) => g && g.expired > Date.now()).length
                : 0;
            const totalClones = Object.keys(rootDb.jadibot?.clones || {}).length;
            const totalPlugins = pluginLoader.getLoadedPlugins().length;
            const totalCmds = pluginLoader.getValidCommands().length;
            const authMode = String(global._authSessionMode || 'local').toUpperCase();
            const prefCfg = prefixMgr ? prefixMgr.getPrefixConfig(global.db?.settings) : { mode: 'multi', prefix: '.' };
            const prefLabel = prefCfg.mode === 'single'
                ? `1 Prefix (${prefCfg.prefix})`
                : prefCfg.mode === 'noprefix'
                    ? 'Tanpa Prefix'
                    : `Multi (. ! / # $ & tanpa prefix)`;

            await Dinz.sendMessage(m.chat, { react: { text: '🗄️', key: m.key } }).catch(() => {});
            return Reply(
                `\`⌜ Status Database ⌟\`\n` +
                `> ◦ *Mode Database :* ${isMongo ? '🟢 MongoDB Cloud + Cache Lokal' : '🟡 Lokal JSON (data/database.json)'}\n` +
                `> ◦ *Mode Session WA :* ${authMode === 'MONGODB' ? '🟢 MongoDB Cloud' : '🟡 Lokal (./session)'}\n` +
                `> ◦ *Mode Prefix :* ${prefLabel}\n` +
                (isMongo ? `> ◦ *Database MongoDB :* ${global.mongoDbName || 'shiki_ai'}\n> ◦ *Slot Per-Nomor :* \`${mongoSlot || '-'}\` (Terisolasi)\n` : `> ◦ *Tips Cloud :* Isi global.mongoUri di settings.js agar tahan reset panel\n`) +
                `> ◦ *Ukuran File Lokal :* ${fileSizeLabel}\n` +
                `> ◦ *Total Users :* ${totalUsers}\n` +
                `> ◦ *Total Grup :* ${totalGroups}\n` +
                `> ◦ *Owner Tambahan :* ${totalOwners}\n` +
                `> ◦ *Premium Aktif :* ${totalPrem}\n` +
                `> ◦ *Sewa Grup Aktif :* ${totalSewa}\n` +
                `> ◦ *Clone Jadibot :* ${totalClones}\n` +
                `> ◦ *Plugin / Command :* ${totalPlugins} Plugin (${totalCmds} Command)`
            );
        } catch (e) {
            return Reply(`❌ Gagal membaca status database: ${e.message}`);
        }
        return true;
    }
};
