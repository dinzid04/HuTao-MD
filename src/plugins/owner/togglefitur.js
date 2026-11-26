const { formatCard } = require('../../utils/formatter');

const PROTECTED_COMMANDS = new Set([
    'togglefitur', 'offfitur', 'onfitur', 'disablefitur', 'enablefitur', 'listoff',
    'reloadplugin', 'reloadfitur', 'reloadplugins',
    'addplugin', 'addfitur', 'addcase', 'getplugin', 'getfitur', 'getcase',
    'delplugin', 'delfitur', 'delcase', 'listplugin', 'listfitur', 'listcase',
    'menu', 'allmenu', 'self', 'public'
]);

function getDisabledSet(botCtx) {
    const rootDb = botCtx.getRootDb();
    if (!rootDb.settings || typeof rootDb.settings !== 'object') rootDb.settings = {};
    if (!Array.isArray(rootDb.settings.disabledCommands)) rootDb.settings.disabledCommands = [];
    return new Set(rootDb.settings.disabledCommands.map((c) => String(c).toLowerCase()).filter(Boolean));
}

function saveDisabledSet(botCtx, set) {
    const rootDb = botCtx.getRootDb();
    if (!rootDb.settings || typeof rootDb.settings !== 'object') rootDb.settings = {};
    rootDb.settings.disabledCommands = [...set].sort();
    botCtx.saveRootDb();
}

module.exports = {
    name: 'togglefitur',
    category: 'owner',
    commands: ['togglefitur', 'offfitur', 'onfitur', 'disablefitur', 'enablefitur', 'listoff'],

    async execute(ctx) {
        const { Dinz, m, command, args, isCreator, isMainOwner, Reply, pluginLoader, botCtx, usedPrefix } = ctx;

        if (Dinz.isJadibot || !isMainOwner) return Reply('🔒 Fitur ini khusus owner bot utama.');
        if (!isCreator) return Reply(global.mess.owner);

        const disabledSet = getDisabledSet(botCtx);
        const cmdLower = String(command || '').toLowerCase();

        if (cmdLower === 'listoff' || (args[0] || '').toLowerCase() === 'list') {
            if (disabledSet.size === 0) {
                return Reply('✅ Semua fitur saat ini dalam keadaan *AKTIF* (tidak ada command yang dinonaktifkan).');
            }
            const list = [...disabledSet].sort().map((c, i) => `${i + 1}. \`${c}\``).join('\n');
            return Reply(formatCard({
                icon: '⛔',
                title: `FITUR NONAKTIF (${disabledSet.size})`,
                body: list,
                footer: `Aktifkan kembali: ${usedPrefix}onfitur <command> atau ${usedPrefix}onfitur all`
            }));
        }

        const rawTarget = (args[0] || '').trim().toLowerCase().replace(/^[.!#/]+/, '');
        if (!rawTarget) {
            return Reply(formatCard({
                icon: '🎚️',
                title: 'TOGGLE FITUR (ON/OFF)',
                body:
                    `Aktifkan atau nonaktifkan fitur tertentu tanpa hapus file & tanpa restart bot.\n\n` +
                    `• \`${usedPrefix}togglefitur <command>\` — ganti status ON/OFF\n` +
                    `• \`${usedPrefix}offfitur <command>\` — matikan fitur\n` +
                    `• \`${usedPrefix}onfitur <command>\` — nyalakan fitur\n` +
                    `• \`${usedPrefix}onfitur all\` — nyalakan semua fitur\n` +
                    `• \`${usedPrefix}listoff\` — lihat daftar fitur nonaktif`,
                footer: `Saat ini nonaktif: ${disabledSet.size} command`
            }));
        }

        if (rawTarget === 'all' && (cmdLower === 'onfitur' || cmdLower === 'enablefitur')) {
            const count = disabledSet.size;
            disabledSet.clear();
            saveDisabledSet(botCtx, disabledSet);
            return Reply(`✅ Berhasil mengaktifkan kembali semua fitur (*${count}* command dibuka).`);
        }

        if (PROTECTED_COMMANDS.has(rawTarget)) {
            return Reply(`🛡️ Command inti \`${rawTarget}\` dilindungi dan tidak bisa dinonaktifkan.`);
        }

        const loaded = pluginLoader.getLoadedPlugins();
        const matchedPlugin = loaded.find((p) => {
            const relNoExt = String(p.fileName || '').replace(/\.js$/i, '').toLowerCase();
            return (Array.isArray(p.commands) && p.commands.includes(rawTarget)) || relNoExt === rawTarget || p.name.toLowerCase() === rawTarget;
        });

        const targetCommands = matchedPlugin && matchedPlugin.commands.length > 0
            ? matchedPlugin.commands.filter((c) => !PROTECTED_COMMANDS.has(c))
            : [rawTarget];

        if (!matchedPlugin && !disabledSet.has(rawTarget)) {
            return Reply(`❌ Command/plugin \`${rawTarget}\` tidak ditemukan di daftar plugin aktif.`);
        }

        let action = '';
        if (cmdLower === 'offfitur' || cmdLower === 'disablefitur') {
            action = 'off';
        } else if (cmdLower === 'onfitur' || cmdLower === 'enablefitur') {
            action = 'on';
        } else {
            const currentlyOff = targetCommands.every((c) => disabledSet.has(c));
            action = currentlyOff ? 'on' : 'off';
        }

        for (const c of targetCommands) {
            if (action === 'off') disabledSet.add(c);
            else disabledSet.delete(c);
        }
        saveDisabledSet(botCtx, disabledSet);

        await Dinz.sendMessage(m.chat, { react: { text: action === 'off' ? '⛔' : '✅', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: action === 'off' ? '⛔' : '✅',
            title: action === 'off' ? 'FITUR DINONAKTIFKAN' : 'FITUR DIAKTIFKAN KEMBALI',
            rows: [
                { label: 'Plugin', value: matchedPlugin ? matchedPlugin.fileName : rawTarget },
                { label: 'Command', value: targetCommands.join(', ') },
                { label: 'Status', value: action === 'off' ? 'NONAKTIF (OFF)' : 'AKTIF (ON)' },
                { label: 'Total Nonaktif', value: `${disabledSet.size} command` }
            ]
        }));
    }
};
