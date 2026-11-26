module.exports = {
    name: 'levelupnotif',
    category: 'group',
    commands: ['levelupnotif', 'autolevelup', 'notiflevelup', 'setlevelup'],

    async execute(ctx) {
        const { m, args, isCreator, Reply, botCtx } = ctx;

        const sub1 = (args[0] || '').toLowerCase();
        const sub2 = (args[1] || '').toLowerCase();
        const isGlobalScope = sub1 === 'global' || !m.isGroup;
        const actionArg = sub1 === 'global' ? sub2 : sub1;

        if (!actionArg) {
            const globalOn = Boolean(global.db.settings?.levelupNotif === true);
            const grp = m.isGroup ? (global.db.groups?.[m.chat] || {}) : null;
            const grpActive = m.isGroup
                ? (grp.levelupNotif === true || (grp.levelupNotifExplicit !== true && globalOn))
                : globalOn;
            const lines = [
                `\`🎉 𝗟𝗘𝗩𝗘𝗟 𝗨𝗣 𝗡𝗢𝗧𝗜𝗙\``,
                `> ɢʟᴏʙᴀʟ : ${globalOn ? '🟢 *AKTIF*' : '🔴 *NONAKTIF* (default)'}`,
                ...(m.isGroup ? [`> ɢʀᴜᴘ ɪɴɪ : ${grpActive ? '🟢 *AKTIF*' : '🔴 *NONAKTIF*'}`] : []),
                `> sɪsᴛᴇᴍ ᴇxᴘ : 🟢 *SELALU AKTIF* (+EXP & bonus Money acak)`,
                ``,
                `> ᴄᴀʀᴀ ᴜʙᴀʜ :`,
                m.isGroup
                    ? `> ◦ .levelupnotif on / off _(khusus grup ini)_\n> ◦ .levelupnotif global on / off _(owner global)_`
                    : `> ◦ .levelupnotif on / off _(owner global)_`
            ];
            return Reply(lines.join('\n'));
        }

        if (!['on', 'off', 'aktif', 'mati', 'true', 'false'].includes(actionArg)) {
            return Reply(`\`🎉 𝗟𝗘𝗩𝗘𝗟 𝗨𝗣 𝗡𝗢𝗧𝗜𝗙\`\n> ᴘᴇɴɢɢᴜɴᴀᴀɴ : *.levelupnotif on* / *.levelupnotif off*`);
        }

        const enable = ['on', 'aktif', 'true'].includes(actionArg);

        if (isGlobalScope) {
            if (!isCreator) return Reply(global.mess.owner);
            if (!global.db.settings) global.db.settings = {};
            global.db.settings.levelupNotif = enable;
            if (botCtx?.saveRootDb) botCtx.saveRootDb();
            return Reply(
                `\`🎉 𝗟𝗘𝗩𝗘𝗟 𝗨𝗣 𝗡𝗢𝗧𝗜𝗙 (GLOBAL)\`\n` +
                `> sᴛᴀᴛᴜs : ${enable ? '🟢 *AKTIF*' : '🔴 *NONAKTIF*'}\n` +
                `> ɪɴғᴏ : ${enable ? 'Kartu notifikasi naik level otomatis dikirim saat user naik level.' : 'Notifikasi dimatikan (EXP & bonus Money tetap berjalan otomatis di background).'}`
            );
        }

        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!global.db.groups[m.chat]) global.db.groups[m.chat] = {};
        global.db.groups[m.chat].levelupNotif = enable;
        global.db.groups[m.chat].levelupNotifExplicit = true;
        if (botCtx?.saveRootDb) botCtx.saveRootDb();

        return Reply(
            `\`🎉 𝗟𝗘𝗩𝗘𝗟 𝗨𝗣 𝗡𝗢𝗧𝗜𝗙 (GRUP)\`\n` +
            `> sᴛᴀᴛᴜs : ${enable ? '🟢 *AKTIF*' : '🔴 *NONAKTIF*'}\n` +
            `> ɪɴғᴏ : ${enable ? 'Bot akan mengirim kartu gambar naik level saat member di grup ini naik level.' : 'Notifikasi di grup ini dimatikan (EXP & bonus Money tetap jalan otomatis).'}`
        );
    }
};
