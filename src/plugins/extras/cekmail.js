const { trimText, formatCard, loadScraper } = require('./_helper');

module.exports = {
    name: 'cekmail',
    category: 'extras',
    commands: ['cekmail', 'inboxmail'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, usedPrefix } = ctx;
        const pref = usedPrefix || '';

        const session = global.db.users?.[m.sender]?.tempmail;
        if (!session?.token) {
            return Reply(`❌ Kamu belum punya email sementara.\n> Ketik \`${pref}tempmail\` untuk membuat email baru.`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '📬', key: m.key } }).catch(() => {});
        try {
            const tm = await loadScraper('tempmail.mjs');
            const res = await tm.getMessages(session.token);
            const msgs = Array.isArray(res) ? res : (res?.messages || []);

            if (msgs.length === 0) {
                return Reply(
                    formatCard({
                        icon: '📭',
                        title: 'INBOX TEMP MAIL',
                        rows: [
                            { label: 'Email', value: `\`${session.address}\`` },
                            { label: 'Pesan Masuk', value: '0 (Belum ada email masuk)' }
                        ],
                        footer: `Tunggu beberapa detik lalu ketik ${pref}cekmail lagi`
                    })
                );
            }

            session.lastMessages = msgs.map((x) => ({
                id: x._id || x.id,
                from: x.from,
                subject: x.subject
            }));

            const listBody = msgs.slice(0, 10).map((msg, idx) => (
                `*${idx + 1}.* *${msg.subject || '(Tanpa Subjek)'}*\n` +
                `   ↳ Dari: \`${msg.from || '-'}\`\n` +
                `   ↳ Preview: _${trimText(msg.bodyPreview || msg.text || '-', 80)}_`
            )).join('\n\n');

            const caption = formatCard({
                icon: '📬',
                title: 'INBOX TEMP MAIL',
                rows: [
                    { label: 'Email', value: `\`${session.address}\`` },
                    { label: 'Total Masuk', value: `${msgs.length} Email` }
                ],
                body: listBody,
                footer: `Ketik ${pref}bacamail 1 untuk membaca isi email nomor 1`
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ Gagal cek inbox TempMail: ${e.message}`);
        }
        return true;
    }
};
