module.exports = {
    name: 'getplugin',
    category: 'owner',
    commands: ['getplugin', 'getfitur', 'getcase'],

    async execute(ctx) {
        const { Dinz, text, isCreator, isMainOwner, Reply, example, fs, path, pluginLoader } = ctx;

        if (Dinz.isJadibot || !isMainOwner) return Reply('🔒 Fitur ini khusus owner bot utama.');
        if (!isCreator) return Reply(global.mess.owner);
        if (!text || text.trim().length === 0) return Reply(example('ai  atau  owner/autobackup'));

        const query = text.trim();
        const lowerQuery = query.toLowerCase().replace(/\\/g, '/').replace(/^src\/plugins\//i, '').replace(/\.js$/i, '');

        try {
            const loaded = pluginLoader.getLoadedPlugins();
            let matchedPlugin = loaded.find((p) => {
                const relNoExt = String(p.fileName || '').replace(/\.js$/i, '').toLowerCase();
                return relNoExt === lowerQuery || p.name.toLowerCase() === lowerQuery;
            });

            if (!matchedPlugin) {
                matchedPlugin = loaded.find((p) => Array.isArray(p.commands) && p.commands.includes(lowerQuery));
            }

            let targetPath = matchedPlugin?.filePath || '';
            let displayName = matchedPlugin?.fileName || '';

            if (!targetPath && lowerQuery.includes('/')) {
                const candidate = path.resolve(pluginLoader.PLUGINS_DIR, `${lowerQuery}.js`);
                if (candidate.startsWith(path.resolve(pluginLoader.PLUGINS_DIR) + path.sep) && fs.existsSync(candidate)) {
                    targetPath = candidate;
                    displayName = `${lowerQuery}.js`;
                }
            }

            if (!targetPath || !fs.existsSync(targetPath)) {
                return Reply(`❌ Plugin/command "${query}" tidak ditemukan di \`src/plugins/\`.`);
            }

            const code = fs.readFileSync(targetPath, 'utf8').trim();
            await Reply(`\`⌜ Plugin: src/plugins/${displayName} ⌟\`\n\n\`\`\`javascript\n${code}\n\`\`\``);
        } catch (err) {
            console.error('getplugin error:', err);
            Reply(`❌ Gagal mengambil plugin: ${err.message}`);
        }
        return true;
    }
};
