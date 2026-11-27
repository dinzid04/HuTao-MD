const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const limitSvc = require('../../services/limit');
const scheduler = require('../../core/scheduler');
const jagaGrup = require('../group/jagagrup');
const customReactSvc = require('../../services/custom-react');

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
        const botButtonsRows = [];
        const groupDropdownSections = [];

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
                { name: 'Mode Public', val: settings.isPublic !== false, custom: settings.isPublic !== false ? '🟢 PUBLIC' : '🔴 SELF', toggleCmd: settings.isPublic !== false ? `${pfx}self` : `${pfx}public` },
                { name: 'Auto Read', val: settings.autoread === true, toggleCmd: `${pfx}autoread ${settings.autoread === true ? 'off' : 'on'}` },
                { name: 'Auto Typing', val: settings.autotyping === true, toggleCmd: `${pfx}autotyping ${settings.autotyping === true ? 'off' : 'on'}` },
                { name: 'Auto Read SW', val: settings.readsw === true, toggleCmd: `${pfx}readsw ${settings.readsw === true ? 'off' : 'on'}` },
                { name: 'Audio Menu', val: settings.audiomenu !== false, toggleCmd: `${pfx}setaudiomenu ${settings.audiomenu !== false ? 'off' : 'on'}` },
                { name: 'Level Up Notif (Global)', val: settings.levelupNotif === true, toggleCmd: `${pfx}levelupnotif ${settings.levelupNotif === true ? 'off' : 'on'}` },
                { name: 'Sistem Limit', val: limitOn, toggleCmd: `${pfx}setlimit ${limitOn ? 'off' : 'on'}` },
                { name: 'Sistem Sewa Grup', val: sewaOn, toggleCmd: `${pfx}sistemsewa ${sewaOn ? 'off' : 'on'}` },
                { name: 'Auto Backup DB', val: backupCfg.enabled === true, custom: backupCfg.enabled ? `🟢 ON (${backupCfg.intervalLabel || '6 jam'})` : '🔴 OFF', toggleCmd: `${pfx}autobackup ${backupCfg.enabled ? 'off' : 'on'}` },
                { name: 'Notif Update SC GitHub', val: settings.notifUpdate === true, toggleCmd: `${pfx}notifupdate ${settings.notifUpdate === true ? 'off' : 'on'}` },
                { name: 'Anti Delete Pesan', val: settings.antidelete === true, toggleCmd: `${pfx}antidelete ${settings.antidelete === true ? 'off' : 'on'}` },
                {
                    name: 'Anti Call (Suara & Video)',
                    val: Boolean(settings.anticall && settings.anticall !== 'off'),
                    custom: settings.anticall === 'block' ? '🟢 ON (Tolak + Blokir)' : (settings.anticall ? '🟢 ON (Tolak Otomatis)' : '🔴 OFF'),
                    toggleCmd: `${pfx}anticall ${settings.anticall ? 'off' : 'on'}`
                },
                { name: 'Auto Bio Uptime', val: settings.autobio === true, toggleCmd: `${pfx}autobio ${settings.autobio === true ? 'off' : 'on'}` },
                {
                    name: 'Auto React SW',
                    val: Boolean(settings.autoreactsw),
                    custom: settings.autoreactsw ? `🟢 ON (${typeof settings.autoreactsw === 'string' ? settings.autoreactsw : '❤️'})` : '🔴 OFF',
                    toggleCmd: `${pfx}autoreactsw ${settings.autoreactsw ? 'off' : 'on'}`
                },
                (() => {
                    const cr = customReactSvc.getConfig(Dinz);
                    const ruleCnt = Object.keys(cr.rules || {}).length;
                    return { name: 'Custom Auto-React', val: cr.enabled === true, custom: cr.enabled ? `🟢 ON (${ruleCnt} cmd)` : `🔴 OFF (${ruleCnt} cmd)`, toggleCmd: `${pfx}customreact ${cr.enabled ? 'off' : 'on'}` };
                })()
            ];

            const botOnCount = botToggles.filter((x) => x.val).length;
            const botLines = botToggles.map((item) => `> ◦ *${item.name} :* ${item.custom || badge(item.val)}`);
            botLines.push(`> ◦ *Mode Prefix :* \`${prefixMode}\``);
            botLines.push(`> ◦ *Fitur Dimatikan :* ${disabledCmds.length > 0 ? `🔴 ${disabledCmds.length} (${disabledCmds.slice(0, 8).join(', ')}${disabledCmds.length > 8 ? ', ...' : ''})` : '🟢 0 (Semua Aktif)'}`);

            sections.push(
                `\`⚙️ STATUS ON/OFF BOT (${botOnCount}/${botToggles.length} ON)\`\n` +
                botLines.join('\n')
            );

            for (const item of botToggles) {
                botButtonsRows.push({
                    title: `${item.val ? '🟢' : '🔴'} ${item.name}`,
                    description: `Tap untuk ubah (${item.toggleCmd})`,
                    id: item.toggleCmd
                });
            }
        }

        if (m.isGroup) {
            const g = global.db?.groups?.[m.chat] || {};
            const groupName = m.metadata?.subject || 'Grup Ini';
            const catList = jagaGrup.GUARD_CATEGORIES || [];
            let onTotal = 0;
            let allTotal = 0;

            const grpCatTexts = [];
            for (const cat of catList) {
                const lines = [];
                const rows = [];
                for (const it of cat.items) {
                    const active = jagaGrup.isFlagActive(g, it.key);
                    allTotal++;
                    if (active) onTotal++;
                    lines.push(`> ◦ ${active ? '🟢' : '🔴'} ${it.name} (\`${pfx}${it.cmd}\`)`);
                    rows.push({
                        title: `${active ? '🟢' : '🔴'} ${it.name}`,
                        description: `[${active ? 'ON -> Tap Matikan' : 'OFF -> Tap Aktifkan'}] ${it.desc}`,
                        id: `${pfx}${it.cmd} ${active ? 'off' : 'on'}`
                    });
                }
                grpCatTexts.push(`*${cat.title}*\n${lines.join('\n')}`);
                groupDropdownSections.push({ title: cat.title, rows });
            }

            const extraItems = [
                ['Auto Open Grup', g.autoOpen === true, g.autoOpen ? `🟢 ON (${g.autoOpenTime || '06:00'} WIB)` : '🔴 OFF'],
                ['Auto Close Grup', g.autoClose === true, g.autoClose ? `🟢 ON (${g.autoCloseTime || '00:00'} WIB)` : '🔴 OFF'],
                ['Slowmode', Number(g.slowmode) > 0, Number(g.slowmode) > 0 ? `🟢 ON (${g.slowmode} detik)` : '🔴 OFF']
            ];
            for (const [, val] of extraItems) {
                allTotal++;
                if (val) onTotal++;
            }
            grpCatTexts.push(
                `*⏰ JADWAL & SLOWMODE*\n` +
                extraItems.map(([n, , c]) => `> ◦ ${c} — ${n}`).join('\n')
            );

            sections.push(
                `\`🛡️ STATUS JAGA GRUP (${onTotal}/${allTotal} ON)\`\n` +
                `> ◦ *Grup :* ${groupName}\n\n` +
                grpCatTexts.join('\n\n')
            );
        }

        const tips = isCreator
            ? `\n\n💡 *Kontrol Cepat:* Tap tombol dropdown di bawah untuk langsung ubah ON/OFF, atau ketik \`${pfx}jagagrup\` untuk panel khusus grup.`
            : `\n\n💡 *Kontrol Cepat:* Tap tombol dropdown di bawah atau ketik \`${pfx}jagagrup\`.`;

        const fullText = `${sections.join('\n\n')}${tips}`;

        const buttons = [];
        if (m.isGroup && groupDropdownSections.length > 0) {
            buttons.push({
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: '🛡️ Atur Jaga Grup',
                    sections: groupDropdownSections
                })
            });
        }
        if (isCreator && botButtonsRows.length > 0) {
            buttons.push({
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: '⚙️ Atur ON/OFF Bot',
                    sections: [{ title: 'Pengaturan Global Bot', rows: botButtonsRows }]
                })
            });
        }
        if (m.isGroup) {
            buttons.push({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '🛡️ Panel Jaga Grup',
                    id: `${pfx}jagagrup`
                })
            });
        }

        if (buttons.length > 0) {
            try {
                const identity = botCtx?.getBotIdentity ? botCtx.getBotIdentity(Dinz) : {};
                const botname = identity.botname || global.botname || 'HuTao - MD';
                const msg = await generateWAMessageFromContent(m.chat, {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                            interactiveMessage: proto.Message.InteractiveMessage.create({
                                body: proto.Message.InteractiveMessage.Body.create({ text: fullText }),
                                footer: proto.Message.InteractiveMessage.Footer.create({ text: `⚙️ Kontrol Status ON/OFF • ${botname}` }),
                                header: proto.Message.InteractiveMessage.Header.create({ title: '', hasMediaAttachment: false }),
                                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons })
                            })
                        }
                    }
                }, { quoted: m });
                await Dinz.relayMessage(m.chat, msg.message, { messageId: msg.key.id, AI: false });
                return true;
            } catch (_) {}
        }

        return Reply(fullText);
    }
};
