module.exports = {
    name: 'setleft',
    category: 'group',
    commands: ['setleft'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, uploadToCDN, moment, botCtx } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        const leftDB = botCtx.getSection('left', Dinz) || {};

        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';
        const isImage = /image/.test(mime);

        if (isImage) {
            try {
                Reply(global.mess.wait);
                const buffer = await q.download();
                const cdnUrl = await uploadToCDN(buffer, mime);
                if (!cdnUrl) return Reply(`❌ Gagal mengunggah foto ke CDN.`);

                if (!leftDB[m.chat]) leftDB[m.chat] = {};
                leftDB[m.chat].leftImage = cdnUrl;

                if (text) {
                    leftDB[m.chat].leftText = text;
                }
                botCtx.setSection('left', leftDB, Dinz);

                return Reply(`\`⌜ Left Settings ⌟\`\n> ◦ Status : *Berhasil*\n> ◦ URL : *${cdnUrl}*\n> ◦ Info : *Foto left berhasil disimpan ke CDN*`);
            } catch (e) {
                return Reply(`❌ Gagal mengunggah foto left: ${e.message}`);
            }
        }

        if (text && (text.toLowerCase() === 'reset' || text.toLowerCase() === 'delete')) {
            if (leftDB[m.chat]?.leftImage) {
                delete leftDB[m.chat].leftImage;
                botCtx.setSection('left', leftDB, Dinz);
                return Reply(`\`⌜ Left Settings ⌟\`\n> ◦ Status : *Berhasil*\n> ◦ Info : *Foto left berhasil di-reset ke default*`);
            } else {
                return Reply(`⚠️ Grup ini tidak memiliki foto left kustom.`);
            }
        }

        if (!text) {
            return Reply(`*Contoh Penggunaan*\nsetleft text (sambil reply foto jika mau ganti foto left)\n\n*Berikut Variabel yang tersedia*\n- @user\n> tag user\n- @group\n> nama grup\n- @totalmember\n> total member grup\n- @datenow\n> hari, tanggal, jam (WIB)`);
        }

        if (!leftDB[m.chat]) leftDB[m.chat] = {};
        leftDB[m.chat].leftText = text;

        botCtx.setSection('left', leftDB, Dinz);
        const previewDate = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY HH:mm:ss [WIB]');
        const previewText = text
            .replace(/@user/g, `@${m.sender.split('@')[0]}`)
            .replace(/@group/g, m.metadata?.subject || 'Nama Grup')
            .replace(/@totalmember/g, m.metadata?.participants?.length || 0)
            .replace(/@datenow/g, previewDate);

        Reply(`\`⌜ Left Settings ⌟\`\n> ◦ Status : *Berhasil*\n> ◦ Info : *Teks left berhasil disimpan*`);
        return true;
    }
};
