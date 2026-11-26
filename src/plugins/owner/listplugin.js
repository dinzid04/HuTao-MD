module.exports = {
    name: 'listplugin',
    category: 'owner',
    commands: ['listplugin', 'listfitur', 'listcase'],

    async execute(ctx) {
        const { Dinz, args, isCreator, isMainOwner, Reply, pluginLoader, botCtx, usedPrefix } = ctx;

        if (Dinz.isJadibot || !isMainOwner) return Reply('🔒 Fitur ini khusus owner bot utama.');
        if (!isCreator) return Reply(global.mess.owner);

        try {
            const plugins = pluginLoader.getLoadedPlugins();
            const allCommands = [...new Set(pluginLoader.getValidCommands())].sort();
            const disabledList = Array.isArray(botCtx.getRootDb()?.settings?.disabledCommands)
                ? botCtx.getRootDb().settings.disabledCommands
                : [];
            const disabledSet = new Set(disabledList.map((c) => String(c).toLowerCase()));

            if (plugins.length === 0) {
                return Reply('❌ Tidak ada plugin yang dimuat di folder src/plugins.');
            }

            const arg0 = (args[0] || '').trim().toLowerCase();

            if (arg0 && !/^\d+$/.test(arg0)) {
                const matched = plugins.filter((p) => p.folder.toLowerCase() === arg0 || p.category.toLowerCase() === arg0);
                if (matched.length === 0) {
                    const cats = [...new Set(plugins.map((p) => p.folder))].sort().join(', ');
                    return Reply(`❌ Kategori "${arg0}" tidak ditemukan.\n> ◦ Kategori tersedia: ${cats}`);
                }
                let teks = `\`⌜ Plugin Kategori: ${arg0.toUpperCase()} (${matched.length} File) ⌟\`\n\n`;
                matched.forEach((p, idx) => {
                    const isOff = p.commands.length > 0 && p.commands.every((c) => disabledSet.has(c));
                    const badge = isOff ? ' [OFF]' : '';
                    teks += `> ${idx + 1}. *${p.fileName}*${badge}\n   └ cmd: \`${p.commands.join(', ')}\`\n`;
                });
                teks += `\n💡 Gunakan \`${usedPrefix}getplugin ${arg0}/<nama>\` atau \`${usedPrefix}togglefitur <cmd>\``;
                return Reply(teks);
            }

            if (arg0 && /^\d+$/.test(arg0)) {
                const chunkSize = 50;
                const totalPage = Math.ceil(allCommands.length / chunkSize);
                let page = parseInt(arg0, 10) || 1;
                if (page < 1 || page > totalPage) page = 1;
                const chunk = allCommands.slice((page - 1) * chunkSize, page * chunkSize);
                let teks = `\`⌜ Daftar Command (${allCommands.length} Total | ${plugins.length} Plugin) ⌟\`\n> ◦ *Halaman :* ${page} / ${totalPage}\n\n`;
                chunk.forEach((name, idx) => {
                    const mark = disabledSet.has(name) ? ' ⛔' : '';
                    teks += `> ${(page - 1) * chunkSize + idx + 1}. ${name}${mark}\n`;
                });
                if (totalPage > 1) {
                    teks += `\n💡 Ketik \`${usedPrefix}listplugin <halaman>\` atau \`${usedPrefix}listplugin <kategori>\``;
                }
                return Reply(teks);
            }

            const byCat = new Map();
            for (const p of plugins) {
                const cat = p.folder || p.category;
                if (!byCat.has(cat)) byCat.set(cat, []);
                byCat.get(cat).push(p);
            }

            const cats = [...byCat.keys()].sort();
            let teks =
                `\`⌜ Daftar Kategori Plugin ⌟\`\n` +
                `> ◦ *Total Kategori :* ${cats.length}\n` +
                `> ◦ *Total Fitur :* ${plugins.length} file\n` +
                `> ◦ *Total Command :* ${allCommands.length}\n` +
                `> ◦ *Command Nonaktif :* ${disabledSet.size}\n\n`;

            cats.forEach((cat, idx) => {
                const list = byCat.get(cat);
                const cmdCount = list.reduce((sum, p) => sum + (p.commands?.length || 0), 0);
                teks += `> ${idx + 1}. *${cat}* — ${list.length} fitur (${cmdCount} cmd)\n`;
            });

            teks += `\n💡 Lihat isi kategori: \`${usedPrefix}listplugin <kategori>\`\n💡 Lihat daftar command: \`${usedPrefix}listplugin 1\``;
            await Reply(teks);
        } catch (err) {
            console.error('listplugin error:', err);
            Reply(`❌ Gagal membaca daftar plugin: ${err.message}`);
        }
        return true;
    }
};
