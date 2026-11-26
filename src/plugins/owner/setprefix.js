module.exports = {
    name: 'setprefix',
    category: 'owner',
    commands: ['setprefix', 'prefix', 'cekprefix'],

    async execute(ctx) {
        const { Dinz, m, args, text, isCreator, Reply, database, prefixMgr } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!global.db.settings) global.db.settings = {};

        const rawArg = (args[0] || '').trim();
        const lowerArg = rawArg.toLowerCase();

        if (!rawArg) {
            const cfg = prefixMgr.getPrefixConfig(global.db.settings);
            const modeText = cfg.mode === 'single'
                ? `🔒 *1 Prefix Saja* (\`${cfg.prefix}\`)`
                : cfg.mode === 'noprefix'
                    ? `🔓 *Tanpa Prefix* (langsung ketik command)`
                    : `🌐 *Multi Prefix* (\`. ! / # $\` atau tanpa prefix)`;
            return Reply(
                `\`⌜ Pengaturan Prefix ⌟\`\n` +
                `> ◦ *Status Saat Ini :* ${modeText}\n` +
                `> ◦ *Penyimpanan :* Permanen di database (anti-reset)\n\n` +
                `📌 *Cara Mengubah:*\n` +
                `> ◦ *1 Prefix saja:* \`setprefix .\` (atau \`!\`, \`/\`, \`#\`, \`$\`)\n` +
                `> ◦ *Multi Prefix:* \`setprefix multi\`\n` +
                `> ◦ *Tanpa Prefix:* \`setprefix noprefix\``
            );
        }

        if (lowerArg === 'multi' || lowerArg === 'all' || lowerArg === 'bebas') {
            global.db.settings.prefixMode = 'multi';
            await database.write(global.db, true);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(
                `\`⌜ Prefix Diperbarui ⌟\`\n` +
                `> ◦ *Mode :* 🌐 Multi Prefix\n` +
                `> ◦ *Info :* Bot merespon prefix \`. ! / # $\` maupun tanpa prefix\n` +
                `> ◦ *Database :* Tersimpan permanen`
            );
        }

        if (lowerArg === 'noprefix' || lowerArg === 'off' || lowerArg === 'none' || lowerArg === 'tanpa') {
            global.db.settings.prefixMode = 'noprefix';
            await database.write(global.db, true);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(
                `\`⌜ Prefix Diperbarui ⌟\`\n` +
                `> ◦ *Mode :* 🔓 Tanpa Prefix\n` +
                `> ◦ *Contoh :* \`menu\`, \`ping\`, \`tiktok\`\n` +
                `> ◦ *Database :* Tersimpan permanen`
            );
        }

        if (rawArg.length > 3 || /\s/.test(rawArg)) {
            return Reply(`❌ Simbol prefix maksimal 3 karakter tanpa spasi.\n> Contoh: \`setprefix .\`, \`setprefix !\`, \`setprefix /\``);
        }

        global.db.settings.prefixMode = 'single';
        global.db.settings.prefix = rawArg;
        await database.write(global.db, true);
        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        return Reply(
            `\`⌜ Prefix Diperbarui ⌟\`\n` +
            `> ◦ *Mode :* 🔒 1 Prefix Saja\n` +
            `> ◦ *Prefix Aktif :* \`${rawArg}\`\n` +
            `> ◦ *Contoh :* \`${rawArg}menu\`, \`${rawArg}ping\`, \`${rawArg}dbstatus\`\n` +
            `> ◦ *Database :* Tersimpan permanen (tidak reset saat restart)`
        );
    }
};
