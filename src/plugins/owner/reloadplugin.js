const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'reloadplugin',
    category: 'owner',
    commands: ['reloadplugin', 'reloadfitur', 'reloadplugins'],

    async execute(ctx) {
        const { Dinz, m, isCreator, isMainOwner, Reply, pluginLoader } = ctx;

        if (Dinz.isJadibot || !isMainOwner) return Reply('🔒 Fitur ini khusus owner bot utama.');
        if (!isCreator) return Reply(global.mess.owner);

        const startedAt = Date.now();
        const res = pluginLoader.loadAllPlugins(false);
        const elapsedMs = Date.now() - startedAt;
        const errList = Array.isArray(res.errors) ? res.errors : [];

        await Dinz.sendMessage(m.chat, { react: { text: errList.length ? '⚠️' : '✅', key: m.key } }).catch(() => {});

        const rows = [
            { label: 'Total Kategori', value: `${(res.categories || []).length} folder` },
            { label: 'Total Fitur', value: `${res.plugins.length} plugin` },
            { label: 'Total Command', value: `${res.validCommands.length} command aktif` },
            { label: 'Waktu Muat', value: `${elapsedMs} ms` },
            { label: 'Error Muat', value: errList.length ? `${errList.length} file bermasalah` : '0 (Semua Normal)' }
        ];

        const extra = errList.length
            ? '\nDetail error:\n' + errList.slice(0, 5).map((e) => `• ${e.file}: ${e.error}`).join('\n')
            : '';

        return Reply(formatCard({
            icon: '🔄',
            title: 'RELOAD PLUGIN SELESAI',
            rows,
            body: extra || undefined
        }));
    }
};
