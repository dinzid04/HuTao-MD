const stickerly = require('../../services/stickerly');
const richMessage = require('../../services/rich-message');

module.exports = {
    name: 'stikerly',
    category: 'sticker',
    commands: ['stikerly', 'stickerly', 'sly', 'stikerlysearch'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, example, botCtx, checkLimit, addLimit, usedPrefix, sendSelectList } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const query = String(text || '').trim();
        if (!query) {
            return Reply(example('kucing lucu'));
        }

        if (stickerly.normalizeStickerlyUrl(query) && /^https?:\/\//i.test(query)) {
            const dlPlugin = require('./stikerlydl');
            return dlPlugin.execute({ ...ctx, text: query, args: [query] });
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        try {
            const items = await stickerly.searchStickerly(query, 8);
            if (!items || items.length === 0) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Tidak ditemukan pack stiker untuk kata kunci *"${query}"*.`);
            }

            stickerly.saveSearchSession(Dinz, m.chat, m.sender, query, items, m.key?.id || '');

            const identity = botCtx.getBotIdentity(Dinz);
            const botname = identity.botname || global.botname || 'HuTao - MD';
            const htmlPayload = await stickerly.buildStickerlyPreviewHtml({
                query,
                items,
                usedPrefix,
                botname
            });

            let richSent = false;
            try {
                await richMessage.sendRichHtml(Dinz, m, {
                    title: `Sticker.ly: ${query}`,
                    htmlPayload,
                    trustedSources: ['nox.dev', 'stickerly.pstatic.net']
                });
                richSent = true;
            } catch (richErr) {
                console.log('[Stikerly RichPreview fallback]:', richErr?.message || richErr);
            }

            const listLines = items.map((it) => {
                const tag = it.isAnimated ? '🎬 Anim' : '🖼️ Static';
                return `> *${it.index}.* ${it.name} (${tag} • @${it.author})`;
            }).join('\n');

            const captionText =
                `\`⌜ Hasil Pencarian Sticker.ly ⌟\`\n` +
                `> ◦ *Kata Kunci :* ${query}\n` +
                `> ◦ *Ditemukan :* ${items.length} pack${richSent ? ' (Preview HTML di atas ⬆️)' : ''}\n\n` +
                `${listLines}\n\n` +
                `💡 *Cara Download Jadi Sticker Pack:*\n` +
                `• Ketik angkanya langsung (contoh: *1*)\n` +
                `• Atau ketik \`${usedPrefix}stikerlydl 1\`\n` +
                `• Atau pilih lewat tombol daftar di bawah`;

            if (typeof sendSelectList === 'function') {
                const rows = items.map((it) => ({
                    title: `${it.index}. ${it.name.slice(0, 24)}`,
                    description: `${it.isAnimated ? 'Animated' : 'Static'} • @${it.author} • ${it.downloads} DL`,
                    id: `${usedPrefix}stikerlydl ${it.index}`
                }));
                await sendSelectList({
                    title: `Pilih Pack: ${query}`,
                    buttonTitle: '📦 Pilih Sticker Pack',
                    captionText,
                    rows,
                    headerImage: items[0]?.thumbnails?.[0] || undefined
                });
            } else {
                await Reply(captionText);
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mencari di Sticker.ly: ${err.message}`);
        }
        return true;
    }
};
