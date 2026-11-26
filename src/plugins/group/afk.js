module.exports = {
    name: 'afk',
    category: 'group',
    commands: ['afk'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, moment, checkLimit, addLimit, setAfk } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const reason = text && text.trim().length > 0 ? text.trim() : 'Tanpa Alasan';
        setAfk(m.sender, reason);

        const timeStr = moment().tz('Asia/Jakarta').format('HH:mm:ss');
        addLimit(m.sender, isCreator);
        await Dinz.sendMessage(m.chat, { react: { text: '💤', key: m.key } }).catch(() => {});

        return Reply(
            `\`⌜ Mode AFK 💤 ⌟\`\n> ◦ *User :* @${m.sender.split('@')[0]}\n> ◦ *Alasan :* ${reason}\n> ◦ *Waktu :* ${timeStr} WIB\n\n> ◦ *Info :* Jangan tag dia sampai kembali! Status AFK otomatis mati saat mengirim pesan lagi.`,
            [m.sender]
        );
    }
};
