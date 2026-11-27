const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

const GUARD_CATEGORIES = [
    {
        id: 'antilink',
        title: '🔗 ANTI LINK',
        items: [
            { key: 'antilink', cmd: 'antilink', name: 'Anti Link (Kick)', desc: 'Hapus link grup lain & kick pengirim' },
            { key: 'antilink2', cmd: 'antilink2', name: 'Anti Link (Hapus)', desc: 'Hapus link grup lain tanpa kick' },
            { key: 'antilinkWa', cmd: 'antilinkwa', name: 'Anti Link WA', desc: 'Hapus link wa.me / wa.link' },
            { key: 'antilinkAll', cmd: 'antilinkall', name: 'Anti Link All', desc: 'Hapus semua tautan http/https' }
        ]
    },
    {
        id: 'antigangguan',
        title: '🛡️ ANTI GANGGUAN & KONTEN',
        items: [
            { key: 'antispam', cmd: 'antispam', name: 'Anti Spam', desc: 'Hapus pesan spam cepat (>=6 pesan/5d)' },
            { key: 'antivirtex', cmd: 'antivirtex', name: 'Anti Virtex', desc: 'Hapus pesan terlalu panjang / bug teks' },
            { key: 'antisticker', cmd: 'antisticker', name: 'Anti Sticker', desc: 'Hapus semua stiker dari member' },
            { key: 'antidocument', cmd: 'antidocument', name: 'Anti Document', desc: 'Hapus file dokumen dari member' },
            { key: 'antihidetag', cmd: 'antihidetag', name: 'Anti Hidetag', desc: 'Hapus pesan tag massal (>10 mention)' },
            { key: 'antibadword', cmd: 'antibadword', name: 'Anti Badword', desc: 'Hapus pesan yang mengandung kata kasar' }
        ]
    },
    {
        id: 'antistatus',
        title: '🚨 ANTI STATUS & PENIPUAN',
        items: [
            { key: 'antiswgc', cmd: 'antiswgc', name: 'Anti SWGC (Hapus)', desc: 'Hapus story/status WA yang diteruskan ke grup' },
            { key: 'antiswgc_kick', cmd: 'antiswgckick', name: 'Anti SWGC (Kick)', desc: 'Hapus story/status WA & kick pengirim' },
            { key: 'antitagsw', cmd: 'antitagsw', name: 'Anti Tag SW (Hapus)', desc: 'Hapus mention grup dari Status WA' },
            { key: 'antitagswkick', cmd: 'antitagswkick', name: 'Anti Tag SW (Kick)', desc: 'Hapus mention Status WA & kick pengirim' },
            { key: 'antijudol', cmd: 'antijudol', name: 'Anti Judol', desc: 'Hapus promosi judi online / slot gacor' },
            { key: 'antiphising', cmd: 'antiphising', name: 'Anti Phising', desc: 'Hapus link phising / dana kaget palsu' }
        ]
    },
    {
        id: 'sambutan',
        title: '👥 SAMBUTAN & KONTROL GRUP',
        items: [
            { key: 'welcome', cmd: 'welcome', name: 'Welcome Message', desc: 'Sapa otomatis member baru yang masuk' },
            { key: 'left', cmd: 'left', name: 'Left Message', desc: 'Pesan perpisahan saat member keluar' },
            { key: 'levelupNotif', cmd: 'levelupgrup', name: 'Level Up Notif Grup', desc: 'Notifikasi naik level RPG di grup ini' },
            { key: 'mute', cmd: 'mutegrup', name: 'Mute Grup', desc: 'Bisukan bot dari non-owner di grup ini' }
        ]
    }
];

const FLAT_ITEMS = GUARD_CATEGORIES.flatMap((c) => c.items);
const CMD_TO_ITEM = {};
for (const item of FLAT_ITEMS) {
    CMD_TO_ITEM[item.cmd] = item;
    CMD_TO_ITEM[item.key.toLowerCase()] = item;
}
CMD_TO_ITEM['antitoxic'] = CMD_TO_ITEM['antibadword'];
CMD_TO_ITEM['antilik'] = CMD_TO_ITEM['antilink'];

function isFlagActive(group, key) {
    if (!group) return false;
    if (key === 'antiswgc') return group.antiswgc === true || group.antiswgc === 'delete';
    if (key === 'antiswgc_kick') return group.antiswgc_kick === true || group.antiswgc === 'kick';
    if (key === 'antitagsw') return group.antitagsw === true || group.antitagsw === 'delete';
    if (key === 'antitagswkick') return group.antitagswkick === true || group.antitagsw === 'kick';
    return group[key] === true;
}

function setFlagValue(group, key, enabled) {
    group[key] = Boolean(enabled);
    if (key === 'levelupNotif') {
        group.levelupNotifExplicit = true;
    }
}

async function sendGuardInteractivePanel({ Dinz, m, group, pfx, botname, Reply }) {
    const groupName = m.metadata?.subject || 'Grup Ini';
    const totalCount = FLAT_ITEMS.length;
    const activeCount = FLAT_ITEMS.filter((it) => isFlagActive(group, it.key)).length;

    const summaryBlocks = GUARD_CATEGORIES.map((cat) => {
        const rows = cat.items.map((it) => {
            const on = isFlagActive(group, it.key);
            return `> ◦ ${on ? '🟢' : '🔴'} *${it.name}* (\`${pfx}${it.cmd}\`)`;
        }).join('\n');
        return `*${cat.title}*\n${rows}`;
    }).join('\n\n');

    const extraInfo = [
        `> ◦ *Slowmode :* ${Number(group.slowmode) > 0 ? `🟢 ${group.slowmode} detik` : '🔴 OFF'} (\`${pfx}slowmode\`)`,
        `> ◦ *Auto Open :* ${group.autoOpen ? `🟢 ${group.autoOpenTime || '06:00'} WIB` : '🔴 OFF'} (\`${pfx}setopen\`)`,
        `> ◦ *Auto Close :* ${group.autoClose ? `🟢 ${group.autoCloseTime || '00:00'} WIB` : '🔴 OFF'} (\`${pfx}setclose\`)`
    ].join('\n');

    const bodyText =
        `\`🛡️ PANEL JAGA GRUP (${activeCount}/${totalCount} ON)\`\n` +
        `> ◦ *Grup :* ${groupName}\n` +
        `> ◦ *Info :* Tap tombol dropdown di bawah untuk langsung ON/OFF fitur per kategori, atau ketik langsung perintahnya (contoh: \`${pfx}antilink on\`).\n\n` +
        `${summaryBlocks}\n\n` +
        `*⏰ JADWAL & BATAS PESAN*\n${extraInfo}`;

    const sections = GUARD_CATEGORIES.map((cat) => ({
        title: cat.title,
        rows: cat.items.map((it) => {
            const on = isFlagActive(group, it.key);
            const nextAction = on ? 'off' : 'on';
            return {
                title: `${on ? '🟢' : '🔴'} ${it.name}`,
                description: `[${on ? 'AKTIF -> Tap Matikan' : 'OFF -> Tap Aktifkan'}] ${it.desc}`,
                id: `${pfx}${it.cmd} ${nextAction}`
            };
        })
    }));

    try {
        const msg = await generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: `🛡️ Panel Jaga Grup • ${botname}` }),
                        header: proto.Message.InteractiveMessage.Header.create({ title: '', hasMediaAttachment: false }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: [
                                {
                                    name: 'single_select',
                                    buttonParamsJson: JSON.stringify({
                                        title: '🛡️ Pilih Fitur Jaga Grup',
                                        sections
                                    })
                                },
                                {
                                    name: 'quick_reply',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: '📊 Cek Semua ON/OFF',
                                        id: `${pfx}cekonoff`
                                    })
                                },
                                {
                                    name: 'quick_reply',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: '🔄 Refresh Panel',
                                        id: `${pfx}jagagrup`
                                    })
                                }
                            ]
                        })
                    })
                }
            }
        }, { quoted: m });

        await Dinz.relayMessage(m.chat, msg.message, { messageId: msg.key.id, AI: false });
        return true;
    } catch (err) {
        console.log('[JagaGrup Interactive Fallback]:', err?.message || err);
        await Reply(bodyText);
        return true;
    }
}

module.exports = {
    name: 'jagagrup',
    category: 'group',
    commands: [
        'jagagrup', 'panelgrup', 'pengamanangrup', 'antipanel', 'settinggrup', 'fiturgrup',
        'antilink', 'antilink2', 'antilinkwa', 'antilinkall',
        'antihidetag', 'antibadword', 'antitoxic',
        'antiswgc', 'antiswgckick', 'antitagsw', 'antitagswkick',
        'antisticker', 'antidocument', 'antivirtex', 'antispam',
        'antijudol', 'antiphising', 'welcome', 'left', 'levelupgrup', 'mutegrup'
    ],
    GUARD_CATEGORIES,
    isFlagActive,

    async execute(ctx) {
        const { Dinz, m, command, args, isCreator, Reply, usedPrefix, botCtx } = ctx;
        const pfx = usedPrefix || '.';

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        if (!global.db.groups) global.db.groups = {};
        if (!global.db.groups[m.chat]) global.db.groups[m.chat] = {};
        const group = global.db.groups[m.chat];
        const cmd = String(command || '').toLowerCase();
        const identity = botCtx?.getBotIdentity ? botCtx.getBotIdentity(Dinz) : {};
        const botname = identity.botname || global.botname || 'HuTao - MD';

        // Panel interaktif utama
        if (['jagagrup', 'panelgrup', 'pengamanangrup', 'antipanel', 'settinggrup', 'fiturgrup'].includes(cmd)) {
            return sendGuardInteractivePanel({ Dinz, m, group, pfx, botname, Reply });
        }

        // Direct toggle command (misal: .antilink on / .antilink off / .antilink)
        const item = CMD_TO_ITEM[cmd];
        if (!item) return sendGuardInteractivePanel({ Dinz, m, group, pfx, botname, Reply });

        const sub = String(args[0] || '').trim().toLowerCase();
        const curState = isFlagActive(group, item.key);
        let nextState = !curState;

        if (['on', 'aktif', 'enable', '1', 'nyala'].includes(sub)) {
            nextState = true;
        } else if (['off', 'nonaktif', 'disable', '0', 'mati'].includes(sub)) {
            nextState = false;
        } else if (sub === 'status' || sub === 'cek') {
            return Reply(
                `\`🛡️ STATUS ${item.name.toUpperCase()}\`\n` +
                `> ◦ *Status :* ${curState ? '🟢 AKTIF (ON)' : '🔴 NONAKTIF (OFF)'}\n` +
                `> ◦ *Fungsi :* ${item.desc}\n` +
                `> ◦ *Ubah :* \`${pfx}${item.cmd} ${curState ? 'off' : 'on'}\` atau buka \`${pfx}jagagrup\``
            );
        }

        setFlagValue(group, item.key, nextState);

        const botAdminWarn = (!m.isBotAdmin && item.key !== 'welcome' && item.key !== 'left' && item.key !== 'levelupNotif' && item.key !== 'mute' && nextState)
            ? `\n\n⚠️ *Catatan:* Jadikan bot sebagai *Admin Grup* agar fitur *${item.name}* bisa menghapus pesan / mengeluarkan pelanggar!`
            : '';

        return Reply(
            `\`🛡️ JAGA GRUP DIPERBARUI\`\n` +
            `> ◦ *Fitur :* ${item.name}\n` +
            `> ◦ *Status :* ${nextState ? '🟢 AKTIF (ON)' : '🔴 NONAKTIF (OFF)'}\n` +
            `> ◦ *Fungsi :* ${item.desc}\n` +
            `> ◦ *Panel Lengkap :* ketik \`${pfx}jagagrup\`${botAdminWarn}`
        );
    }
};
