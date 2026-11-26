const { trimText, formatCard, loadScraper } = require('./_helper');

module.exports = {
    name: 'bacamail',
    category: 'extras',
    commands: ['bacamail'],

    async execute(ctx) {
        const { Dinz, m, args, text, body, Reply, example, usedPrefix } = ctx;
        const pref = usedPrefix || '';

        const session = global.db.users?.[m.sender]?.tempmail;
        if (!session?.token) {
            return Reply(`❌ Kamu belum punya email sementara. Ketik \`${pref}tempmail\` dulu.`);
        }
        const numIdx = parseInt(args[0], 10) - 1;
        if (isNaN(numIdx) || numIdx < 0) return Reply(example('1'));

        await Dinz.sendMessage(m.chat, { react: { text: '📖', key: m.key } }).catch(() => {});
        try {
            const tm = await loadScraper('tempmail.mjs');
            let list = session.lastMessages;
            if (!Array.isArray(list) || !list[numIdx]) {
                const res = await tm.getMessages(session.token);
                const msgs = Array.isArray(res) ? res : (res?.messages || []);
                list = msgs.map((x) => ({ id: x._id || x.id, from: x.from, subject: x.subject }));
                session.lastMessages = list;
            }
            const chosen = list[numIdx];
            if (!chosen?.id) return Reply(`❌ Email nomor *${numIdx + 1}* tidak ditemukan.`);

            const detail = await tm.getMessage(session.token, chosen.id);
            const rawBody = detail?.bodyText || detail?.text || (detail?.bodyHtml ? String(detail.bodyHtml).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : '-');

            const caption = formatCard({
                icon: '📩',
                title: 'ISI EMAIL',
                rows: [
                    { label: 'Dari', value: `\`${detail?.from || chosen.from || '-'}\`` },
                    { label: 'Subjek', value: `*${detail?.subject || chosen.subject || '-'}*` }
                ],
                body: trimText(rawBody, 2800),
                footer: `Mailbox: ${session.address}`
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ Gagal membaca email: ${e.message}`);
        }
        return true;
    }
};
