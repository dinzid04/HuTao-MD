module.exports = {
    name: 'pay',
    category: 'store',
    commands: ['pay', 'payment'],

    async execute(ctx) {
        const { Dinz, m, quoted, Reply, fs, path, botCtx } = ctx;

        const identity = botCtx.getBotIdentity(Dinz);
        const qrisUrl = identity.payment?.qris || identity.image?.qris || global.payment?.qris || global.image?.qris || `https://db.lamora.my.id/uploads/logo_file-1790541121093.jpg`;
        const dana = identity.payment?.dana || identity.owner;
        const gopay = identity.payment?.gopay || identity.owner;
        const an = identity.payment?.an || identity.namaOwner;

        const captionText = `\`⌜ Payment Method ⌟\`\n> ◦ *QRIS :* All Payment (Scan QR di atas)\n> ◦ *Dana :* ${dana}\n> ◦ *GoPay :* ${gopay}\n> ◦ *A/N :* ${an}\n\n> ◦ *Catatan :*\n> 1. Scan QRIS di atas atau transfer ke nomor e-wallet yang tertera.\n> 2. Sertakan bukti transfer / screenshot setelah melakukan pembayaran.`;

        try {
            const httpsPay = require('https');
            const axiosPay = require('axios');
            let qrisBuf = null;

            const localQrisDir = botCtx.getAudioMenuDir(Dinz);
            const localQrisFile = path.join(localQrisDir, 'qris.jpg');
            if (fs.existsSync(localQrisFile)) {
                try { qrisBuf = fs.readFileSync(localQrisFile); } catch (e) {}
            }
            if (!qrisBuf && localQrisDir !== path.join(process.cwd(), 'assets', 'media')) {
                const fallbackQris = path.join(process.cwd(), 'source', 'media', 'qris.jpg');
                if (fs.existsSync(fallbackQris)) {
                    try { qrisBuf = fs.readFileSync(fallbackQris); } catch (e) {}
                }
            }

            if (!qrisBuf) {
                try {
                    const resPay = await axiosPay.get(qrisUrl, {
                        responseType: 'arraybuffer',
                        timeout: 20000,
                        httpsAgent: new httpsPay.Agent({ rejectUnauthorized: false }),
                        validateStatus: () => true
                    });
                    if (resPay.status === 200 && resPay.data && resPay.data.length) {
                        qrisBuf = Buffer.from(resPay.data);
                    }
                } catch (ePay) {}
            }
            if (qrisBuf) {
                await Dinz.sendMessage(m.chat, {
                    image: qrisBuf,
                    caption: captionText
                }, { quoted: m });
            } else {
                await Dinz.sendMessage(m.chat, {
                    image: { url: qrisUrl },
                    caption: captionText
                }, { quoted: m });
            }
        } catch (err) {
            console.error("Gagal mengirim gambar payment:", err);
            await Reply(captionText);
        }
        return true;
    }
};
