const amEngine = require('../../services/am-engine');

module.exports = {
    name: 'statusbulkam',
    category: 'am',
    commands: ['statusbulkam', 'status-bulkam'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, isPrem, Reply, getSenderNumber, amRoles, usedPrefix } = ctx;

        const senderNum = getSenderNumber(m);
        const access = amEngine.checkAmAccess({ Dinz, feature: 'bulkam', senderNum, isCreator, isPrem, amRoles });
        if (!access.allowed) return Reply(access.reason);

        const jobId = String(text || '').trim();
        if (!jobId) {
            return Reply(`\`⌜ AM Bulk Status ⌟\`\n> ◦ *Format :* ${usedPrefix}${command} <jobId>`);
        }

        const job = amEngine.getBulkJob(jobId);
        if (!job) {
            return Reply(`❌ Job ID \`${jobId}\` tidak ditemukan (atau server baru saja restart).`);
        }

        const statusText = job.status === 'completed' ? '✅ Selesai' : '⏳ Sedang diproses';
        const summary =
            `\`⌜ AM Bulk Status ⌟\`\n` +
            `> ◦ *Job ID :* \`${job.id}\`\n` +
            `> ◦ *Status :* ${statusText}\n` +
            `> ◦ *Progress :* ${job.processed}/${job.total_requested}\n` +
            `> ◦ *Sukses :* ${job.total_success}\n` +
            `> ◦ *Gagal :* ${job.total_failed}`;

        if (job.status === 'completed') {
            const txt = amEngine.formatBulkJobTxt(job);
            await Dinz.sendMessage(m.chat, {
                document: Buffer.from(txt, 'utf8'),
                mimetype: 'text/plain',
                fileName: `am-bulk-${job.id}.txt`,
                caption: summary
            }, { quoted: m });
            return true;
        }

        return Reply(summary + `\n\n⏳ Cek lagi beberapa detik kemudian dengan \`${usedPrefix}${command} ${job.id}\``);
    }
};
