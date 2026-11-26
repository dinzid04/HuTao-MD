const amEngine = require('../../services/am-engine');
const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'amprem',
    category: 'am',
    commands: ['amprem', 'amverify'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, isPrem, Reply, getSenderNumber, amRoles, usedPrefix } = ctx;

        const senderNum = getSenderNumber(m);
        const access = amEngine.checkAmAccess({ Dinz, feature: 'amprem', senderNum, isCreator, isPrem, amRoles });
        if (!access.allowed) return Reply(access.reason);

        const raw = String(text || '').trim();
        if (!raw) {
            return Reply(formatCard({
                icon: '🎞️',
                title: 'ALIGHT MOTION PREMIUM',
                body:
                    `• \`${usedPrefix}amprem auto\` — buat email otomatis via generator.email, tunggu link verifikasi, dan verifikasi otomatis!\n` +
                    `• \`${usedPrefix}amprem email@domain.com\` — kirim link verifikasi ke email kamu sendiri (lalu balas link login di chat ini).`,
                footer: `Akses: ${access.role.toUpperCase()} • API: am.gadingkencana04.workers.dev`
            }));
        }

        if (raw.toLowerCase() === 'auto' || raw.toLowerCase() === 'temp') {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            await Reply('⏳ *Memproses AM Auto...*\n> ◦ 1. Scrape email sementara (`generator.email`)\n> ◦ 2. Mengirim link verifikasi Alight Motion\n> ◦ 3. Menunggu inbox & verifikasi otomatis (±10–45 detik)...');

            try {
                const res = await amEngine.createSingleAutoAmAccount();
                if (res.ok) {
                    if (access.role === 'reseller') amRoles.useQuota(senderNum);
                    await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                    return Reply(formatCard({
                        icon: '✅',
                        title: 'AM PREMIUM AUTO BERHASIL',
                        rows: [
                            { label: 'Email', value: res.email },
                            { label: 'Status', value: String(res.status || 'Verified') },
                            { label: 'Info', value: String(res.message || 'Sukses') },
                            { label: 'URL Inbox Mail', value: res.inbox_url }
                        ],
                        footer: 'Buka URL Inbox Mail untuk login ulang kapan saja.'
                    }));
                }
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(
                    `\`⌜ AM Auto Gagal ❌ ⌟\`\n` +
                    `> ◦ *Email :* ${res.email || '-'}\n` +
                    `> ◦ *Inbox :* ${res.inbox_url || '-'}\n` +
                    `> ◦ *Alasan :* ${res.reason}`
                );
            } catch (err) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Gagal memproses AM Auto: ${err.message}`);
            }
        }

        if (!raw.includes('@')) {
            return Reply(`❌ Format salah. Gunakan \`${usedPrefix}${command} email@gmail.com\` atau \`${usedPrefix}${command} auto\`.`);
        }

        const email = raw.split(/\s+/)[0];
        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        try {
            const sendRes = await amEngine.sendAmVerification(email);
            if (sendRes.ok) {
                if (access.role === 'reseller') amRoles.useQuota(senderNum);
                global._amVerifState = global._amVerifState || {};
                global._amVerifState[senderNum] = {
                    step: 'wait_link',
                    email,
                    lastMsgId: m.key.id,
                    at: Date.now()
                };
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(
                    `\`⌜ AM Verification Terkirim ✅ ⌟\`\n` +
                    `> ◦ *Email :* ${email}\n` +
                    `> ◦ *Status :* ${sendRes.message}\n` +
                    `> ◦ *Akses :* ${access.role}\n\n` +
                    `📝 *Langkah selanjutnya:*\n` +
                    `Cek kotak masuk email kamu, salin *link login/verifikasi Alight Motion*, lalu kirim langsung ke chat ini!`
                );
            }
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal mengirim verifikasi ke *${email}*: ${sendRes.message}`);
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Error API AM: ${err.message}`);
        }
    }
};
