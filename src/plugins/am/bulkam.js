const amEngine = require('../../services/am-engine');

module.exports = {
    name: 'bulkam',
    category: 'am',
    commands: ['bulkam', 'bulk-am'],

    async execute(ctx) {
        const { Dinz, m, command, args, isCreator, isPrem, Reply, getSenderNumber, amRoles, usedPrefix } = ctx;

        const senderNum = getSenderNumber(m);
        const access = amEngine.checkAmAccess({ Dinz, feature: 'bulkam', senderNum, isCreator, isPrem, amRoles });
        if (!access.allowed) return Reply(access.reason);

        const qty = parseInt((args[0] || '').trim(), 10);
        if (isNaN(qty) || qty < 1 || qty > 50) {
            return Reply(
                `\`⌜ AM Bulk Auto (generator.email) ⌟\`\n` +
                `> ◦ *Format :* ${usedPrefix}${command} <1-50>\n` +
                `> ◦ *Contoh :* ${usedPrefix}${command} 5\n` +
                `> ◦ *Alur Otomatis :* Scrape email \`generator.email\` → kirim link AM → tunggu & verifikasi otomatis → kirim file \`.txt\` lengkap dengan URL inbox!`
            );
        }

        if (access.role === 'reseller') {
            amRoles.useQuota(senderNum);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        const job = amEngine.startBulkAmJob({
            Dinz,
            chatId: m.chat,
            quoted: m,
            qty,
            requestedBy: senderNum
        });

        return Reply(
            `\`⌜ AM Bulk Auto Berjalan ⏳ ⌟\`\n` +
            `> ◦ *Job ID :* \`${job.id}\`\n` +
            `> ◦ *Jumlah :* ${qty} akun\n` +
            `> ◦ *Engine :* generator.email + am.gadingkencana04.workers.dev\n` +
            `> ◦ *Akses :* ${access.role}\n\n` +
            `📝 Cek progres: \`${usedPrefix}statusbulkam ${job.id}\`\n` +
            `📎 Setelah selesai, hasil lengkap (email, status, & URL inbox mail) otomatis dikirim sebagai file \`.txt\`.`
        );
    }
};
