const qrisStore = require('../../services/qris-store');

module.exports = {
    name: 'proses',
    category: 'store',
    commands: ['proses', 'order', 'buatorder'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, moment, botCtx, usedPrefix } = ctx;

        const isGroupAdmin = m.isGroup ? Boolean(m.isAdmin) : false;
        if (!isCreator && !isGroupAdmin) return Reply(global.mess.admin);

        const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';
        const buyerJid = m.quoted?.sender || (Array.isArray(m.mentionedJid) && m.mentionedJid[0]) || m.sender;
        const buyerTag = String(buyerJid || '').split('@')[0].split(':')[0];
        const buyerName = m.quoted?.pushName || `@${buyerTag}`;

        let item = 'Pesanan';
        let price = 0;
        let note = '';

        if (text && text.trim()) {
            const parts = text.split('|').map((s) => s.trim());
            item = parts[0] || 'Pesanan';
            if (parts[1]) {
                const parsed = qrisStore.parseRupiah(parts[1]);
                if (Number.isFinite(parsed) && parsed >= 0) price = parsed;
            }
            if (parts[2]) note = parts.slice(2).join(' | ');
        }

        const order = qrisStore.createOrder(Dinz, {
            chatId: m.chat,
            buyerJid,
            buyerName,
            sellerJid: m.sender,
            item,
            price,
            status: 'pending',
            note
        });

        const identity = botCtx.getBotIdentity(Dinz);
        const timeStr = moment(order.createdAt).tz(tz).format('DD/MM/YYYY HH:mm [WIB]');
        const caption =
            `\`⌜ TRANSAKSI DIPROSES ⏳ ⌟\`\n` +
            `> ◦ *Invoice :* \`${order.id}\`\n` +
            `> ◦ *Pembeli :* @${buyerTag}\n` +
            `> ◦ *Produk :* ${order.item}\n` +
            (order.price > 0 ? `> ◦ *Total :* *${qrisStore.formatRupiah(order.price)}*\n` : '') +
            (order.note ? `> ◦ *Catatan :* ${order.note}\n` : '') +
            `> ◦ *Waktu :* ${timeStr}\n` +
            `> ◦ *Status :* *PENDING (Diproses)*\n\n` +
            `💡 Selesaikan pesanan: \`${usedPrefix}done ${order.id}\` | Batalkan: \`${usedPrefix}batal ${order.id}\``;

        const notaBuf = await qrisStore.renderNotaImage({ order, botname: identity.botname || global.botname });
        if (notaBuf) {
            await Dinz.sendMessage(m.chat, {
                image: notaBuf,
                caption,
                contextInfo: { mentionedJid: [buyerJid] }
            }, { quoted: m });
        } else {
            await Reply(caption, [buyerJid]);
        }
        return true;
    }
};
