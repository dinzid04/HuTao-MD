module.exports = {
    name: 'getsc',
    category: 'owner',
    commands: ['getsc'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, isMainOwner, Reply, fs, path, exec } = ctx;

        if (Dinz.isJadibot || !isMainOwner) return Reply('🔒 Fitur ini tidak tersedia untuk jadibot');
        if (!isCreator) return Reply(global.mess.owner);

        if (!text) {
            return Reply(`\`⌜ Get SC ⌟\`\n> ◦ *Format:* getsc <link_grup>\n> ◦ *Contoh:* getsc https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv`);
        }

        let inviteCode = '';
        if (text.includes('chat.whatsapp.com/')) {
            inviteCode = text.split('chat.whatsapp.com/')[1].split(/[\s?]+/)[0].trim();
        } else if (/^[0-9A-Za-z_-]{20,24}$/.test(text.trim())) {
            inviteCode = text.trim();
        } else {
            return Reply(`❌ Link grup WhatsApp tidak valid!\n> ◦ *Contoh:* getsc https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        let targetGroupId = '';
        let groupSubject = 'Grup WhatsApp';

        try {
            try {
                const res = await Dinz.groupAcceptInvite(inviteCode);
                targetGroupId = res ? (res.includes('@g.us') ? res : `${res}@g.us`) : '';
            } catch (e) {
                const meta = await Dinz.groupGetInviteInfo(inviteCode);
                if (meta && meta.id) {
                    targetGroupId = meta.id.includes('@g.us') ? meta.id : `${meta.id}@g.us`;
                    groupSubject = meta.subject || groupSubject;
                }
            }

            if (!targetGroupId) {
                const meta = await Dinz.groupGetInviteInfo(inviteCode);
                if (meta && meta.id) {
                    targetGroupId = meta.id.includes('@g.us') ? meta.id : `${meta.id}@g.us`;
                    groupSubject = meta.subject || groupSubject;
                }
            }

            try {
                const gMeta = await Dinz.groupMetadata(targetGroupId);
                if (gMeta && gMeta.subject) groupSubject = gMeta.subject;
            } catch (_) {}
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`\`⌜ Get SC Error ⌟\`\n> ◦ Status : *Gagal*\n> ◦ Info : *Link grup tidak valid atau bot gagal mengakses/bergabung ke grup.*`);
        }

        if (!targetGroupId) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`\`⌜ Get SC Error ⌟\`\n> ◦ Status : *Gagal*\n> ◦ Info : *Gagal mendapatkan ID grup dari tautan tersebut.*`);
        }

        const botCleanName = (global.botname || 'HuTao_MD').replace(/[^a-zA-Z0-9]/g, '_');
        const zipFileName = `SC_${botCleanName}_${Date.now()}.zip`;
        const zipFilePath = path.join(process.cwd(), zipFileName);

        const zipExcludes = [
            'node_modules/*', '*/node_modules/*',
            '.git/*', '.npm/*', '.cache/*', '.config/*', '.local/*',
            '.env', '.env.*',
            'session/*', 'jadibot-session/*', 'bin/*', 'tmp/*',
            'data/*',
            '*.zip', '*.tar.gz', '*.bak', '*.log'
        ].map((p) => `"${p}"`).join(' ');
        const zipCommand = `zip -r -9 "${zipFilePath}" . -x ${zipExcludes}`;
        exec(zipCommand, { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }, async (err, stdout, stderr) => {
            if (err || !fs.existsSync(zipFilePath)) {
                console.error('getsc error:', err || stderr);
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`\`⌜ Get SC Error ⌟\`\n> ◦ Status : *Gagal*\n> ◦ Info : *Gagal mengompres script: ${err?.message || stderr}*`);
            }

            try {
                const zipBuffer = fs.readFileSync(zipFilePath);
                const fileSizeMb = (zipBuffer.length / (1024 * 1024)).toFixed(2);

                const captionDoc = `\`⌜ Source Code Bot ⌟\`\n> ◦ Nama Bot : *${global.botname}*\n> ◦ Versi : *${global.versi || '1.0.0'}*\n> ◦ Ukuran : *${fileSizeMb} MB*\n> ◦ Grup Tujuan : *${groupSubject}*\n> ◦ Request by : *@${m.sender.split('@')[0]}*`;

                await Dinz.sendMessage(targetGroupId, {
                    document: zipBuffer,
                    mimetype: 'application/zip',
                    fileName: zipFileName,
                    caption: captionDoc,
                    mentions: [m.sender]
                });

                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

                if (m.chat !== targetGroupId) {
                    await Reply(`\`⌜ Get SC Success ⌟\`\n> ◦ Status : *Sukses*\n> ◦ Target Grup : *${groupSubject}*\n> ◦ Ukuran : *${fileSizeMb} MB*\n> ◦ Info : *Full Source Code telah berhasil dikirim ke grup tujuan.*`);
                }
            } catch (sendErr) {
                console.error('getsc send error:', sendErr);
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                await Reply(`❌ Gagal mengirim file SC ke grup tujuan: ${sendErr.message}`);
            } finally {
                if (fs.existsSync(zipFilePath)) {
                    fs.unlinkSync(zipFilePath);
                }
            }
        });
        return true;
    }
};
