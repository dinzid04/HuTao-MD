const qrisStore = require('../../services/qris-store');

module.exports = {
    name: 'qris',
    category: 'store',
    commands: ['qris', 'qrisdinamis', 'bayarqris'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, axios, botCtx, usedPrefix } = ctx;

        const cfg = qrisStore.getQrisConfig(Dinz);
        if (!cfg.payload) {
            return Reply(
                `❌ Kode QRIS statis belum dipasang.\n` +
                `> ◦ Owner dapat reply gambar QRIS lalu ketik \`${usedPrefix}setqriscode\` atau paste kode QRIS-nya.`
            );
        }

        if (!text || !text.trim()) {
            return Reply(
                `\`⌜ QRIS Dinamis Otomatis ⌟\`\n` +
                `> ◦ *Format :* ${usedPrefix}qris <nominal> | <catatan opsional>\n` +
                `> ◦ *Contoh 1 :* ${usedPrefix}qris 25000\n` +
                `> ◦ *Contoh 2 :* ${usedPrefix}qris 15k | Panel 5GB`
            );
        }

        const [rawAmount, ...noteParts] = text.split('|');
        const amount = qrisStore.parseRupiah(rawAmount);
        const note = noteParts.join('|').trim();

        if (!Number.isFinite(amount) || amount < 100) {
            return Reply(`❌ Nominal tidak valid (minimal Rp 100).\n> ◦ Contoh: \`${usedPrefix}qris 25000\` atau \`${usedPrefix}qris 15k\``);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        try {
            const dyn = qrisStore.convertStaticToDynamicQris(cfg.payload, amount, {
                feeType: cfg.feeType,
                feeValue: cfg.feeValue
            });
            const qrBuf = await qrisStore.fetchQrImageBuffer(axios, dyn.payload);
            const identity = botCtx.getBotIdentity(Dinz);
            const cardBuf = await qrisStore.renderDynamicQrisCard({
                qrBuffer: qrBuf,
                merchantName: dyn.merchantName,
                merchantCity: dyn.merchantCity,
                amount: dyn.amount,
                feeAmount: dyn.feeAmount,
                total: dyn.total,
                note,
                botname: identity.botname || global.botname
            });

            const caption =
                `\`⌜ QRIS Dinamis Siap Scan ⌟\`\n` +
                `> ◦ *Merchant :* ${dyn.merchantName}\n` +
                `> ◦ *Nominal :* ${qrisStore.formatRupiah(dyn.amount)}\n` +
                (dyn.feeAmount > 0 ? `> ◦ *Biaya Admin :* ${qrisStore.formatRupiah(dyn.feeAmount)}\n` : '') +
                `> ◦ *Total Bayar :* *${qrisStore.formatRupiah(dyn.total)}*\n` +
                (note ? `> ◦ *Catatan :* ${note}\n` : '') +
                `\n💡 Nominal otomatis terkunci saat discan. Kirim bukti transfer setelah selesai membayar.`;

            await Dinz.sendMessage(m.chat, { image: cardBuf, caption }, { quoted: m });
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal membuat QRIS dinamis: ${err.message}`);
        }
        return true;
    }
};
