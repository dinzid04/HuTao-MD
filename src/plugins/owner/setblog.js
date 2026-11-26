const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'setblog',
    category: 'owner',
    commands: ['setblog', 'setownerbio', 'setbioowner'],

    async execute(ctx) {
        const { Dinz, m, args, text, quoted, mime, qmsg, isCreator, Reply, botCtx, uploadToCDN, usedPrefix } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const cur = botCtx.getSection('owner_blog', Dinz) || {};
        const sub = (args[0] || '').toLowerCase();
        const val = args.slice(1).join(' ').trim();

        if (!sub || sub === 'cek' || sub === 'status') {
            return Reply(formatCard({
                icon: '🪪',
                title: 'PENGATURAN BLOG HTML OWNER',
                rows: [
                    { label: 'Slogan / Bio', value: cur.slogan || 'Building smart WhatsApp automation & digital tools.' },
                    { label: 'WhatsApp', value: cur.wa || global.owner || '-' },
                    { label: 'Instagram', value: cur.ig || '-' },
                    { label: 'Email', value: cur.email || global.cpanelEmail?.defaultEmail || '-' },
                    { label: 'Foto Profil', value: cur.photo ? 'Custom URL ✅' : 'Otomatis dari PP WA Owner' }
                ],
                footer:
                    `Penggunaan:\n` +
                    `• ${usedPrefix}setblog slogan <teks>\n` +
                    `• ${usedPrefix}setblog ig <username>\n` +
                    `• ${usedPrefix}setblog email <alamat@email.com>\n` +
                    `• ${usedPrefix}setblog wa <628xxx>\n` +
                    `• ${usedPrefix}setblog foto <url / reply gambar>\n` +
                    `• ${usedPrefix}setblog reset`
            }));
        }

        if (sub === 'reset') {
            botCtx.setSection('owner_blog', {}, Dinz);
            return Reply('✅ Pengaturan Blog HTML Owner berhasil direset ke bawaan.');
        }

        if (sub === 'slogan' || sub === 'bio') {
            if (!val) return Reply(`❌ Contoh: \`${usedPrefix}setblog slogan Fullstack Bot Developer & Digital Creator\``);
            cur.slogan = val.slice(0, 160);
            botCtx.setSection('owner_blog', cur, Dinz);
            return Reply(`✅ Slogan Owner diperbarui:\n> ◦ *${cur.slogan}*`);
        }

        if (sub === 'ig' || sub === 'instagram') {
            if (!val) return Reply(`❌ Contoh: \`${usedPrefix}setblog ig dinzid\``);
            cur.ig = val.replace(/^@/, '').trim();
            botCtx.setSection('owner_blog', cur, Dinz);
            return Reply(`✅ Instagram Owner diatur ke: *@${cur.ig}*`);
        }

        if (sub === 'email' || sub === 'mail') {
            if (!val || !val.includes('@')) return Reply(`❌ Contoh: \`${usedPrefix}setblog email owner@domain.com\``);
            cur.email = val.trim();
            botCtx.setSection('owner_blog', cur, Dinz);
            return Reply(`✅ Email Owner diatur ke: *${cur.email}*`);
        }

        if (sub === 'wa' || sub === 'whatsapp') {
            const digits = val.replace(/[^0-9]/g, '');
            if (!digits || digits.length < 8) return Reply(`❌ Contoh: \`${usedPrefix}setblog wa 628990936282\``);
            cur.wa = digits.startsWith('0') ? '62' + digits.slice(1) : digits;
            botCtx.setSection('owner_blog', cur, Dinz);
            return Reply(`✅ Nomor WhatsApp kontak diatur ke: *+${cur.wa}*`);
        }

        if (sub === 'foto' || sub === 'photo' || sub === 'pp') {
            let url = val;
            if (!url && /image/i.test(mime)) {
                const buf = typeof qmsg?.download === 'function' ? await qmsg.download() : await Dinz.downloadMediaMessage(quoted || m);
                if (buf && buf.length && typeof uploadToCDN === 'function') {
                    url = await uploadToCDN(buf, 'owner_pp.jpg');
                }
            }
            if (!url || !/^https?:\/\//i.test(url)) {
                return Reply(`❌ Kirim URL gambar atau reply foto dengan \`${usedPrefix}setblog foto\``);
            }
            cur.photo = url;
            botCtx.setSection('owner_blog', cur, Dinz);
            return Reply('✅ Foto profil Blog HTML Owner berhasil diperbarui!');
        }

        return Reply(`❌ Opsi \`${sub}\` tidak dikenali. Ketik \`${usedPrefix}setblog\` untuk melihat panduan.`);
    }
};
