const qrisStore = require('../../services/qris-store');

module.exports = {
    name: 'done',
    category: 'store',
    commands: ['done', 'selesai', 'lunas'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, moment, botCtx } = ctx;

        const isGroupAdmin = m.isGroup ? Boolean(m.isAdmin) : false;
        if (!isCreator && !isGroupAdmin) return Reply(global.mess.admin);

        const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';
        const raw = String(text || '').trim();
        const quotedBuyer = m.quoted?.sender || (Array.isArray(m.mentionedJid) && m.mentionedJid[0]) || '';

        let order = null;
        if (/^INV-\d{8}-\d+$/i.test(raw)) {
            const found = qrisStore.findOrder(Dinz, { id: raw, onlyPending: true });
            if (!found.order) return Reply(`❌ Invoice \`${raw.toUpperCase()}\` tidak ditemukan atau sudah selesai.`);
            order = qrisStore.updateOrderStatus(Dinz, found.order.id, 'done');
        } else if (!raw) {
            const found = qrisStore.findOrder(Dinz, { buyerJid: quotedBuyer, chatId: m.chat, onlyPending: true });
            if (found.order) {
                order = qrisStore.updateOrderStatus(Dinz, found.order.id, 'done');
            } else {
                const buyerJid = quotedBuyer || m.sender;
                const buyerTag = String(buyerJid).split('@')[0].split(':')[0];
                order = qrisStore.createOrder(Dinz, {
                    chatId: m.chat,
                    buyerJid,
                    buyerName: m.quoted?.pushName || `@${buyerTag}`,
                    sellerJid: m.sender,
                    item: 'Transaksi Store',
                    price: 0,
                    status: 'done'
                });
            }
        } else {
            const parts = raw.split('|').map((s) => s.trim());
            const item = parts[0] || 'Transaksi Store';
            const price = parts[1] ? (qrisStore.parseRupiah(parts[1]) || 0) : 0;
            const note = parts[2] ? parts.slice(2).join(' | ') : '';
            const buyerJid = quotedBuyer || m.sender;
            const buyerTag = String(buyerJid).split('@')[0].split(':')[0];
            order = qrisStore.createOrder(Dinz, {
                chatId: m.chat,
                buyerJid,
                buyerName: m.quoted?.pushName || `@${buyerTag}`,
                sellerJid: m.sender,
                item,
                price: Number.isFinite(price) ? price : 0,
                status: 'done',
                note
            });
        }

        const buyerTag = String(order.buyerJid || m.sender).split('@')[0].split(':')[0];
        const identity = botCtx.getBotIdentity(Dinz);
        const timeStr = moment(order.completedAt || order.updatedAt).tz(tz).format('DD/MM/YYYY HH:mm [WIB]');
        const caption =
            `\`⌜ TRANSAKSI SELESAI ✅ ⌟\`\n` +
            `> ◦ *Invoice :* \`${order.id}\`\n` +
            `> ◦ *Pembeli :* @${buyerTag}\n` +
            `> ◦ *Produk :* ${order.item}\n` +
            (order.price > 0 ? `> ◦ *Total :* *${qrisStore.formatRupiah(order.price)}*\n` : '') +
            (order.note ? `> ◦ *Catatan :* ${order.note}\n` : '') +
            `> ◦ *Waktu :* ${timeStr}\n` +
            `> ◦ *Status :* *DONE (Lunas)*\n\n` +
            `🙏 Terima kasih sudah order di *${identity.botname || global.botname}*!`;

        const notaBuf = await qrisStore.renderNotaImage({ order, botname: identity.botname || global.botname });
        const mentions = order.buyerJid ? [order.buyerJid] : [];
        if (notaBuf) {
            await Dinz.sendMessage(m.chat, {
                image: notaBuf,
                caption,
                contextInfo: mentions.length ? { mentionedJid: mentions } : undefined
            }, { quoted: m });
        } else {
            await Reply(caption, mentions);
        }
        return true;
    }
};
