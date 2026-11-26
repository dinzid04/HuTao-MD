module.exports = {
    name: 'setwelcome',
    category: 'group',
    commands: ['setwelcome'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, uploadToCDN, moment, botCtx } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        const welcomeDB = botCtx.getSection('welcome', Dinz) || {};

        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';
        const isImage = /image/.test(mime);

        if (isImage) {
            try {
                Reply(global.mess.wait);
                const buffer = await q.download();
                const cdnUrl = await uploadToCDN(buffer, mime);
                if (!cdnUrl) return Reply(`❌ Gagal mengunggah foto ke CDN.`);

                if (!welcomeDB[m.chat]) welcomeDB[m.chat] = {};
                welcomeDB[m.chat].welcomeImage = cdnUrl;

                if (text) {
                    welcomeDB[m.chat].welcomeText = text;
                }
                botCtx.setSection('welcome', welcomeDB, Dinz);

                return Reply(`\`⌜ Welcome Settings ⌟\`\n> ◦ Status : *Berhasil*\n> ◦ URL : *${cdnUrl}*\n> ◦ Info : *Foto welcome berhasil disimpan ke CDN*`);
            } catch (e) {
                return Reply(`❌ Gagal mengunggah foto welcome: ${e.message}`);
            }
        }

        if (text && (text.toLowerCase() === 'reset' || text.toLowerCase() === 'delete')) {
            if (welcomeDB[m.chat]?.welcomeImage) {
                delete welcomeDB[m.chat].welcomeImage;
                botCtx.setSection('welcome', welcomeDB, Dinz);
                return Reply(`\`⌜ Welcome Settings ⌟\`\n> ◦ Status : *Berhasil*\n> ◦ Info : *Foto welcome berhasil di-reset ke default*`);
            } else {
                return Reply(`⚠️ Grup ini tidak memiliki foto welcome kustom.`);
            }
        }

        if (!text) {
            return Reply(`*Contoh Penggunaan*\nsetwelcome text (sambil reply foto jika mau ganti foto welcome)\n\n*Berikut Variabel yang tersedia*\n- @user\n> tag user\n- @group\n> nama grup\n- @totalmember\n> total member grup\n- @datenow\n> hari, tanggal, jam (WIB)`);
        }

        if (!welcomeDB[m.chat]) welcomeDB[m.chat] = {};
        welcomeDB[m.chat].welcomeText = text;

        botCtx.setSection('welcome', welcomeDB, Dinz);
        const previewDate = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY HH:mm:ss [WIB]');
        const previewText = text
            .replace(/@user/g, `@${m.sender.split('@')[0]}`)
            .replace(/@group/g, m.metadata?.subject || 'Nama Grup')
            .replace(/@totalmember/g, m.metadata?.participants?.length || 0)
            .replace(/@datenow/g, previewDate);

        Reply(`\`⌜ Welcome Settings ⌟\`\n> ◦ Status : *Berhasil*\n> ◦ Info : *Teks welcome berhasil disimpan*`);
        return true;
    }
};
