const qrisStore = require('../../services/qris-store');

module.exports = {
    name: 'batal',
    category: 'store',
    commands: ['batal', 'cancelorder'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply } = ctx;

        const isGroupAdmin = m.isGroup ? Boolean(m.isAdmin) : false;
        if (!isCreator && !isGroupAdmin) return Reply(global.mess.admin);

        const raw = String(text || '').trim();
        const quotedBuyer = m.quoted?.sender || (Array.isArray(m.mentionedJid) && m.mentionedJid[0]) || '';
        const found = qrisStore.findOrder(Dinz, {
            id: /^INV-\d{8}-\d+$/i.test(raw) ? raw : '',
            buyerJid: quotedBuyer,
            chatId: m.chat,
            onlyPending: true
        });

        if (!found.order) {
            return Reply('❌ Tidak ada transaksi *pending* yang cocok untuk dibatalkan.');
        }

        const updated = qrisStore.updateOrderStatus(Dinz, found.order.id, 'cancelled');
        const buyerTag = String(updated.buyerJid || '').split('@')[0].split(':')[0];
        const mentions = updated.buyerJid ? [updated.buyerJid] : [];

        return Reply(
            `\`⌜ TRANSAKSI DIBATALKAN ❌ ⌟\`\n` +
            `> ◦ *Invoice :* \`${updated.id}\`\n` +
            `> ◦ *Pembeli :* @${buyerTag}\n` +
            `> ◦ *Produk :* ${updated.item}\n` +
            (updated.price > 0 ? `> ◦ *Nominal :* ${qrisStore.formatRupiah(updated.price)}\n` : '') +
            `> ◦ *Status :* *CANCELLED*`,
            mentions
        );
    }
};
