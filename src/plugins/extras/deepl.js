const { formatCard, loadScraper, getQuotedText } = require('./_helper');

module.exports = {
    name: 'deepl',
    category: 'extras',
    commands: ['deepl', 'dltr', 'terjemah'],

    async execute(ctx) {
        const { Dinz, m, command, args, text, body, Reply, usedPrefix } = ctx;
        const pref = usedPrefix || '';

        const targetLang = (args[0] || '').toLowerCase();
        const inputText = args.slice(1).join(' ').trim() || getQuotedText(m);

        if (!targetLang || !inputText) {
            return Reply(
                formatCard({
                    icon: '🌐',
                    title: 'DEEPL TRANSLATE',
                    rows: [
                        { label: 'Format', value: `\`${pref}${command} <kode_bahasa> <teks>\`` },
                        { label: 'Atau', value: `Reply pesan dengan \`${pref}${command} <kode_bahasa>\`` },
                        { label: 'Kode Populer', value: '`id` (Indo), `en` (Inggris), `ja` (Jepang), `ko` (Korea), `zh` (Mandarin), `ar` (Arab), `fr`, `de`, `es`' }
                    ],
                    footer: `Contoh: ${pref}${command} en Selamat malam semuanya`
                })
            );
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🌐', key: m.key } }).catch(() => {});
        try {
            const deepl = await loadScraper('deepl.mjs');
            const res = await deepl.translate(inputText, { to: targetLang });
            if (!res?.text) return Reply('❌ Gagal menerjemahkan teks.');

            const caption = formatCard({
                icon: '🌐',
                title: 'DEEPL TRANSLATE',
                rows: [
                    { label: 'Bahasa', value: `\`${String(res.source_lang || 'auto').toUpperCase()}\` ➜ \`${String(res.target_lang || targetLang).toUpperCase()}\`` }
                ],
                body: `*Hasil Terjemahan:*\n${res.text}`,
                footer: `Powered by DeepL Engine`
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ Gagal DeepL Translate: ${e.message}`);
        }
        return true;
    }
};
