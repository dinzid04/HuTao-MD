module.exports = {
    name: 'volume',
    category: 'tools',
    commands: ['volume', 'vol', 'volumeboost', 'boostvol'],

    async execute(ctx) {
        const {
            Dinz, m, command, text, quoted, mime, qmsg, isCreator, Reply, fs, path, checkLimit,
            addLimit
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const isAudio = /audio/i.test(mime) || m.type === 'audioMessage' || (m.quoted && m.quoted.type === 'audioMessage');
        const isVideo = /video/i.test(mime) || m.type === 'videoMessage' || (m.quoted && m.quoted.type === 'videoMessage');

        if (!isAudio && !isVideo) {
            return Reply(`\`⌜ Volume ⌟\`\n> ◦ *Format :* reply audio/video dengan caption ${command} 100% dst`);
        }

        let volPercent = 200;
        if (text && text.trim().length > 0) {
            const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(parsed)) {
                volPercent = Math.min(500, Math.max(100, parsed));
            }
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            let mediaBuffer = null;
            if (typeof qmsg.download === 'function') {
                mediaBuffer = await qmsg.download();
            } else if (typeof quoted.download === 'function') {
                mediaBuffer = await quoted.download();
            } else if (typeof m.download === 'function') {
                mediaBuffer = await m.download();
            } else {
                mediaBuffer = await Dinz.downloadMediaMessage(quoted || m);
            }

            if (!mediaBuffer || mediaBuffer.length === 0) {
                throw new Error("Gagal mengunduh media dari pesan.");
            }

            const volFactor = (volPercent / 100).toFixed(2);
            const tmpDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
            const fileId = Date.now();
            const { execSync } = require('child_process');

            if (isVideo) {
                const tmpIn = path.join(tmpDir, `vol_in_${fileId}.mp4`);
                const tmpOut = path.join(tmpDir, `vol_out_${fileId}.mp4`);
                fs.writeFileSync(tmpIn, mediaBuffer);
                execSync(`ffmpeg -y -i "${tmpIn}" -c:v copy -filter:a "volume=${volFactor}" -c:a aac -b:a 128k -movflags +faststart "${tmpOut}"`);
                const boostedBuf = fs.readFileSync(tmpOut);
                await Dinz.sendMessage(m.chat, {
                    video: boostedBuf,
                    caption: `\`⌜ Volume Boosted ⌟\`\n> ◦ *Tingkat Volume :* ${volPercent}%\n> ◦ *Tipe :* Video`,
                    mimetype: 'video/mp4'
                }, { quoted: m });
                try { fs.unlinkSync(tmpIn); } catch(e) {}
                try { fs.unlinkSync(tmpOut); } catch(e) {}
            } else {
                const tmpIn = path.join(tmpDir, `vol_in_${fileId}.mp3`);
                const tmpOut = path.join(tmpDir, `vol_out_${fileId}.mp3`);
                fs.writeFileSync(tmpIn, mediaBuffer);
                execSync(`ffmpeg -y -i "${tmpIn}" -filter:a "volume=${volFactor}" -c:a libmp3lame -b:a 128k "${tmpOut}"`);
                const boostedBuf = fs.readFileSync(tmpOut);
                const isPtt = Boolean(qmsg.ptt || (quoted.msg && quoted.msg.ptt));
                await Dinz.sendMessage(m.chat, {
                    audio: boostedBuf,
                    mimetype: 'audio/mp4',
                    ptt: isPtt
                }, { quoted: m });
                try { fs.unlinkSync(tmpIn); } catch(e) {}
                try { fs.unlinkSync(tmpOut); } catch(e) {}
            }

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('Volume boost error:', err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal memperbesar volume: ${err.message}`);
        }
        return true;
    }
};
