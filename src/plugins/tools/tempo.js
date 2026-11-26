module.exports = {
    name: 'tempo',
    category: 'tools',
    commands: ['tempo', 'speed', 'setspeed'],

    async execute(ctx) {
        const {
            Dinz, m, command, text, quoted, qmsg, isCreator, isPrem, Reply, fs, path,
            checkLimit, addLimit
        } = ctx;

        if (!isPrem && !isCreator) return Reply(global.mess.prem);
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const q = m.quoted ? m.quoted : m;
        const mimeType = (q.msg || q).mimetype || '';
        const isAudio = /audio/.test(mimeType) || q.type === 'audioMessage';

        const speed = parseFloat(text);
        if (isNaN(speed) || !text || !isAudio) {
            return Reply(`\`⌜ Tempo Audio ⌟\`\n> ◦ *Format :* reply audio dengan caption ${command} 0.8 / 1.5`);
        }

        if (speed < 0.5 || speed > 2.0) {
            return Reply("❌ Kecepatan harus antara 0.5 dan 2.0 untuk menjaga kualitas audio!");
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const tempDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const fileId = Date.now();
        const inputPath = path.join(tempDir, `tempo_in_${fileId}.mp3`);
        const outputPath = path.join(tempDir, `tempo_out_${fileId}.mp3`);

        try {
            let buffer = null;
            if (typeof q.download === 'function') {
                buffer = await q.download();
            } else if (typeof qmsg.download === 'function') {
                buffer = await qmsg.download();
            } else {
                buffer = await Dinz.downloadMediaMessage(q);
            }

            if (!buffer || buffer.length === 0) {
                throw new Error("Gagal mengambil file audio.");
            }

            fs.writeFileSync(inputPath, buffer);
            const { execSync } = require('child_process');
            execSync(`ffmpeg -y -i "${inputPath}" -filter:a "asetrate=48000*${speed},aresample=48000" -c:a libmp3lame -b:a 128k "${outputPath}"`);

            const isPtt = Boolean(q.msg?.ptt || (q.quoted && q.quoted.msg?.ptt));
            await Dinz.sendMessage(m.chat, {
                audio: fs.readFileSync(outputPath),
                mimetype: 'audio/mpeg',
                fileName: `tempo_${speed}x.mp3`,
                ptt: isPtt
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (error) {
            console.error('Tempo Error:', error);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal mengubah tempo audio: ${error.message}`);
        } finally {
            try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (e) {}
            try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
        }
        return true;
    }
};
