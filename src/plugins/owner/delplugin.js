const PROTECTED_PLUGINS = new Set([
    'owner/addplugin.js',
    'owner/delplugin.js',
    'owner/getplugin.js',
    'owner/listplugin.js',
    'owner/reloadplugin.js',
    'owner/togglefitur.js'
]);

module.exports = {
    name: 'delplugin',
    category: 'owner',
    commands: ['delplugin', 'delfitur', 'delcase'],

    async execute(ctx) {
        const { Dinz, text, isCreator, isMainOwner, Reply, example, fs, path, pluginLoader } = ctx;

        if (Dinz.isJadibot || !isMainOwner) return Reply('🔒 Fitur ini khusus owner bot utama.');
        if (!isCreator) return Reply(global.mess.owner);
        if (!text || text.trim().length === 0) return Reply(example('tools/contoh  atau  nama_command'));

        const query = text.trim();
        const lowerQuery = query.toLowerCase().replace(/\\/g, '/').replace(/^src\/plugins\//i, '').replace(/\.js$/i, '');

        try {
            const loaded = pluginLoader.getLoadedPlugins();
            let matched = loaded.find((p) => {
                const relNoExt = String(p.fileName || '').replace(/\.js$/i, '').toLowerCase();
                return relNoExt === lowerQuery || p.name.toLowerCase() === lowerQuery;
            });

            if (!matched) {
                matched = loaded.find((p) => Array.isArray(p.commands) && p.commands.includes(lowerQuery));
            }

            if (!matched || !matched.filePath || !fs.existsSync(matched.filePath)) {
                return Reply(`❌ Plugin/command "${query}" tidak ditemukan di \`src/plugins/\`.`);
            }

            const relPath = String(matched.fileName || path.relative(pluginLoader.PLUGINS_DIR, matched.filePath)).replace(/\\/g, '/');
            if (PROTECTED_PLUGINS.has(relPath.toLowerCase())) {
                return Reply(`🛡️ Plugin inti \`src/plugins/${relPath}\` dilindungi agar plugin manager tetap berfungsi.`);
            }

            fs.unlinkSync(matched.filePath);
            const reloadRes = pluginLoader.loadAllPlugins(true);

            return Reply(
                `✅ *Plugin berhasil dihapus!*\n` +
                `> ◦ File : *src/plugins/${relPath}*\n` +
                `> ◦ Command dihapus : *${(matched.commands || []).join(', ') || matched.name}*\n` +
                `> ◦ Total tersisa : *${reloadRes.plugins.length} fitur (${reloadRes.validCommands.length} command)*`
            );
        } catch (err) {
            console.error('delplugin error:', err);
            Reply(`❌ Gagal menghapus plugin: ${err.message}`);
        }
        return true;
    }
};
