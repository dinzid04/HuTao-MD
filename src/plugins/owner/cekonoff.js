const limitSvc = require('../../services/limit');
const scheduler = require('../../core/scheduler');

module.exports = {
    name: 'cekonoff',
    category: 'owner',
    commands: ['cekonoff', 'statusonoff', 'cekon', 'cekoff', 'statusfitur', 'ceksetting'],

    async execute(ctx) {
        const { Dinz, m, isCreator, Reply, botCtx, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';

        if (!isCreator && !(m.isGroup && m.isAdmin)) {
            return Reply(m.isGroup ? global.mess.admin : global.mess.owner);
        }

        const badge = (v) => (v ? '🟢 ON' : '🔴 OFF');
        const settings = global.db?.settings || {};
        const sections = [];

        if (isCreator) {
            const sewaCfg = botCtx.getSection('sistemsewa', Dinz);
            const sewaOn = Boolean(sewaCfg && sewaCfg.enabled === true && sewaCfg.explicit === true);
            const limitOn = limitSvc.isLimitEnabled();
            const backupCfg = scheduler.getAutoBackupConfig ? scheduler.getAutoBackupConfig() : { enabled: false };
            const disabledCmds = Array.isArray(botCtx.getRootDb()?.settings?.disabledCommands)
                ? botCtx.getRootDb().settings.disabledCommands
                : [];
            const prefixMode = settings.prefixMode === 'single'
                ? `Single (${settings.prefix || '.'})`
                : (settings.prefixMode === 'noprefix' ? 'No Prefix' : 'Multi Prefix');

            const botToggles = [
                ['Mode Public', settings.isPublic !== false, settings.isPublic !== false ? '🟢 PUBLIC' : '🔴 SELF'],
                ['Auto Read', settings.autoread === true],
                ['Auto Typing', settings.autotyping === true],
                ['Auto Read SW', settings.readsw === true],
                ['Audio Menu', settings.audiomenu !== false],
                ['Level Up Notif (Global)', settings.levelupNotif === true],
                ['Sistem Limit', limitOn],
                ['Sistem Sewa Grup', sewaOn],
                ['Auto Backup DB', backupCfg.enabled === true, backupCfg.enabled ? `🟢 ON (${backupCfg.intervalLabel || '6 jam'})` : '🔴 OFF'],
                ['Notif Update SC GitHub', settings.notifUpdate === true]
            ];

            const botOnCount = botToggles.filter((x) => x[1]).length;
            const botLines = botToggles.map(([name, val, custom]) => `> ◦ *${name} :* ${custom || badge(val)}`);
            botLines.push(`> ◦ *Mode Prefix :* \`${prefixMode}\``);
            botLines.push(`> ◦ *Fitur Dimatikan :* ${disabledCmds.length > 0 ? `🔴 ${disabledCmds.length} (${disabledCmds.slice(0, 8).join(', ')}${disabledCmds.length > 8 ? ', ...' : ''})` : '🟢 0 (Semua Aktif)'}`);

            sections.push(
                `\`⚙️ STATUS ON/OFF BOT (${botOnCount}/${botToggles.length} ON)\`\n` +
                botLines.join('\n')
            );
        }

        if (m.isGroup) {
            const g = global.db?.groups?.[m.chat] || {};
            const groupItems = [
                ['Mute Grup', g.mute === true],
                ['Welcome', g.welcome === true],
                ['Left', g.left === true],
                ['Anti Link (Kick)', g.antilink === true],
                ['Anti Link (Hapus)', g.antilink2 === true],
                ['Anti Link WA', g.antilinkWa === true],
                ['Anti Link All', g.antilinkAll === true],
                ['Anti Hidetag', g.antihidetag === true],
                ['Anti Badword', g.antibadword === true],
                ['Anti SWGC (Hapus)', g.antiswgc === true || g.antiswgc === 'delete'],
                ['Anti SWGC (Kick)', g.antiswgc_kick === true || g.antiswgc === 'kick'],
                ['Anti Tag SW (Hapus)', g.antitagsw === true || g.antitagsw === 'delete'],
                ['Anti Tag SW (Kick)', g.antitagswkick === true || g.antitagsw === 'kick'],
                ['Anti Sticker', g.antisticker === true],
                ['Anti Document', g.antidocument === true],
                ['Anti Virtex', g.antivirtex === true],
                ['Anti Spam', g.antispam === true],
                ['Anti Judol', g.antijudol === true],
                ['Anti Phising', g.antiphising === true],
                ['Level Up Notif Grup', g.levelupNotif === true],
                ['Auto Open Grup', g.autoOpen === true, g.autoOpen ? `🟢 ON (${g.autoOpenTime || '06:00'} WIB)` : '🔴 OFF'],
                ['Auto Close Grup', g.autoClose === true, g.autoClose ? `🟢 ON (${g.autoCloseTime || '00:00'} WIB)` : '🔴 OFF'],
                ['Slowmode', Number(g.slowmode) > 0, Number(g.slowmode) > 0 ? `🟢 ON (${g.slowmode} detik)` : '🔴 OFF']
            ];

            const activeList = groupItems.filter((x) => x[1]);
            const inactiveList = groupItems.filter((x) => !x[1]);

            const groupName = m.metadata?.subject || 'Grup Ini';
            const grpLines = [
                `\`👥 STATUS ON/OFF GRUP (${activeList.length}/${groupItems.length} ON)\``,
                `> ◦ *Grup :* ${groupName}`
            ];

            if (activeList.length > 0) {
                grpLines.push('', '*🟢 Sedang Aktif (ON):*');
                for (const [name, , custom] of activeList) {
                    grpLines.push(`> • ${name} : ${custom || '🟢 ON'}`);
                }
            } else {
                grpLines.push('', '*🟢 Sedang Aktif (ON):*\n> • _(tidak ada yang aktif)_');
            }

            if (inactiveList.length > 0) {
                grpLines.push('', '*🔴 Nonaktif (OFF):*');
                grpLines.push(`> ${inactiveList.map(([name]) => name).join(' • ')}`);
            }

            sections.push(grpLines.join('\n'));
        }

        const tips = isCreator
            ? `\n\n💡 *Kontrol Cepat:*\n> ◦ Grup: \`${pfx}on <fitur>\` / \`${pfx}off <fitur>\`\n> ◦ Bot: \`${pfx}autoread on/off\`, \`${pfx}notifupdate on/off\`, \`${pfx}setlimit on/off\`, \`${pfx}sistemsewa on/off\`, \`${pfx}autobackup on/off\`, \`${pfx}togglefitur <cmd>\``
            : `\n\n💡 *Kontrol Grup:* ketik \`${pfx}on <fitur>\` atau \`${pfx}off <fitur>\``;

        return Reply(`${sections.join('\n\n')}${tips}`);
    }
};
