module.exports = {
    name: 'kick',
    category: 'group',
    commands: ['kick'],

    async execute(ctx) {
        const {
            Dinz, m, text, botNumber, isCreator, Reply, example, resolveTargetNumber,
            loadOwners
        } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isBotAdmin) return Reply(global.mess.botAdmin || "❌ Bot harus menjadi admin grup untuk menggunakan perintah ini.");

        let rawUser = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, '');
        if (!rawUser) return Reply(example("@mention / reply / nomor"));

        const targetNumber = resolveTargetNumber(rawUser, m);
        if (!targetNumber) return Reply(example("@mention / reply / nomor"));

        const botNumberOnly = botNumber.split(':')[0].replace(/[^0-9]/g, '');
        const ownerNumbers = [global.owner, ...(loadOwners() || [])].map(v => String(v).replace(/[^0-9]/g, ''));
        if (targetNumber === botNumberOnly) return Reply("❌ Bot tidak bisa mengeluarkan dirinya sendiri.");
        if (ownerNumbers.includes(targetNumber)) return Reply("❌ Izin ditolak! Tidak diperbolehkan mengeluarkan owner.");

        const userJid = targetNumber + '@s.whatsapp.net';
        try {
            await Dinz.groupParticipantsUpdate(m.chat, [userJid], 'remove');
            Reply(`\`⌜ Member Kicked ⌟\`\n> ◦ Target : *@${targetNumber}*\n> ◦ Status : *Berhasil Dikeluarkan*`, [userJid]);
        } catch (e) {
            Reply("❌ Gagal mengeluarkan anggota. Pastikan bot memiliki hak admin yang cukup.");
        }
        return true;
    }
};
