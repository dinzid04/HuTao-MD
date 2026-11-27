module.exports = {
    name: 'autoread',
    category: 'owner',
    commands: ['autoread', 'autotyping', 'readsw', 'autoreadsw'],

    async execute(ctx) {
        const { command, args, isCreator, Reply, example, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';

        if (!isCreator) return Reply(global.mess.owner);
        const cmd = String(command || '').toLowerCase();
        const value = String(args[0] || '').trim().toLowerCase();

        const configMap = {
            autoread: {
                key: 'autoread',
                title: 'Autoread Settings',
                onDesc: 'Bot akan otomatis membaca pesan masuk',
                offDesc: 'Bot tidak akan otomatis membaca pesan masuk'
            },
            autotyping: {
                key: 'autotyping',
                title: 'Auto Typing Settings',
                onDesc: 'Bot akan menampilkan status mengetik saat menerima pesan',
                offDesc: 'Status mengetik otomatis dinonaktifkan'
            },
            readsw: {
                key: 'readsw',
                title: 'Auto Read SW Settings',
                onDesc: 'Bot akan otomatis melihat Status WhatsApp kontak',
                offDesc: 'Auto Read Status WhatsApp dinonaktifkan'
            },
            autoreadsw: {
                key: 'readsw',
                title: 'Auto Read SW Settings',
                onDesc: 'Bot akan otomatis melihat Status WhatsApp kontak',
                offDesc: 'Auto Read Status WhatsApp dinonaktifkan'
            }
        };

        const cfg = configMap[cmd] || configMap.autoread;
        if (!global.db.settings) global.db.settings = {};

        if (!value || !['on', 'off', 'aktif', 'nonaktif', '1', '0'].includes(value)) {
            const cur = global.db.settings[cfg.key] === true;
            return Reply(
                `\`⌜ ${cfg.title} ⌟\`\n` +
                `> ◦ *Status Saat Ini :* ${cur ? '🟢 ON' : '🔴 OFF'}\n` +
                `> ◦ *Penggunaan :* \`${pfx}${cmd} on\` / \`${pfx}${cmd} off\``
            );
        }

        const enable = ['on', 'aktif', '1'].includes(value);
        global.db.settings[cfg.key] = enable;
        return Reply(
            `\`⌜ ${cfg.title} ⌟\`\n` +
            `> ◦ *Status :* ${enable ? '🟢 Aktif (ON)' : '🔴 Nonaktif (OFF)'}\n` +
            `> ◦ *Info :* ${enable ? cfg.onDesc : cfg.offDesc}`
        );
    }
};
