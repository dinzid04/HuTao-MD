const { formatCard, loadScraper } = require('./_helper');

module.exports = {
    name: 'tempmail',
    category: 'extras',
    commands: ['tempmail', 'buatmail'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, database, usedPrefix } = ctx;
        const pref = usedPrefix || '';

        await Dinz.sendMessage(m.chat, { react: { text: '📧', key: m.key } }).catch(() => {});
        try {
            const tm = await loadScraper('tempmail.mjs');
            const mb = await tm.createMailbox();
            if (!mb?.mailbox || !mb?.token) return Reply('❌ Gagal membuat email sementara.');

            if (!global.db.users[m.sender]) global.db.users[m.sender] = {};
            global.db.users[m.sender].tempmail = {
                address: mb.mailbox,
                token: mb.token,
                createdAt: Date.now()
            };
            database.write(global.db).catch(() => {});

            const caption = formatCard({
                icon: '📧',
                title: 'TEMP MAIL DIBUAT',
                rows: [
                    { label: 'Email', value: `\`${mb.mailbox}\`` },
                    { label: 'Status', value: '🟢 Aktif & tersimpan di akunmu' }
                ],
                body:
                    `📌 *Cara Cek Pesan Masuk:*\n` +
                    `• Ketik \`${pref}cekmail\` untuk melihat kotak masuk\n` +
                    `• Ketik \`${pref}bacamail <nomor>\` untuk membaca isi email`,
                footer: 'Email sementara cocok untuk verifikasi OTP / uji coba'
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ Gagal membuat TempMail: ${e.message}`);
        }
        return true;
    }
};
