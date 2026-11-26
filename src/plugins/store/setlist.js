module.exports = {
    name: 'setlist',
    category: 'store',
    commands: ['setlist'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, loadListSettings, saveListSettings, downloadAndSaveMedia } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        let currentPrefix = '';
        if (!text) {
            return Reply(
        `\`⌜ Variabel Tersedia ⌟\`
> ◦ @name - Nama user
> ◦ @group - Nama grup
> ◦ @time - Waktu
> ◦ @date - Tanggal
> ◦ @fulldate - Full tanggal
> ◦ @daytime - Waktu hari
> ◦ @x - List keyword
> ◦ @prefix teks - Ganti format item

📌 *Contoh Penggunaan:*

${currentPrefix}setlist \`⌜ List Produk @group ⌟\`
> ◦ Customer : @name
> ◦ Waktu : @time
> ◦ Tanggal : @date

\`⌜ List Produk ⌟\`
> ◦ @x
@prefix > ◦`
            )
        }

        const settings = loadListSettings();
        if (!settings[m.chat]) settings[m.chat] = {};

        const prefixMatch = text.match(/@prefix\s+([^\n]+)/i);
        if (prefixMatch && prefixMatch[1]) {
            settings[m.chat].prefix = prefixMatch[1].trim();
        } else {
            delete settings[m.chat].prefix;
        }

        settings[m.chat].template = text;

        if (m.type === 'imageMessage') {
            try {
                const media = await downloadAndSaveMedia(m, 'image');
                settings[m.chat].media = media;
                settings[m.chat].mediaType = 'image';
            } catch (e) {}
        } else if (m.quoted && m.quoted.type === 'imageMessage') {
            try {
                const media = await downloadAndSaveMedia(m.quoted, 'image');
                settings[m.chat].media = media;
                settings[m.chat].mediaType = 'image';
            } catch (e) {}
        } else {
            delete settings[m.chat].media;
            delete settings[m.chat].mediaType;
        }

        saveListSettings(settings);
        Reply(`\`⌜ List Settings ⌟\`\n> ◦ Status : *Berhasil*\n> ◦ Info : *Template list berhasil disimpan*`);
        return true;
    }
};
