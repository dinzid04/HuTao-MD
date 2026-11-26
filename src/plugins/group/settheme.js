const chatTheme = require('../../services/chat-theme');
const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'settheme',
    category: 'group',
    commands: ['settheme', 'chattheme', 'settema', 'tema', 'theme', 'setbgchat', 'themecolor'],

    async execute(ctx) {
        const { Dinz, m, args, text, isCreator, Reply, usedPrefix, sendSelectList } = ctx;

        if (m.isGroup && !m.isAdmin && !isCreator) {
            return Reply(global.mess.admin);
        }

        const raw = String(text || '').trim();
        const sub = String(args?.[0] || '').toLowerCase().trim();

        if (!raw || sub === 'list' || sub === 'help') {
            const themeList = chatTheme.CHAT_THEMES.map((t) => `> *${t.index}.* ${t.emoji} ${t.name} (\`${t.id}\`)`).join('\n');
            const captionText =
                `\`⌜ Pengaturan Tema Chat WhatsApp ⌟\`\n` +
                `${themeList}\n\n` +
                `*Cara Pakai:*\n` +
                `> ◦ Preset: \`${usedPrefix}settheme 5\` atau \`${usedPrefix}settheme pink\`\n` +
                `> ◦ Warna Custom: \`${usedPrefix}settheme color #FF0000\`\n` +
                `> ◦ Warna Nama: \`${usedPrefix}settheme color merah doodle\`\n` +
                `> ◦ Light + Dark: \`${usedPrefix}settheme color #F5F7FA #0B1014\`\n` +
                `> ◦ Reset Tema: \`${usedPrefix}settheme reset\``;

            if (typeof sendSelectList === 'function') {
                const rows = [
                    ...chatTheme.CHAT_THEMES.map((t) => ({
                        title: `${t.emoji} ${t.index}. ${t.name}`,
                        description: `Terapkan preset ${t.id}`,
                        id: `${usedPrefix}settheme ${t.id}`
                    })),
                    {
                        title: '🎨 Merah Solid (#E53935)',
                        description: 'Background warna solid merah tanpa doodle',
                        id: `${usedPrefix}settheme color #E53935`
                    },
                    {
                        title: '🌑 Hitam Elegan (#0B1014)',
                        description: 'Background warna solid gelap minimalis',
                        id: `${usedPrefix}settheme color #0B1014`
                    },
                    {
                        title: '♻️ Reset Tema Default',
                        description: 'Kembalikan tema chat ke bawaan WhatsApp',
                        id: `${usedPrefix}settheme reset`
                    }
                ];
                return sendSelectList({
                    title: 'Pilih Tema Chat WhatsApp',
                    buttonTitle: '🎨 Pilih Tema Chat',
                    captionText,
                    rows
                });
            }
            return Reply(captionText);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        try {
            if (['reset', 'clear', 'hapus', 'default'].includes(sub)) {
                await chatTheme.clearChatTheme(Dinz, m.chat);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(formatCard({
                    icon: '♻️',
                    title: 'TEMA CHAT DIRESET',
                    rows: [
                        { label: 'Target', value: m.isGroup ? 'Grup Ini' : 'Chat Ini' },
                        { label: 'Status', value: 'Tema dikembalikan ke bawaan WhatsApp' }
                    ]
                }));
            }

            if (['color', 'warna', 'bg', 'solid'].includes(sub) || raw.startsWith('#') || /^0x[0-9a-f]{6,8}$/i.test(sub)) {
                const colorTokens = ['color', 'warna', 'bg', 'solid'].includes(sub)
                    ? args.slice(1)
                    : args;

                let isDoodleEnabled = false;
                const parsedColors = [];
                for (const tok of colorTokens) {
                    const low = String(tok || '').toLowerCase();
                    if (['doodle', 'motif', 'true', 'on'].includes(low)) {
                        isDoodleEnabled = true;
                        continue;
                    }
                    if (['nodoodle', 'polos', 'false', 'off'].includes(low)) {
                        isDoodleEnabled = false;
                        continue;
                    }
                    const c = chatTheme.parseArgbColor(tok);
                    if (c) parsedColors.push(c);
                }

                if (parsedColors.length === 0) {
                    await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                    return Reply(
                        `❌ Warna tidak valid.\n` +
                        `> ◦ Contoh hex: \`${usedPrefix}settheme color #FF0000\`\n` +
                        `> ◦ Contoh nama: \`${usedPrefix}settheme color merah\`, \`biru\`, \`ungu\`, \`hitam\`, \`navy\`, \`pink\`\n` +
                        `> ◦ Tambah \`doodle\` di akhir jika ingin motif doodle aktif.`
                    );
                }

                const lightCol = parsedColors[0];
                const darkCol = parsedColors[1] || parsedColors[0];

                await chatTheme.setChatThemeColor(Dinz, m.chat, {
                    backgroundLightArgb: lightCol.argb,
                    backgroundDarkArgb: darkCol.argb,
                    isDoodleEnabled
                });

                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(formatCard({
                    icon: '🎨',
                    title: 'WARNA TEMA CHAT DIUBAH',
                    rows: [
                        { label: 'Target', value: m.isGroup ? 'Grup Ini' : 'Chat Ini' },
                        { label: 'Light Mode', value: lightCol.hex },
                        { label: 'Dark Mode', value: darkCol.hex },
                        { label: 'Doodle', value: isDoodleEnabled ? 'Aktif' : 'Polos (Nonaktif)' }
                    ],
                    footer: `Reset tema: ${usedPrefix}settheme reset`
                }));
            }

            const preset = chatTheme.resolveTheme(raw);
            if (!preset) {
                const maybeColor = chatTheme.parseArgbColor(raw);
                if (maybeColor) {
                    await chatTheme.setChatThemeColor(Dinz, m.chat, {
                        backgroundLightArgb: maybeColor.argb,
                        backgroundDarkArgb: maybeColor.argb,
                        isDoodleEnabled: false
                    });
                    await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                    return Reply(formatCard({
                        icon: '🎨',
                        title: 'WARNA TEMA CHAT DIUBAH',
                        rows: [
                            { label: 'Target', value: m.isGroup ? 'Grup Ini' : 'Chat Ini' },
                            { label: 'Warna Solid', value: maybeColor.hex },
                            { label: 'Doodle', value: 'Polos (Nonaktif)' }
                        ]
                    }));
                }

                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Tema *"${raw}"* tidak dikenali.\n> ◦ Ketik \`${usedPrefix}settheme\` untuk melihat daftar 9 preset tema & cara atur warna custom.`);
            }

            await chatTheme.setChatTheme(Dinz, m.chat, preset.id);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(formatCard({
                icon: preset.emoji,
                title: 'TEMA CHAT BERHASIL DIUBAH',
                rows: [
                    { label: 'Target', value: m.isGroup ? 'Grup Ini' : 'Chat Ini' },
                    { label: 'Tema', value: preset.name },
                    { label: 'Scheme ID', value: preset.id }
                ],
                footer: `Warna custom: ${usedPrefix}settheme color #FF0000 • Reset: ${usedPrefix}settheme reset`
            }));
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengubah tema chat: ${err?.message || err}`);
        }
    }
};
