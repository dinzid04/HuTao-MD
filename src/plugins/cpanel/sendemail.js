module.exports = {
    name: 'sendemail',
    category: 'cpanel',
    commands: ['sendemail', 'sendmail', 'kirimemail'],

    async execute(ctx) {
        const { text, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const parts = (text || '').split(',').map(s => s.trim());
        const toEmail = parts[0];
        const subject = parts[1] || `Notifikasi dari ${global.botname}`;
        const message = parts.slice(2).join(',') || 'Halo! Ini adalah pesan dari bot WhatsApp.';

        if (!toEmail || !toEmail.includes('@')) {
            return Reply(`*Format:* .sendemail email@domain.com,Subject,Isi Pesan\n*Contoh:* .sendemail user@gmail.com,Detail Server,Halo server Anda aktif`);
        }

        Reply(global.mess.wait);
        const { sendPanelEmail } = require('../../services/cpanel');
        const res = await sendPanelEmail({ to: toEmail, subject, text: message });
        if (res?.status) {
            return Reply(`\`⌜ Email Terkirim ⌟\`\n> ◦ Ke : *${toEmail}*\n> ◦ Subject : *${subject}*\n> ◦ Status : *Berhasil Terkirim*`);
        } else {
            return Reply(`❌ Gagal mengirim email: ${res?.message || 'Error API'}`);
        }
        return true;
    }
};
