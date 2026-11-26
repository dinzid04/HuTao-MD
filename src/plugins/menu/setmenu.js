const { formatCard, toMono, toBoldSans, toSmallCaps } = require('../../utils/formatter');

module.exports = {
    name: 'setmenu',
    category: 'menu',
    commands: ['setmenu', 'setmenutype', 'setallmenu', 'menustyle', 'cekmenu'],

    async execute(ctx) {
        const {
            Dinz, m, command, text, body, isCreator, Reply, sendSelectList, botCtx, prefixMgr,
            usedPrefix, menuRenderer
        } = ctx;

        const styles = menuRenderer.MENU_STYLES;
        const currentId = menuRenderer.getMenuStyle(global.db?.settings);
        const currentInfo = menuRenderer.getStyleInfo(currentId);
        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : usedPrefix;

        if (command === 'cekmenu' || !text || !text.trim()) {
            const listText = styles.map((s) =>
                `${s.id === currentId ? '✅' : '◦'} ${toBoldSans(`${s.id}. ${s.name}`)} (${toMono(s.key)})\n   _${toSmallCaps(s.desc)}_`
            ).join('\n');

            const caption = formatCard({
                icon: '🎨',
                title: 'PENGATURAN TAMPILAN MENU',
                rows: [
                    { label: 'Style Aktif', value: `${toMono(currentInfo.id)} (${toBoldSans(currentInfo.name)})` },
                    { label: 'Berlaku Untuk', value: 'menu, listmenu, allmenu & semua kategori' }
                ],
                body: listText,
                footer: `Ketik ${pfx}setmenu 1 sampai ${pfx}setmenu ${styles.length} atau pilih lewat tombol`
            });

            if (isCreator && typeof sendSelectList === 'function') {
                await sendSelectList({
                    title: toSmallCaps('pilih tampilan menu'),
                    buttonTitle: `🎨 ${toSmallCaps('Pilih Style Menu')}`,
                    captionText: caption,
                    rows: styles.map((s) => ({
                        title: `${s.id === currentId ? '✅ ' : ''}${s.id}. ${toSmallCaps(s.name)}`,
                        description: toSmallCaps(s.desc),
                        id: `${pfx}setmenu ${s.id}`
                    }))
                });
            } else {
                await Reply(caption);
            }
            return true;
        }

        if (!isCreator) return Reply(global.mess.owner);

        const resolvedId = menuRenderer.resolveStyleInput(text.trim());
        if (!resolvedId) {
            return Reply(formatCard({
                icon: '❌',
                title: 'STYLE MENU TIDAK DIKENAL',
                rows: [
                    { label: 'Input', value: toMono(text.trim()) },
                    { label: 'Pilihan', value: `${toMono(1)} sampai ${toMono(styles.length)}` }
                ],
                body: styles.map((s) => `◦ ${toMono(`${pfx}setmenu ${s.id}`)} (${s.name})`).join('\n')
            }));
        }

        if (!global.db.settings) global.db.settings = {};
        global.db.settings.menuStyle = resolvedId;
        botCtx.saveRootDb();

        const nextInfo = menuRenderer.getStyleInfo(resolvedId);
        await Dinz.sendMessage(m.chat, { react: { text: '🎨', key: m.key } }).catch(() => {});
        return Reply(formatCard({
            icon: '🎨',
            title: 'TAMPILAN MENU DIUBAH',
            rows: [
                { label: 'Style Baru', value: `${toMono(nextInfo.id)} • ${toBoldSans(nextInfo.name)}` },
                { label: 'Kode', value: toMono(nextInfo.key) },
                { label: 'Keterangan', value: nextInfo.desc }
            ],
            footer: `Coba ketik ${pfx}menu atau ${pfx}allmenu untuk melihat hasilnya`
        }));
    }
};
